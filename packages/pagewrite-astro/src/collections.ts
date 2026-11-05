import fs from "node:fs";
import path from "node:path";
import { defineCollection } from "astro/content/config";
import { file } from "astro/loaders";
import {
  siteSettingsSchema,
  pageLinksSchema,
  pageTreeSchema,
  folderSchema,
  pageDataSchema,
  siteSchemaSchema,
} from "./schemas.js";

export * from "./schemas.js";

/**
 * Searches for a collection data file in the content directory or its subdirectories.
 * Checks `<dir>/site/{name}` and `<dir>/{name}`.
 */
function findInContentDir(dirPath: string, fileNames: string[], maxDepth = 4): string | undefined {
  if (!fs.existsSync(dirPath) || maxDepth < 0) return undefined;

  // 1. Direct check: <dirPath>/site/{name}
  for (const name of fileNames) {
    const siteFile = path.join(dirPath, "site", name);
    if (fs.existsSync(siteFile)) return siteFile;
  }

  // 2. Direct check: <dirPath>/{name}
  for (const name of fileNames) {
    const directFile = path.join(dirPath, name);
    if (fs.existsSync(directFile)) return directFile;
  }

  // 3. Search subdirectories (e.g. blog, docs)
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
        const found = findInContentDir(path.join(dirPath, entry.name), fileNames, maxDepth - 1);
        if (found) return found;
      }
    }
  } catch {}

  return undefined;
}

/**
 * Resolves the data path for a collection file by searching in the content folder.
 * Prioritizes PAGEWRITE_CONTENT_DIR if set, and searches inside src/content.
 */
export function resolveDataPath(relativeFileName: string, ...fallbackNames: string[]): string {
  const fileNames = [relativeFileName, ...fallbackNames];

  // 1. Check environment variable set by the Astro integration (e.g. outputDir)
  const envContentDir = process.env.PAGEWRITE_CONTENT_DIR;
  if (envContentDir) {
    const found = findInContentDir(envContentDir, fileNames);
    if (found) return found;
  }

  // 2. Search in the host app content folder (src/content)
  const contentRoot = path.resolve(process.cwd(), "src", "content");
  const foundInContent = findInContentDir(contentRoot, fileNames);
  if (foundInContent) return foundInContent;

  const baseDir = envContentDir || contentRoot;
  return path.join(baseDir, "site", relativeFileName);
}

/**
 * Custom parser for site settings singleton.
 * Converts singleton JSON object or array to an array with a stable id: 'site'.
 */
export function parseSiteSettings(text: string): Array<Record<string, unknown>> {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  return [{ id: "site", ...(data as Record<string, unknown>) }];
}

/**
 * Custom parser for page links.
 * Converts a plain { [pageId]: slug } map into an array of [{ id, slug }].
 */
export function parsePageLinks(text: string): Array<Record<string, unknown>> {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (typeof data === "object" && data !== null) {
    return Object.entries(data).map(([id, val]) => ({
      id,
      slug: typeof val === "string" ? val : ((val as { slug?: string })?.slug ?? ""),
    }));
  }
  return [];
}

export const parseLinks = parsePageLinks;

/**
 * Custom parser for page tree.
 * Preserves recursive siteTree containing id, title, slug, and children property.
 */
export function parsePageTree(text: string): Array<Record<string, unknown>> {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (typeof data === "object" && data !== null) {
    if (!("id" in data)) {
      return Object.entries(data).map(([id, val]) => {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return { id, ...(val as Record<string, unknown>) };
        }
        return { id, data: val };
      });
    }
    return [data as Record<string, unknown>];
  }
  return [];
}

export const parsePageMap = parsePageTree;
export const parsePageNodes = parsePageTree;
export const parseFolderMap = parsePageTree;
export const parseFolders = parsePageTree;

/**
 * Custom parser for page data.
 * Converts a plain { [pageId]: metaData } map into an array of [{ id, ...metaData }].
 */
export function parsePageData(text: string): Array<Record<string, unknown>> {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (typeof data === "object" && data !== null) {
    return Object.entries(data).map(([id, val]) => {
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return { id, ...(val as Record<string, unknown>) };
      }
      return { id, data: val };
    });
  }
  return [];
}

/**
 * Custom parser for site schemas.
 * Normalizes an array or map of schemas into an array of schema objects.
 */
export function parseSiteSchema(text: string): Array<Record<string, unknown>> {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }
  if (typeof data === "object" && data !== null) {
    if (Array.isArray((data as Record<string, unknown>).schemas)) {
      return (data as Record<string, unknown>).schemas as Array<Record<string, unknown>>;
    }
    return Object.entries(data).map(([id, val]) => {
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return { id, ...(val as Record<string, unknown>) };
      }
      return { id, name: String(val) };
    });
  }
  return [];
}

export interface CollectionsConfig {
  siteSettingsPath?: string;
  linksPath?: string;
  pageLinksPath?: string;
  pageDataPath?: string;
  foldersPath?: string;
  folderMapPath?: string;
  pageTreePath?: string;
  pageMapPath?: string;
  pageNodesPath?: string;
  schemaPath?: string;
  siteSchemaPath?: string;
}

/**
 * Creates the content collection definitions for pagewrite-astro.
 * Accepts optional path overrides. Defaults to searching in the content directory.
 */
export function createCollections(config: CollectionsConfig = {}) {
  const siteSettingsFile = config.siteSettingsPath ?? resolveDataPath("siteSettings.json");
  const linksFile =
    config.pageLinksPath ?? config.linksPath ?? resolveDataPath("links.json", "pageLinks.json");
  const pageTreeFile =
    config.pageTreePath ??
    config.pageMapPath ??
    config.folderMapPath ??
    config.foldersPath ??
    config.pageNodesPath ??
    resolveDataPath("pageTree.json", "pageMap.json");
  const pageDataFile = config.pageDataPath ?? resolveDataPath("pageData.json");
  const siteSchemaFile =
    config.siteSchemaPath ??
    config.schemaPath ??
    resolveDataPath("schema.json", "schemas.json");

  const siteSettings = defineCollection({
    loader: file(siteSettingsFile, { parser: parseSiteSettings }),
    schema: siteSettingsSchema,
  });

  const pageLinks = defineCollection({
    loader: file(linksFile, { parser: parsePageLinks }),
    schema: pageLinksSchema,
  });

  const pageTree = defineCollection({
    loader: file(pageTreeFile, { parser: parsePageTree }),
    schema: pageTreeSchema,
  });

  const pageData = defineCollection({
    loader: file(pageDataFile, { parser: parsePageData }),
    schema: pageDataSchema,
  });

  const siteSchema = defineCollection({
    loader: file(siteSchemaFile, { parser: parseSiteSchema }),
    schema: siteSchemaSchema,
  });

  return {
    siteSettings,
    pageLinks,
    pageTree,
    pageData,
    siteSchema,
    // backward compatibility aliases
    links: pageLinks,
    pageMap: pageTree,
    folders: pageTree,
    folderMap: pageTree,
    pageNodes: pageTree,
    schemas: siteSchema,
  };
}

/**
 * Ready-made collections object for 1-line registration in host app src/content.config.ts:
 *
 * ```ts
 * import { collections } from "pagewrite-astro/collections";
 * export { collections };
 * ```
 */
export const collections = createCollections();

/**
 * Individual collection exports:
 *
 * ```ts
 * import { pageLinks, pageData, pageTree, siteSettings, siteSchema } from "pagewrite-astro/collections";
 * ```
 */
export const siteSettings = collections.siteSettings;
export const pageLinks = collections.pageLinks;
export const pageTree = collections.pageTree;
export const pageData = collections.pageData;
export const siteSchema = collections.siteSchema;

// Backward-compatibility aliases
export const links = pageLinks;
export const pageMap = collections.pageTree;
export const folders = collections.pageTree;
export const folderMap = collections.pageTree;
export const pageNodes = collections.pageTree;
export const schemas = siteSchema;
