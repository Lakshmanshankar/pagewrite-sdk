import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PAGINATED_FILE_DOCUMENTS_ENDPOINT,
  STATIC_FILE_TREE_ENDPOINT,
  fetchAllFileDocuments,
  fetchStaticFileTree,
  stageSiteContent,
} from "../src/client.js";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pagewrite-astro-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("Pagewrite content fetching", () => {
  it("fetches and maps the static file tree", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        root: {
          id: "root",
          isFolder: true,
          children: [
            {
              id: "folder-1",
              title: "Docs",
              isFolder: true,
              children: [{ id: "file-1", title: "Getting Started", isFolder: false }],
            },
          ],
        },
      })
    ) as unknown as typeof fetch;

    const result = await fetchStaticFileTree("site-1", "token", { fetchImpl });

    expect(result.pages).toEqual([
      {
        id: "folder-1",
        type: "folder",
        title: "Docs",
        path: "docs",
        databaseType: undefined,
        lang: undefined,
        schemaId: undefined,
        children: [
          {
            id: "file-1",
            type: "file",
            title: "Getting Started",
            path: "docs/getting-started",
            storageFile: "",
            parentFolderId: "folder-1",
          },
        ],
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      STATIC_FILE_TREE_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ siteId: "site-1" }),
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it("fetches all paginated file documents", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          documents: [{ id: "file-1", mdxString: "# One" }],
          nextPageToken: "next",
        })
      )
      .mockResolvedValueOnce(jsonResponse({ documents: [{ id: "file-2", mdxString: "# Two" }] }));

    const result = await fetchAllFileDocuments("site-1", "token", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      pageSize: 10,
    });

    expect([...result.keys()]).toEqual(["file-1", "file-2"]);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      PAGINATED_FILE_DOCUMENTS_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          siteId: "site-1",
          pageSize: 10,
          pageToken: null,
        }),
      })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      PAGINATED_FILE_DOCUMENTS_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          siteId: "site-1",
          pageSize: 10,
          pageToken: "next",
        }),
      })
    );
  });

  it("stages site content by writing MDX files with frontmatter", async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url === STATIC_FILE_TREE_ENDPOINT) {
        return jsonResponse({
          root: {
            id: "root",
            isFolder: true,
            children: [{ id: "file-1", title: "Hello World", isFolder: false }],
          },
        });
      }

      if (url.includes("getSiteSchemas")) {
        return jsonResponse({ schemas: [] });
      }

      return jsonResponse({
        documents: [
          {
            id: "file-1",
            mdxString: "# Body",
            metadata: { pageStatus: "published" },
          },
        ],
      });
    }) as unknown as typeof fetch;

    const result = await stageSiteContent("site-1", "token", tmpDir, {
      fetchImpl,
    });

    expect(result.files).toEqual([
      {
        id: "file-1",
        relPath: "hello-world.mdx",
        absolutePath: path.join(tmpDir, "hello-world.mdx"),
      },
    ]);
    await expect(fs.readFile(path.join(tmpDir, "hello-world.mdx"), "utf8")).resolves.toBe(
      '---\ntitle: "Hello World"\nslug: "hello-world"\nid: "file-1"\n---\n\n# Body'
    );
    await expect(fs.readFile(path.join(tmpDir, "pagemap.json"), "utf8")).resolves.toBe(
      JSON.stringify(
        [
          {
            id: "file-1",
            title: "Hello World",
            slug: "hello-world",
          },
        ],
        null,
        2
      )
    );
  });

  it("throws useful errors for failed requests", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad token", { status: 401 }));

    await expect(
      fetchStaticFileTree("site-1", "token", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow("Failed to fetch static file tree: 401 - bad token");
  });

  it("throws on invalid tree responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ root: { id: "root", isFolder: false } }));

    await expect(
      fetchStaticFileTree("site-1", "token", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow("root folder is missing");
  });
});
