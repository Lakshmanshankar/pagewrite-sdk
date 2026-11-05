import { describe, expect, it } from "vitest";
import {
  flattenFileNodes,
  generateFolderMap,
  generatePageMap,
  safeRelativePath,
  toSegment,
  toSlug,
  upsertFrontmatter,
} from "../src/utils.js";

describe("content utils", () => {
  it("generates folder map with flattened file nodes and depth", () => {
    const pages = [
      {
        id: "folder-1",
        type: "folder" as const,
        title: "Docs",
        path: "docs",
        children: [
          {
            id: "file-1",
            type: "file" as const,
            title: "Getting Started",
            path: "docs/getting-started",
            storageFile: "",
          },
          {
            id: "folder-nested",
            type: "folder" as const,
            title: "Deep",
            path: "docs/deep",
            children: [
              {
                id: "file-2",
                type: "file" as const,
                title: "Deep Page",
                path: "docs/deep/page",
                storageFile: "",
              },
            ],
          },
        ],
      },
    ];

    const folderMap = generateFolderMap(pages, undefined, "root");

    // Check root folder
    expect(folderMap["root"]).toBeDefined();
    expect(folderMap["root"].children).toHaveLength(2);
    expect(folderMap["root"].children[0].id).toBe("file-1");
    expect(folderMap["root"].children[0].depth).toBe(2);
    expect(folderMap["root"].children[1].id).toBe("file-2");
    expect(folderMap["root"].children[1].depth).toBe(3);

    // Check folder-1: immediate file depth 1, nested file depth 2
    expect(folderMap["folder-1"]).toBeDefined();
    expect(folderMap["folder-1"].children).toHaveLength(2);
    expect(folderMap["folder-1"].children[0]).toEqual({
      id: "file-1",
      title: "Getting Started",
      slug: "docs/getting-started",
      path: "docs/getting-started",
      depth: 1,
      parentFolderId: undefined,
    });
    expect(folderMap["folder-1"].children[1]).toEqual({
      id: "file-2",
      title: "Deep Page",
      slug: "docs/deep/page",
      path: "docs/deep/page",
      depth: 2,
      parentFolderId: undefined,
    });

    // Check folder-nested: immediate file depth 1
    expect(folderMap["folder-nested"]).toBeDefined();
    expect(folderMap["folder-nested"].children).toHaveLength(1);
    expect(folderMap["folder-nested"].children[0].depth).toBe(1);
  });
  it("generates page map", () => {
    expect(
      generatePageMap([
        {
          id: "folder-1",
          type: "folder",
          title: "Docs",
          path: "docs",
          children: [
            {
              id: "file-1",
              type: "file",
              title: "Getting Started",
              path: "docs/getting-started",
              storageFile: "",
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: "folder-1",
        title: "Docs",
        slug: "docs",
        children: [
          {
            id: "file-1",
            title: "Getting Started",
            slug: "docs/getting-started",
          },
        ],
      },
    ]);
  });

  it("flattens file nodes", () => {
    expect(
      flattenFileNodes([
        {
          id: "folder",
          type: "folder",
          title: "Folder",
          path: "folder",
          children: [
            {
              id: "file",
              type: "file",
              title: "File",
              path: "folder/file",
              storageFile: "",
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: "file",
        type: "file",
        title: "File",
        path: "folder/file",
        storageFile: "",
      },
    ]);
  });

  it("normalizes segments and slugs", () => {
    expect(toSegment("Getting Started!", "fallback")).toBe("getting-started");
    expect(toSlug("Docs/Getting Started")).toBe("docs/getting-started");
  });

  it("rejects unsafe relative paths", () => {
    expect(() => safeRelativePath("../secret")).toThrow("Unsafe relative content path");
    expect(() => safeRelativePath("/secret")).toThrow("Unsafe absolute content path");
    expect(() => safeRelativePath("")).toThrow("Invalid empty content path");
  });

  it("inserts frontmatter", () => {
    expect(upsertFrontmatter("# Body", "Hello", "hello")).toBe(
      '---\ntitle: "Hello"\nslug: "hello"\n---\n\n# Body'
    );
    expect(upsertFrontmatter("# Body", "Hello", "hello", "my-id")).toBe(
      '---\ntitle: "Hello"\nslug: "hello"\nid: "my-id"\n---\n\n# Body'
    );
  });

  it("updates existing frontmatter", () => {
    expect(upsertFrontmatter('---\ntitle: "Old"\ndraft: true\n---\n# Body', "New", "new")).toBe(
      '---\ntitle: "New"\nslug: "new"\ndraft: true\n---\n# Body'
    );
    expect(
      upsertFrontmatter(
        '---\ntitle: "Old"\nslug: "old"\nid: "old-id"\ndraft: true\n---\n# Body',
        "New",
        "new",
        "new-id"
      )
    ).toBe('---\ntitle: "New"\nslug: "new"\nid: "new-id"\ndraft: true\n---\n# Body');
  });
});
