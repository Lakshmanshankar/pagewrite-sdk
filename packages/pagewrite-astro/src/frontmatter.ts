import { stringify } from "yaml";
import type { FileDocument, SiteSchema } from "./types.js";
import { upsertFrontmatter } from "./utils.js";

function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

function extractBody(content: string): string {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  if (!normalizedContent.startsWith("---\n")) {
    return normalizedContent;
  }
  const endIndex = normalizedContent.indexOf("\n---", 4);
  if (endIndex === -1) {
    return normalizedContent;
  }
  const bodyStart = normalizedContent.startsWith("\n", endIndex + 4) ? endIndex + 5 : endIndex + 4;
  return normalizedContent.slice(bodyStart);
}

export function lookupOptionValue(options: unknown, rawValue: unknown): unknown {
  if (!Array.isArray(options) || options.length === 0) {
    return rawValue;
  }
  if (rawValue === undefined || rawValue === null) {
    return rawValue;
  }

  const strRawValue = String(rawValue);
  const match = options.find((opt) => {
    if (typeof opt === "string") {
      return opt === rawValue || opt === strRawValue;
    }
    if (opt && typeof opt === "object") {
      const o = opt as Record<string, unknown>;
      return (
        o.id === rawValue ||
        String(o.id) === strRawValue ||
        o.value === rawValue ||
        String(o.value) === strRawValue ||
        o.label === rawValue ||
        String(o.label) === strRawValue ||
        o.name === rawValue ||
        String(o.name) === strRawValue
      );
    }
    return false;
  });

  if (!match) {
    return rawValue;
  }

  if (typeof match === "string") {
    return match;
  }

  const o = match as Record<string, unknown>;
  if (typeof o.label === "string" && o.label.trim() !== "") {
    return o.label;
  }
  if (typeof o.value === "string" && o.value.trim() !== "") {
    return o.value;
  }
  if (typeof o.name === "string" && o.name.trim() !== "") {
    return o.name;
  }
  if (o.id !== undefined && o.id !== null) {
    return String(o.id);
  }

  return rawValue;
}

export function resolveFolderSchemaId(
  folderId: string | undefined,
  folderMap: Map<string, { id: string; schemaId?: string; parentFolderId?: string }>,
  rootFolderId?: string,
  rootSchemaId?: string
): string | undefined {
  let currentId = folderId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (rootFolderId && currentId === rootFolderId) {
      const cleanRoot = rootSchemaId?.trim();
      return cleanRoot || undefined;
    }

    const folder = folderMap.get(currentId);
    if (!folder) {
      break;
    }

    const cleanSchemaId = folder.schemaId?.trim();
    if (cleanSchemaId) {
      return cleanSchemaId;
    }

    // If there is no schema then we have to lookup in one level up
    currentId = folder.parentFolderId ?? rootFolderId;
  }

  const cleanRoot = rootSchemaId?.trim();
  return cleanRoot || undefined;
}

export interface BuildMdxOptions {
  schemas?: Map<string, SiteSchema>;
  folderMap?: Map<string, { id: string; schemaId?: string; parentFolderId?: string }>;
  rootFolderId?: string;
  rootSchemaId?: string;
}

export function buildMdxWithSchema(
  document: FileDocument,
  schema: SiteSchema | undefined,
  fallbackTitle: string,
  slug: string,
  options?: BuildMdxOptions
): string {
  let effectiveSchema = schema;

  if (!effectiveSchema && options?.schemas) {
    const parentFolderId = document.parentFolderId;
    const schemaId = resolveFolderSchemaId(
      parentFolderId,
      options.folderMap ?? new Map(),
      options.rootFolderId,
      options.rootSchemaId
    );
    if (schemaId) {
      effectiveSchema = options.schemas.get(schemaId);
    }
  }

  if (!effectiveSchema) {
    // Fallback to standard metadata processing
    return upsertFrontmatter(document.mdxString ?? "", fallbackTitle, slug, document.id);
  }

  const frontmatter: Record<string, unknown> = {};
  const rawMetadata = document.metadata ?? {};

  // Include standard static fields from metadata
  const staticFields = [
    "title",
    "id",
    "datePublished",
    "metaDescription",
    "pageStatus",
    "slug",
    "metaKeywords",
    "metaTitle",
  ];

  for (const key of staticFields) {
    if (key in rawMetadata && rawMetadata[key] !== undefined) {
      frontmatter[key] = rawMetadata[key];
    }
  }

  // Process schema fields
  for (const field of effectiveSchema.fields) {
    const camelKey = toCamelCase(field.name);

    // Look up by field.id for custom schema properties, falling back to camelKey or field.name
    let value: unknown = undefined;
    let found = false;

    if (field.id in rawMetadata && rawMetadata[field.id] !== undefined) {
      value = rawMetadata[field.id];
      found = true;
    } else if (camelKey in rawMetadata && rawMetadata[camelKey] !== undefined) {
      value = rawMetadata[camelKey];
      found = true;
    } else if (field.name in rawMetadata && rawMetadata[field.name] !== undefined) {
      value = rawMetadata[field.name];
      found = true;
    }

    if (found) {
      // Type coercion and option value lookup
      if (field.type === "date" || field.type === "date_range") {
        if (value && typeof value === "string") {
          // Keep as string or parse date, YAML stringifier handles both nicely
        }
      } else if (field.type === "select") {
        if (Array.isArray(value)) {
          const first = value[0];
          value = first !== undefined ? lookupOptionValue(field.options, first) : undefined;
        } else if (value !== undefined && value !== null) {
          value = lookupOptionValue(field.options, value);
        }
      } else if (
        field.type === "multi_select" ||
        field.type === "multi-select" ||
        field.type === "string_list"
      ) {
        if (Array.isArray(value)) {
          if (field.options && field.options.length > 0) {
            value = value.map((item) => lookupOptionValue(field.options, item));
          }
        } else if (value !== undefined && value !== null && value !== "") {
          if (field.type === "string_list") {
            // Keep string as is
          } else {
            value = [lookupOptionValue(field.options, value)];
          }
        }
      }
      frontmatter[camelKey] = value;
    }
  }

  // Merge system-level metadata fallback
  frontmatter.title = frontmatter.title ?? fallbackTitle;
  frontmatter.slug = frontmatter.slug ?? slug;
  if (!frontmatter.id && document.id) {
    frontmatter.id = document.id;
  }

  const yamlString = stringify(frontmatter);
  const mdxBody = extractBody(document.mdxString ?? "");

  return `---\n${yamlString.trim()}\n---\n\n${mdxBody}`;
}
