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
  SitePages,
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
export {
  flattenFileNodes,
  generatePageMap,
  safeRelativePath,
  toSegment,
  toSlug,
  upsertFrontmatter,
} from "./utils.js";

export default function pagewriteAstro(options: RemoteMdxOptions): AstroIntegration {
  return remoteMdx(options);
}

export function remoteMdx(options: RemoteMdxOptions): AstroIntegration {
  return {
    name: "pagewrite-astro",
    hooks: {
      "astro:config:setup": async ({ config, command, logger }) => {
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
