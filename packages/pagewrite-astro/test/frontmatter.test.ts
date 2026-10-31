import { describe, expect, it } from "vitest";
import {
  buildMdxWithSchema,
  lookupOptionValue,
  resolveFolderSchemaId,
} from "../src/frontmatter.js";
import type { FileDocument, SiteSchema } from "../src/types.js";

describe("frontmatter select and multi-select options lookup", () => {
  it("looks up option value from field options by id", () => {
    const options = [
      { id: "opt_eng", label: "Software Engineer", value: "opt_eng" },
      { id: "opt_pm", label: "Product Manager", value: "opt_pm" },
    ];

    expect(lookupOptionValue(options, "opt_eng")).toBe("Software Engineer");
    expect(lookupOptionValue(options, "opt_pm")).toBe("Product Manager");
  });

  it("falls back to value or name or id if label is missing", () => {
    const options = [
      { id: "opt_val", value: "Custom Value" },
      { id: "opt_name", name: "Custom Name" },
      { id: "opt_id_only" },
    ];

    expect(lookupOptionValue(options, "opt_val")).toBe("Custom Value");
    expect(lookupOptionValue(options, "opt_name")).toBe("Custom Name");
    expect(lookupOptionValue(options, "opt_id_only")).toBe("opt_id_only");
  });

  it("returns raw value when option is not found or options empty", () => {
    expect(lookupOptionValue([], "unknown")).toBe("unknown");
    expect(lookupOptionValue(undefined, "unknown")).toBe("unknown");
    expect(lookupOptionValue([{ id: "1", label: "One" }], "unknown")).toBe("unknown");
  });

  it("resolves folder schemaId by looking at parent folder and looking up one level up if empty", () => {
    const folderMap = new Map(
      [
        {
          id: "grandparent",
          schemaId: "grandparent-schema",
        },
        {
          id: "parent",
          schemaId: "",
          parentFolderId: "grandparent",
        },
        {
          id: "child",
          schemaId: undefined,
          parentFolderId: "parent",
        },
      ].map((f) => [f.id, f])
    );

    // child has no schemaId -> looks up parent (empty) -> looks up grandparent ("grandparent-schema")
    expect(resolveFolderSchemaId("child", folderMap, "root", "root-schema")).toBe(
      "grandparent-schema"
    );

    // parent has empty schemaId -> looks up grandparent ("grandparent-schema")
    expect(resolveFolderSchemaId("parent", folderMap, "root", "root-schema")).toBe(
      "grandparent-schema"
    );

    // grandparent has "grandparent-schema"
    expect(resolveFolderSchemaId("grandparent", folderMap, "root", "root-schema")).toBe(
      "grandparent-schema"
    );

    // if all folders have no schema, looks up to root
    const emptyFolderMap = new Map(
      [
        {
          id: "folder-1",
          schemaId: undefined,
          parentFolderId: "root",
        },
      ].map((f) => [f.id, f])
    );

    expect(resolveFolderSchemaId("folder-1", emptyFolderMap, "root", "root-schema")).toBe(
      "root-schema"
    );
  });

  it("builds MDX frontmatter with select and multi_select values looked up from schema", () => {
    const schema: SiteSchema = {
      id: "work-schema",
      name: "Work Experience",
      fields: [
        {
          id: "fld_role",
          name: "Role",
          type: "select",
          options: [
            { id: "2jmvpy", label: "Software Engineer", value: "2jmvpy" },
            { id: "4k8x1a", label: "Staff Engineer", value: "4k8x1a" },
          ],
        },
        {
          id: "fld_tags",
          name: "Tags",
          type: "multi_select",
          options: [
            { id: "tag_tech", label: "Technology" },
            { id: "tag_news", label: "News" },
          ],
        },
        {
          id: "fld_company",
          name: "Company",
          type: "string",
        },
      ],
    };

    const doc: FileDocument = {
      id: "doc-1",
      mdxString: "# Hello World",
      metadata: {
        pageStatus: "published",
        fld_role: "2jmvpy",
        fld_tags: ["tag_tech", "tag_news"],
        fld_company: "Codevantage",
      },
    };

    const result = buildMdxWithSchema(doc, schema, "Fallback Title", "work/codevantage");

    expect(result).toContain("role: Software Engineer");
    expect(result).toContain("tags:\n  - Technology\n  - News");
    expect(result).toContain("company: Codevantage");
    expect(result).toContain("# Hello World");
  });

  it("resolves schema from parent folders when schema is not explicitly provided", () => {
    const schema: SiteSchema = {
      id: "blog-schema",
      name: "Blog Schema",
      fields: [
        {
          id: "category",
          name: "Category",
          type: "select",
          options: [{ id: "cat_eng", label: "Engineering" }],
        },
      ],
    };

    const schemas = new Map([["blog-schema", schema]]);
    const folderMap = new Map([
      ["subfolder", { id: "subfolder", schemaId: undefined, parentFolderId: "blog" }],
      ["blog", { id: "blog", schemaId: "blog-schema", parentFolderId: "root" }],
    ]);

    const doc: FileDocument = {
      id: "doc-2",
      parentFolderId: "subfolder",
      mdxString: "Post content",
      metadata: {
        category: "cat_eng",
      },
    };

    const result = buildMdxWithSchema(doc, undefined, "Post", "blog/post", {
      schemas,
      folderMap,
      rootFolderId: "root",
    });

    expect(result).toContain("category: Engineering");
    expect(result).toContain("Post content");
  });

  it("preserves raw value if option is not in schema options", () => {
    const schema: SiteSchema = {
      id: "schema-1",
      fields: [
        {
          id: "role",
          name: "Role",
          type: "select",
          options: [{ id: "opt_1", label: "Engineer" }],
        },
        {
          id: "tags",
          name: "Tags",
          type: "multi_select",
          options: [{ id: "opt_1", label: "Engineer" }],
        },
      ],
    };

    const doc: FileDocument = {
      id: "doc-3",
      mdxString: "Body",
      metadata: {
        role: "Unknown Role",
        tags: ["opt_1", "custom_tag"],
      },
    };

    const result = buildMdxWithSchema(doc, schema, "Title", "slug");
    expect(result).toContain("role: Unknown Role");
    expect(result).toContain("tags:\n  - Engineer\n  - custom_tag");
  });
});
