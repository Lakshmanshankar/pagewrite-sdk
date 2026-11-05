import fs from "node:fs/promises";
import type { AstroIntegration } from "astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { stageSiteContent } from "./client.js";
import { resolveToken } from "./token.js";
import type { RemoteMdxLogger, RemoteMdxOptions } from "./types.js";

export type {
  FileDocument,
  PageMapNode,
  PageTreeFileNode,
  PageTreeFolderNode,
  PageTreeNode,
  RemoteMdxOptions,
  SchemaField,
  SchemaFieldOption,
  SitePages,
  SiteSchema,
  StagedSiteContent,
  StaticTreeChild,
} from "./types.js";

export {
  DEFAULT_PAGE_SIZE,
  PAGINATED_FILE_DOCUMENTS_ENDPOINT,
  STATIC_FILE_TREE_ENDPOINT,
  SITE_SCHEMAS_ENDPOINT,
  fetchAllFileDocuments,
  fetchStaticFileTree,
  stageSiteContent,
} from "./client.js";
export { resolveToken } from "./token.js";
export { buildMdxWithSchema, lookupOptionValue, resolveFolderSchemaId } from "./frontmatter.js";
export {
  flattenFileNodes,
  flattenFolderFileChildren,
  generateFolderMap,
  generatePageMap,
  generatePageTree,
  safeRelativePath,
  toSegment,
  toSlug,
  upsertFrontmatter,
} from "./utils.js";

export type {
  Contacts,
  CssSettings,
  FlatFileNode,
  Folder,
  FolderMap,
  Footer,
  FooterLink,
  Link,
  NavLink,
  Navbar,
  PageData,
  PageLink,
  PageLinks,
  PageTree,
  PageTreeItem,
  SiteLogo,
  SiteSchemaDefinition,
  SiteSettings,
} from "./schemas.js";

export {
  contactsSchema,
  cssSettingsSchema,
  flatFileNodeSchema,
  folderMapSchema,
  folderSchema,
  footerLinkSchema,
  footerSchema,
  linkSchema,
  navLinkSchema,
  navbarSchema,
  pageDataSchema,
  pageLinkSchema,
  pageLinksSchema,
  pageNodeSchema,
  pageTreeSchema,
  schemaFieldOptionSchema,
  schemaFieldSchema,
  siteLogoSchema,
  siteSchemaSchema,
  siteSettingsSchema,
} from "./schemas.js";

export {
  collections,
  createCollections,
  folderMap,
  folders,
  links,
  pageData,
  pageLinks,
  pageNodes,
  pageTree,
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
  schemas,
  siteSchema,
  siteSettings,
} from "./collections.js";

export default function pagewriteAstro(options: RemoteMdxOptions): AstroIntegration {
  return remoteMdx(options);
}

export function remoteMdx(options: RemoteMdxOptions): AstroIntegration {
  return {
    name: "pagewrite-astro",
    hooks: {
      "astro:config:setup": async ({ config, command, logger }) => {
        if (options.disabled) {
          logger.info("Pagewrite integration is disabled. Skipping content sync.");
          return;
        }

        const integrationLogger = createLogger(logger);
        const root = fileURLToPath(config.root);
        const env = loadEnv(command === "dev" ? "development" : "production", root, "");
        const token = resolveToken(options, env);
        const outputDir = path.resolve(root, options.outputDir ?? "src/content/docs");

        if (options.clean ?? false) {
          logger.info(`Cleaning Pagewrite content directory: ${outputDir}`);
          await fs.rm(outputDir, { recursive: true, force: true });
        }

        logger.info("Fetching Pagewrite site content");

        const result = await stageSiteContent(options.siteId, token, outputDir, {
          logger: integrationLogger,
        });

        logger.info(`Pagewrite content sync complete: ${result.files.length} file(s) written`);
      },
    },
  };
}

function createLogger(logger: {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}): RemoteMdxLogger {
  return {
    info: (message) => logger.info(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message),
  };
}
