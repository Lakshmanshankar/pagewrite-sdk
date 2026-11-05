import { z } from "astro/zod";

/**
 * Contacts schema & type
 * Supports either an object map of contact platform to URL/handle,
 * or an array of key-value records.
 */
export const contactsSchema = z.union([z.record(z.string()), z.array(z.record(z.string()))]);
export type Contacts = z.infer<typeof contactsSchema>;

/**
 * Shared Logo schema & type
 */
export const siteLogoSchema = z.object({
  light: z.string(),
  dark: z.string().optional(),
  alt: z.string().optional(),
});
export type SiteLogo = z.infer<typeof siteLogoSchema>;

/**
 * Navbar link schema & type
 */
export const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});
export type NavLink = z.infer<typeof navLinkSchema>;

/**
 * Navbar schema & type
 */
export const navbarSchema = z.object({
  title: z.string().optional(),
  logo: siteLogoSchema.optional(),
  links: z.array(navLinkSchema).optional(),
});
export type Navbar = z.infer<typeof navbarSchema>;

/**
 * Footer link schema & type
 */
export const footerLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});
export type FooterLink = z.infer<typeof footerLinkSchema>;

/**
 * Footer schema & type
 */
export const footerSchema = z.object({
  siteTitle: z.string().optional(),
  description: z.string().optional(),
  copyright: z.string().optional(),
  logo: siteLogoSchema.optional(),
  links: z.array(footerLinkSchema).optional(),
  legalLinks: z.array(footerLinkSchema).optional(),
});
export type Footer = z.infer<typeof footerSchema>;

/**
 * CSS settings schema & type
 * Can be a raw CSS string or an object of CSS variables/tokens.
 */
export const cssSettingsSchema = z.union([z.string(), z.record(z.string())]);
export type CssSettings = z.infer<typeof cssSettingsSchema>;

/**
 * Unified Site Settings schema & type
 * Stores siteName, contacts, navbar, footer, and CSS information.
 */
export const siteSettingsSchema = z.object({
  id: z.string().optional(),
  siteName: z.string().optional(),
  contacts: contactsSchema.optional().default({}),
  navbar: navbarSchema.optional(),
  footer: footerSchema.optional(),
  css: cssSettingsSchema.optional(),
  cssVariables: z.string().optional(),
  cssSettings: cssSettingsSchema.optional(),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

/**
 * Page Link schema & type
 * Built from links.json: maps pageId to slug path ({ id, slug }).
 */
export const pageLinksSchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
});
export type PageLink = z.infer<typeof pageLinksSchema>;
export type PageLinks = PageLink;

// Aliases for backward compatibility
export const linkSchema = pageLinksSchema;
export type Link = PageLink;
export const pageLinkSchema = pageLinksSchema;

/**
 * Flat File Node schema & type
 * Represents a flattened file child with depth relative to the folder.
 * depth: 1 for immediate files in the folder, 2 for nested files, etc.
 */
export const flatFileNodeSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    path: z.string().optional(),
    depth: z.number(),
    parentFolderId: z.string().optional(),
  })
  .passthrough();
export type FlatFileNode = z.infer<typeof flatFileNodeSchema>;

/**
 * Page Tree schema & type
 * Built from pageTree.json: siteTree containing id, title, slug, and recursive children.
 */
export type PageTree = {
  id: string;
  title: string;
  slug?: string;
  children?: PageTree[];
};
export type PageTreeItem = PageTree;

export const pageTreeSchema: z.ZodType<PageTree> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string().optional(),
    children: z.array(pageTreeSchema).optional(),
  })
);

// Aliases for backward compatibility
export const pageNodeSchema = pageTreeSchema;
export type PageNode = PageTree;
export const pageMapSchema = pageTreeSchema;
export type PageMap = PageTree;
export const folderSchema = pageTreeSchema;
export type Folder = PageTree;
export const folderMapSchema = pageTreeSchema;
export type FolderMap = PageTree;

/**
 * Page Data schema & type
 * Built from pageData.json: { [pageId]: metaData }.
 * Scoped to accept any metadata values per pageId.
 */
export const pageDataSchema = z.record(z.string(), z.any());
export type PageData = z.infer<typeof pageDataSchema>;

/**
 * Schema Field Option schema & type
 */
export const schemaFieldOptionSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().optional(),
    value: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();
export type SchemaFieldOption = z.infer<typeof schemaFieldOptionSchema>;

/**
 * Schema Field schema & type
 */
export const schemaFieldSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(schemaFieldOptionSchema).optional(),
  })
  .passthrough();
export type SchemaField = z.infer<typeof schemaFieldSchema>;

/**
 * Site Schema schema & type
 * Built from schema.json: defines the content schemas of the site as a map
 * [schemaId]: { ...details, fields: [fieldId]: { ...value } }.
 */
export const siteSchemaSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    fields: z
      .union([z.record(z.string(), schemaFieldSchema), z.array(schemaFieldSchema)])
      .optional()
      .default({}),
  })
  .passthrough();
export type SiteSchemaDefinition = z.infer<typeof siteSchemaSchema>;

