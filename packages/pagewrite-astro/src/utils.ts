import path from "node:path";
import type { PageMapNode, PageTreeFileNode, PageTreeNode, FileDocument } from "./types.js";

export function generatePageMap(
  nodes: PageTreeNode[],
  documents?: Map<string, FileDocument>
): PageMapNode[] {
  return nodes.map((node) => {
    let slug = toSlug(safeRelativePath(node.path));

    if (node.type === "file" && documents) {
      const doc = documents.get(node.id);
      if (doc?.metadata?.slug && typeof doc.metadata.slug === "string") {
        slug = doc.metadata.slug;
      }
    }

    if (node.type === "folder") {
      return {
        id: node.id,
        title: node.title,
        slug,
        children: generatePageMap(node.children, documents),
      };
    }
    return {
      id: node.id,
      title: node.title,
      slug,
    };
  });
}

export function flattenFileNodes(nodes: PageTreeNode[]): PageTreeFileNode[] {
  const files: PageTreeFileNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      files.push(node);
    } else {
      files.push(...flattenFileNodes(node.children));
    }
  }

  return files;
}

export function safeRelativePath(value: string): string {
  const normalizedSlashes = value.replace(/\\/g, "/").trim();

  if (!normalizedSlashes || normalizedSlashes.includes("\0")) {
    throw new Error("Invalid empty content path");
  }

  if (path.posix.isAbsolute(normalizedSlashes)) {
    throw new Error(`Unsafe absolute content path: ${value}`);
  }

  const normalized = path.posix.normalize(normalizedSlashes);

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe relative content path: ${value}`);
  }

  return normalized;
}

export function toSegment(title: string, fallback: string): string {
  const slug = slugify(title);
  return slug || slugify(fallback) || fallback;
}

export function toSlug(relativePath: string): string {
  return safeRelativePath(relativePath)
    .split("/")
    .map((segment) => toSegment(segment, segment))
    .join("/");
}

export function upsertFrontmatter(
  content: string,
  title: string,
  slug: string,
  id?: string
): string {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const titleLine = `title: ${quoteYamlString(title)}`;
  const slugLine = `slug: ${quoteYamlString(slug)}`;
  const idLine = id ? `id: ${quoteYamlString(id)}` : "";

  const lines = [titleLine, slugLine];
  if (idLine) {
    lines.push(idLine);
  }

  if (!normalizedContent.startsWith("---\n")) {
    return `---\n${lines.join("\n")}\n---\n\n${normalizedContent}`;
  }

  const endIndex = normalizedContent.indexOf("\n---", 4);
  if (endIndex === -1) {
    return `---\n${lines.join("\n")}\n---\n\n${normalizedContent}`;
  }

  const existingFrontmatter = normalizedContent.slice(4, endIndex);
  const bodyStart = normalizedContent.startsWith("\n", endIndex + 4) ? endIndex + 5 : endIndex + 4;
  const body = normalizedContent.slice(bodyStart);
  const remainingLines = existingFrontmatter
    .split("\n")
    .filter(
      (line) =>
        !/^title\s*:/.test(line) && !/^slug\s*:/.test(line) && (id ? !/^id\s*:/.test(line) : true)
    )
    .filter((line, index, lines) => line.trim() !== "" || index < lines.length - 1);
  const nextFrontmatter = [...lines, ...remainingLines].join("\n").trim();

  return `---\n${nextFrontmatter}\n---${body.startsWith("\n") ? "" : "\n"}${body}`;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function quoteYamlString(value: string): string {
  return JSON.stringify(value);
}
