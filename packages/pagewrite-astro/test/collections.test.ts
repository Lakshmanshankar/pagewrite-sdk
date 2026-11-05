import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collections,
  contactsSchema,
  createCollections,
  cssSettingsSchema,
  footerSchema,
  folderSchema,
  folders,
  folderMap,
  links,
  navLinkSchema,
  navbarSchema,
  pageData,
  pageDataSchema,
  pageLinkSchema,
  pageLinks,
  pageLinksSchema,
  pageNodes,
  pageTree,
  pageTreeSchema,
  parseFolderMap,
  parseFolders,
  parseLinks,
  parsePageData,
  parsePageLinks,
  parsePageMap,
  parsePageNodes,
  parsePageTree,
  parseSiteSchema,
  parseSiteSettings,
  resolveDataPath,
  siteLogoSchema,
  siteSchema,
  siteSchemaSchema,
  siteSettings,
  siteSettingsSchema,
} from "../src/collections.js";

describe("Content collection schemas", () => {
  it("validates contacts as either record or array of records", () => {
    const objectContacts = {
      github: "https://github.com/lakshmanshankar",
      email: "test@example.com",
    };
    expect(contactsSchema.parse(objectContacts)).toEqual(objectContacts);

    const arrayContacts = [{ name: "github", href: "https://github.com/lakshmanshankar" }];
    expect(contactsSchema.parse(arrayContacts)).toEqual(arrayContacts);
  });

  it("validates navbar and site logo schemas", () => {
    const logo = siteLogoSchema.parse({
      light: "/logo.svg",
      dark: "/logo-dark.svg",
      alt: "Logo",
    });
    expect(logo.light).toBe("/logo.svg");

    const link = navLinkSchema.parse({ label: "Docs", href: "/docs" });
    expect(link.label).toBe("Docs");

    const navbar = navbarSchema.parse({
      title: "My Site",
      logo,
      links: [link],
    });
    expect(navbar.title).toBe("My Site");
    expect(navbar.links).toHaveLength(1);
  });

  it("validates footer schema", () => {
    const footer = footerSchema.parse({
      siteTitle: "My Site",
      description: "A documentation site",
      copyright: "2026 Acme Corp",
      links: [{ label: "GitHub", href: "https://github.com" }],
      legalLinks: [{ label: "Privacy", href: "/privacy" }],
    });
    expect(footer.siteTitle).toBe("My Site");
    expect(footer.links?.[0].label).toBe("GitHub");
    expect(footer.legalLinks?.[0].href).toBe("/privacy");
  });

  it("validates cssSettings schema", () => {
    expect(cssSettingsSchema.parse(":root { --brand: #fff; }")).toBe(":root { --brand: #fff; }");
    expect(cssSettingsSchema.parse({ "--brand": "#fff" })).toEqual({ "--brand": "#fff" });
  });

  it("validates siteSettings schema", () => {
    const valid = siteSettingsSchema.parse({
      siteName: "Pagewrite",
      contacts: { github: "https://github.com" },
      navbar: { title: "Pagewrite" },
      footer: { copyright: "2026" },
      css: ":root { --color: red; }",
      cssVariables: ":root { --color: red; }",
    });
    expect(valid.siteName).toBe("Pagewrite");
    expect(valid.navbar?.title).toBe("Pagewrite");
    expect(valid.footer?.copyright).toBe("2026");
  });

  it("validates pageLinks schema", () => {
    const parsed = pageLinksSchema.parse({ id: "page-1", slug: "docs/getting-started" });
    expect(parsed.id).toBe("page-1");
    expect(parsed.slug).toBe("docs/getting-started");
    // Compatibility alias pageLinkSchema
    expect(pageLinkSchema.parse(parsed)).toEqual(parsed);
  });

  it("validates pageTree schema recursively", () => {
    const tree = {
      id: "folder-1",
      title: "Docs",
      slug: "docs",
      children: [
        {
          id: "page-1",
          title: "Introduction",
          slug: "docs/intro",
        },
        {
          id: "folder-nested",
          title: "Advanced",
          slug: "docs/advanced",
          children: [
            {
              id: "page-2",
              title: "Deep Dive",
              slug: "docs/advanced/deep-dive",
            },
          ],
        },
      ],
    };
    const parsed = pageTreeSchema.parse(tree);
    expect(parsed.id).toBe("folder-1");
    expect(parsed.children).toHaveLength(2);
    expect(parsed.children?.[1].children?.[0].id).toBe("page-2");
    expect(folderSchema.parse(tree)).toEqual(parsed);
  });

  it("validates pageData schema with arbitrary metadata shapes", () => {
    const metadata = {
      title: "Arbitrary Page",
      tags: ["astro", "typescript"],
      customCount: 42,
      published: true,
      nested: { foo: "bar" },
    };
    const parsed = pageDataSchema.parse(metadata);
    expect(parsed.title).toBe("Arbitrary Page");
    expect(parsed.customCount).toBe(42);
    expect(parsed.nested.foo).toBe("bar");
  });

  it("validates siteSchema schema with map-based fields", () => {
    const rawSchema = {
      id: "blog-post",
      name: "Blog Post",
      fields: {
        title: {
          name: "Title",
          type: "string",
          required: true,
        },
        tags: {
          name: "Tags",
          type: "multi-select",
          options: [{ id: "t1", label: "Astro", value: "astro" }],
        },
      },
    };
    const parsed = siteSchemaSchema.parse(rawSchema);
    expect(parsed.id).toBe("blog-post");
    expect(parsed.fields).toBeDefined();
    expect((parsed.fields as Record<string, any>).title.name).toBe("Title");
    expect((parsed.fields as Record<string, any>).tags.options?.[0].label).toBe("Astro");
  });
});

describe("Collection parsers", () => {
  it("parseSiteSettings wraps singleton object into array with id: 'site'", () => {
    const raw = JSON.stringify({
      siteName: "My Site",
      contacts: { github: "https://github.com" },
      cssVariables: "/* css */",
    });
    const parsed = parseSiteSettings(raw);
    expect(parsed).toEqual([
      {
        id: "site",
        siteName: "My Site",
        contacts: { github: "https://github.com" },
        cssVariables: "/* css */",
      },
    ]);
  });

  it("parsePageLinks converts a map of id -> slug to array of [{ id, slug }]", () => {
    const raw = JSON.stringify({
      "id-1": "resume",
      "id-2": "blog/post-1",
    });
    const parsed = parsePageLinks(raw);
    expect(parsed).toEqual([
      { id: "id-1", slug: "resume" },
      { id: "id-2", slug: "blog/post-1" },
    ]);
    expect(parseLinks(raw)).toEqual(parsed);
  });

  it("parsePageTree parses recursive tree array or map", () => {
    const rawTree = [
      {
        id: "folder-1",
        title: "Work",
        children: [
          { id: "file-1", title: "SWE", slug: "work/swe" },
          { id: "file-2", title: "Lead", slug: "work/lead" },
        ],
      },
    ];
    const parsed = parsePageTree(JSON.stringify(rawTree));
    expect(parsed).toEqual(rawTree);
    expect(parsePageMap(JSON.stringify(rawTree))).toEqual(parsed);
    expect(parseFolders(JSON.stringify(rawTree))).toEqual(parsed);
  });

  it("parsePageData converts { [pageId]: metaData } map into array of [{ id, ...metaData }]", () => {
    const dataMap = {
      "page-1": { title: "Page One", author: "Alice" },
      "page-2": { title: "Page Two", published: true, count: 5 },
    };
    const parsed = parsePageData(JSON.stringify(dataMap));
    expect(parsed).toEqual([
      { id: "page-1", title: "Page One", author: "Alice" },
      { id: "page-2", title: "Page Two", published: true, count: 5 },
    ]);
  });

  it("parseSiteSchema normalizes array or object of schemas", () => {
    const schemaArray = [
      { id: "s-1", name: "Doc Schema", fields: {} },
      { id: "s-2", name: "Blog Schema", fields: {} },
    ];
    expect(parseSiteSchema(JSON.stringify(schemaArray))).toEqual(schemaArray);

    const schemaMap = {
      "s-1": {
        name: "Doc Schema",
        fields: {
          title: { name: "Title", type: "string" },
        },
      },
    };
    expect(parseSiteSchema(JSON.stringify(schemaMap))).toEqual([
      {
        id: "s-1",
        name: "Doc Schema",
        fields: {
          title: { name: "Title", type: "string" },
        },
      },
    ]);

    const wrapperObject = {
      schemas: schemaArray,
    };
    expect(parseSiteSchema(JSON.stringify(wrapperObject))).toEqual(schemaArray);
  });
});

describe("Collection exports and loaders", () => {
  it("exports collections object and individual collections", () => {
    expect(collections).toBeDefined();
    expect(collections.siteSettings).toBeDefined();
    expect(collections.pageLinks).toBeDefined();
    expect(collections.folders).toBeDefined();
    expect(collections.pageData).toBeDefined();
    expect(collections.siteSchema).toBeDefined();

    expect(siteSettings).toBe(collections.siteSettings);
    expect(pageLinks).toBe(collections.pageLinks);
    expect(folders).toBe(collections.folders);
    expect(folderMap).toBe(collections.folders);
    expect(pageTree).toBe(collections.folders);
    expect(pageData).toBe(collections.pageData);
    expect(siteSchema).toBe(collections.siteSchema);

    // Aliases
    expect(links).toBe(collections.pageLinks);
    expect(pageNodes).toBe(collections.folders);
  });

  it("createCollections creates independent collection instances with custom paths", () => {
    const custom = createCollections({
      linksPath: "/tmp/custom-links.json",
      pageDataPath: "/tmp/custom-pagedata.json",
      foldersPath: "/tmp/custom-foldermap.json",
      schemaPath: "/tmp/custom-schema.json",
    });
    expect(custom.siteSettings).toBeDefined();
    expect(custom.pageLinks).toBeDefined();
    expect(custom.folders).toBeDefined();
    expect(custom.pageData).toBeDefined();
    expect(custom.siteSchema).toBeDefined();
  });

  it("resolves data files by searching content folder and parses them cleanly", async () => {
    const dataDir = path.resolve(__dirname, "../data");
    const previousEnv = process.env.PAGEWRITE_CONTENT_DIR;
    process.env.PAGEWRITE_CONTENT_DIR = dataDir;

    try {
      const siteSettingsPath = resolveDataPath("siteSettings.json");
      const linksPath = resolveDataPath("links.json");
      const pageTreePath = resolveDataPath("pageTree.json", "pageMap.json");
      const pageDataPath = resolveDataPath("pageData.json");
      const schemaPath = resolveDataPath("schema.json", "schemas.json");

      await expect(fs.stat(siteSettingsPath)).resolves.toBeDefined();
      await expect(fs.stat(linksPath)).resolves.toBeDefined();
      await expect(fs.stat(pageTreePath)).resolves.toBeDefined();
      await expect(fs.stat(pageDataPath)).resolves.toBeDefined();
      await expect(fs.stat(schemaPath)).resolves.toBeDefined();

      // Verify default data files parse cleanly through parsers and schemas
      const siteSettingsData = parseSiteSettings(
        await fs.readFile(siteSettingsPath, "utf8")
      ) as any[];
      expect(siteSettingsData[0].id).toBe("site");
      expect(siteSettingsSchema.parse(siteSettingsData[0])).toBeDefined();

      const linksData = parsePageLinks(await fs.readFile(linksPath, "utf8")) as any[];
      expect(linksData.length).toBeGreaterThan(0);
      expect(pageLinksSchema.parse(linksData[0])).toBeDefined();

      const pageTreeData = parsePageTree(await fs.readFile(pageTreePath, "utf8")) as any[];
      expect(pageTreeData.length).toBeGreaterThan(0);
      expect(pageTreeSchema.parse(pageTreeData[0])).toBeDefined();

      const pageDataContent = parsePageData(await fs.readFile(pageDataPath, "utf8")) as any[];
      expect(pageDataContent.length).toBeGreaterThan(0);
      expect(pageDataSchema.parse(pageDataContent[0])).toBeDefined();

      const schemaContent = parseSiteSchema(await fs.readFile(schemaPath, "utf8")) as any[];
      expect(schemaContent.length).toBeGreaterThan(0);
      expect(siteSchemaSchema.parse(schemaContent[0])).toBeDefined();
    } finally {
      if (previousEnv !== undefined) {
        process.env.PAGEWRITE_CONTENT_DIR = previousEnv;
      } else {
        delete process.env.PAGEWRITE_CONTENT_DIR;
      }
    }
  });

  it("resolves data path by searching inside content folder subdirectories (e.g. blog/site/)", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-content-test-"));
    const blogSiteDir = path.join(tmpDir, "blog", "site");
    await fs.mkdir(blogSiteDir, { recursive: true });
    const customLinksPath = path.join(blogSiteDir, "links.json");
    await fs.writeFile(customLinksPath, JSON.stringify({ "blog-page": "blog/post-1" }));

    const previousEnv = process.env.PAGEWRITE_CONTENT_DIR;
    try {
      process.env.PAGEWRITE_CONTENT_DIR = tmpDir;
      const resolved = resolveDataPath("links.json");
      expect(resolved).toBe(customLinksPath);
    } finally {
      if (previousEnv !== undefined) {
        process.env.PAGEWRITE_CONTENT_DIR = previousEnv;
      } else {
        delete process.env.PAGEWRITE_CONTENT_DIR;
      }
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("resolves data path dynamically from PAGEWRITE_CONTENT_DIR /site/ subdirectory", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-resolve-test-"));
    const siteDir = path.join(tmpDir, "site");
    await fs.mkdir(siteDir, { recursive: true });
    const customLinksPath = path.join(siteDir, "links.json");
    await fs.writeFile(customLinksPath, JSON.stringify({ "id-dyn": "dyn-slug" }));

    const previousEnv = process.env.PAGEWRITE_CONTENT_DIR;
    try {
      process.env.PAGEWRITE_CONTENT_DIR = tmpDir;
      const resolved = resolveDataPath("links.json");
      expect(resolved).toBe(customLinksPath);
    } finally {
      if (previousEnv !== undefined) {
        process.env.PAGEWRITE_CONTENT_DIR = previousEnv;
      } else {
        delete process.env.PAGEWRITE_CONTENT_DIR;
      }
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("exports pagewriteAstro as a named export from root entry without virtual module issues", async () => {
    const rootModule = await import("../src/index.js");
    expect(typeof rootModule.pagewriteAstro).toBe("function");
    expect(rootModule.collections).toBeDefined();
  });
});
