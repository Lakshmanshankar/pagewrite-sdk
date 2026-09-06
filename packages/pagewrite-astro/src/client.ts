import path from "node:path";
import { ensureDir, writeTextFile } from "./fs.js";
import type {
  FileDocument,
  PageTreeNode,
  RemoteMdxLogger,
  SitePages,
  StagedSiteContent,
  StaticTreeChild,
  SiteSchema,
} from "./types.js";
import { flattenFileNodes, generatePageMap, safeRelativePath, toSegment, toSlug } from "./utils.js";
import { buildMdxWithSchema } from "./frontmatter.js";

export const API_BASE_URL = "https://us-central1-sanity-freeform.cloudfunctions.net";
export const STATIC_FILE_TREE_ENDPOINT = `${API_BASE_URL}/getStaticFileTree`;
export const PAGINATED_FILE_DOCUMENTS_ENDPOINT = `${API_BASE_URL}/getPaginatedFileDocuments`;
export const SITE_SCHEMAS_ENDPOINT = `${API_BASE_URL}/getSiteSchemas`;
export const DEFAULT_PAGE_SIZE = 100;

export interface FetchSiteContentOptions {
  fetchImpl?: typeof fetch;
  logger?: Pick<RemoteMdxLogger, "info" | "warn" | "error">;
  pageSize?: number;
  timeoutMs?: number;
}

async function fetchJson<T>(
  url: string,
  token: string,
  body: Record<string, unknown>,
  errorPrefix: string,
  options: FetchSiteContentOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${errorPrefix}: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${errorPrefix}: request timed out after ${options.timeoutMs ?? 30_000}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchSiteSchemas(
  siteId: string,
  token: string,
  options: FetchSiteContentOptions = {}
): Promise<Map<string, SiteSchema>> {
  const responseData = await fetchJson<{ schemas?: SiteSchema[] }>(
    SITE_SCHEMAS_ENDPOINT,
    token,
    { siteId },
    "Failed to fetch site schemas",
    options
  );

  const schemas = new Map<string, SiteSchema>();
  for (const schema of responseData.schemas ?? []) {
    schemas.set(schema.id, schema);
  }
  return schemas;
}

export async function fetchStaticFileTree(
  siteId: string,
  token: string,
  options: FetchSiteContentOptions = {}
): Promise<SitePages> {
  const responseData = await fetchJson<{ root?: StaticTreeChild }>(
    STATIC_FILE_TREE_ENDPOINT,
    token,
    { siteId },
    "Failed to fetch static file tree",
    options
  );

  const root = responseData.root;
  if (!root || !root.isFolder) {
    throw new Error("Invalid file tree response: root folder is missing");
  }

  const walkFolder = (
    children: StaticTreeChild[],
    parentPath: string,
    parentFolderId?: string
  ): PageTreeNode[] =>
    children.map((child) => {
      const title =
        typeof child.title === "string" && child.title.trim().length > 0 ? child.title : child.id;
      const childPath = parentPath
        ? `${parentPath}/${toSegment(title, child.id)}`
        : toSegment(title, child.id);

      if (child.isFolder) {
        return {
          id: child.id,
          type: "folder" as const,
          title,
          path: childPath,
          databaseType: child.databaseType,
          lang: child.lang,
          schemaId: child.schemaId,
          children: walkFolder(child.children ?? [], childPath, child.id),
        };
      }

      return {
        id: child.id,
        type: "file" as const,
        title,
        path: childPath,
        storageFile: "",
        parentFolderId,
      };
    });

  return {
    siteId,
    rootFolderId: root.id,
    rootSchemaId: root.schemaId,
    pages: walkFolder(root.children ?? [], "", root.id),
    tags: {},
  };
}

export async function fetchAllFileDocuments(
  siteId: string,
  token: string,
  options: FetchSiteContentOptions = {}
): Promise<Map<string, FileDocument>> {
  const documents = new Map<string, FileDocument>();
  let pageToken: string | null = null;

  do {
    const responseData: {
      documents?: FileDocument[];
      nextPageToken?: string | null;
    } = await fetchJson<{
      documents?: FileDocument[];
      nextPageToken?: string | null;
    }>(
      PAGINATED_FILE_DOCUMENTS_ENDPOINT,
      token,
      {
        siteId,
        pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
        pageToken,
      },
      "Failed to fetch paginated file documents",
      options
    );
    for (const document of responseData.documents ?? []) {
      documents.set(document.id, document);
    }

    pageToken = responseData.nextPageToken ?? null;
  } while (pageToken);
  return documents;
}

export async function stageSiteContent(
  siteId: string,
  token: string,
  contentDir: string,
  options: FetchSiteContentOptions = {}
): Promise<StagedSiteContent> {
  const [sitePages, documents, schemas] = await Promise.all([
    fetchStaticFileTree(siteId, token, options),
    fetchAllFileDocuments(siteId, token, options),
    fetchSiteSchemas(siteId, token, options),
  ]);

  const fileNodes = flattenFileNodes(sitePages.pages);

  await ensureDir(contentDir);

  const folderSchemaMap = new Map<string, string>();
  if (sitePages.rootSchemaId) {
    folderSchemaMap.set(sitePages.rootFolderId, sitePages.rootSchemaId);
  }

  const mapSchemas = (nodes: PageTreeNode[], inheritedSchemaId?: string) => {
    for (const node of nodes) {
      if (node.type === "folder") {
        const activeSchemaId = node.schemaId ?? inheritedSchemaId;
        if (activeSchemaId) {
          folderSchemaMap.set(node.id, activeSchemaId);
        }
        mapSchemas(node.children, activeSchemaId);
      }
    }
  };
  mapSchemas(sitePages.pages, sitePages.rootSchemaId);

  let skippedCount = 0;
  const files: StagedSiteContent["files"] = [];
  for (const fileNode of fileNodes) {
    const normalizedPath = safeRelativePath(fileNode.path);
    const relPath = `${normalizedPath}.mdx`;
    const absolutePath = path.join(contentDir, relPath);
    const document = documents.get(fileNode.id);

    if (!document) {
      options.logger?.warn(`Document not found for file node: ${fileNode.id} (${fileNode.title})`);
      continue;
    }

    if (document.metadata?.pageStatus !== "published") {
      skippedCount++;
      continue;
    }

    if (document.metadata?.slug && typeof document.metadata.slug === "string") {
      const dir = path.posix.dirname(normalizedPath);
      if (dir !== ".") {
        document.metadata.slug = `${dir}/${document.metadata.slug}`;
      }
    }

    const slug = toSlug(normalizedPath);
    const schemaId = fileNode.parentFolderId
      ? folderSchemaMap.get(fileNode.parentFolderId)
      : undefined;
    const schema = schemaId ? schemas.get(schemaId) : undefined;

    const contentWithFrontmatter = buildMdxWithSchema(document, schema, fileNode.title, slug);

    await ensureDir(path.dirname(absolutePath));
    await writeTextFile(absolutePath, contentWithFrontmatter);

    files.push({
      id: fileNode.id,
      relPath,
      absolutePath,
    });
  }

  if (skippedCount > 0) {
    options.logger?.info?.(`Skipped ${skippedCount} non-published page(s).`);
  }
  const pagemap = generatePageMap(sitePages.pages, documents);
  const pagemapPath = path.join(contentDir, "pagemap.json");
  await writeTextFile(pagemapPath, JSON.stringify(pagemap, null, 2));

  return {
    sitePages,
    files,
  };
}
