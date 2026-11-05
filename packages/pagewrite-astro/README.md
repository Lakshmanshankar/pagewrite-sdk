# pagewrite-astro

Astro integration for fetching Pagewrite CMS content at build time and writing it as MDX files into your Astro content directory.

This package is currently focused on the Astro fetch/write integration. The lower-level fetch and staging functions are exported so they can later be reused by another adapter, such as Next.js or Fumadocs.

## How It Works

```text
Pagewrite CMS                  User's Astro project
-------------                  --------------------
siteId, token           --->    pagewrite-astro config
                                  |
                                  v
                               astro build
                                  |
                                  v
                         fetch static file tree
                         fetch paginated file documents
                                  |
                                  v
                         src/content/docs/*.mdx
```

## Installation

```bash
pnpm add pagewrite-astro
```

## Setup

Configure the integration before content-related integrations in `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { pagewriteAstro } from "pagewrite-astro";

import { loadEnv } from "vite";
const env = loadEnv(process.env.NODE_ENV!, process.cwd(), "");

export default defineConfig({
  integrations: [
    pagewriteAstro({
      siteId: "your-site-id",
      token: env.PAGEWRITE_BUILD_TOKEN, // or Pagewrite build token
    }),
    mdx(),
  ],
});
```

## Options

| Option      | Type      | Default            | Description                                                                |
| ----------- | --------- | ------------------ | -------------------------------------------------------------------------- |
| `siteId`    | `string`  | required           | Pagewrite site to fetch and stage.                                         |
| `token`     | `string`  | required           | Build token value.                                                         |
| `outputDir` | `string`  | `src/content/docs` | Directory where MDX files are written, relative to the Astro project root. |
| `clean`     | `boolean` | `false`            | Remove `outputDir` before writing fetched files.                           |
| `verbose`   | `boolean` | `false`            | Reserved for more detailed sync logging.                                   |

## Examples

### Custom Output Directory

```js
pagewriteAstro({
  siteId: "your-site-id",
  outputDir: "src/content/blog",
});
```

### Clean Sync For CI

```js
pagewriteAstro({
  siteId: "your-site-id",
  clean: true,
});
```

## Content Collections (Astro 5+ Content Layer)

`pagewrite-astro` exposes typed Astro content collections defined once and re-exported for host apps:

- `pageLinks`: Built from `links.json` mapping each `pageId` (`id`) to its target `slug` (`{ id, slug }`).
- `pageData`: Built from `pageData.json` (`{ [pageId]: metaData }`), keyed by stable `id`, allowing arbitrary metadata.
- `pageTree`: Built from `pageTree.json` (`[{ id, title, slug, children }]`), containing the hierarchical tree of site folders and pages.
- `siteSettings`: Singleton (`id: 'site'`) containing `siteName`, `navbar`, `footer`, `contacts`, and `css` / `cssVariables`.
- `siteSchema`: Built from `schema.json`, defining content schemas, field configurations, and select/multi-select options.

### 1. Register Collections in Host App

Create or update `src/content.config.ts`:

```ts
import { collections } from "pagewrite-astro/collections";

export { collections };
```

To merge host app-specific collections alongside `pagewrite-astro` collections:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { collections as pagewriteCollections } from "pagewrite-astro/collections";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedAt: z.coerce.date().optional(),
  }),
});

export const collections = {
  ...pagewriteCollections,
  blog,
};
```

You can also import collections individually if you only need a subset:

```ts
import { siteSettings, pageLinks, pageTree, pageData, siteSchema } from "pagewrite-astro/collections";

export const collections = { siteSettings, pageLinks, pageTree, pageData, siteSchema };
```

### 2. Vite SSR Configuration

When `pagewrite-astro` is installed in `node_modules`, ensure Vite does not externalize it during server-side builds. Add `noExternal` in your `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: {
    ssr: {
      noExternal: ["pagewrite-astro"],
    },
  },
});
```

### 3. Usage in `.astro` Pages

Query collections using Astro's `getEntry` and `getCollection`:

```astro
---
import { getCollection, getEntry } from "astro:content";
import SiteNavbar from "../components/SiteNavbar.astro";
import SiteFooter from "../components/SiteFooter.astro";

// Singleton site settings
const siteEntry = await getEntry("siteSettings", "site");
const site = siteEntry?.data;

// Query collections
const pageLinks = await getCollection("pageLinks");
const pageTree = await getCollection("pageTree");
const pageData = await getCollection("pageData");
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{site?.siteName ?? site?.navbar?.title ?? "My Site"}</title>
  </head>
  <body>
    {site?.navbar && <SiteNavbar navbar={site.navbar} />}

    <main>
      <h1>Site Directory</h1>
      <ul>
        {
          pageLinks.map((link) => (
            <li>
              <a href={`/${link.data.slug.replace(/^\//, "")}`}>{link.id}</a>
            </li>
          ))
        }
      </ul>
    </main>

    {site?.footer && <SiteFooter footer={site.footer} />}
  </body>
</html>
```

### 4. Shared UI Components with Typed Props

Instead of calling `getCollection` or `getEntry` directly inside leaf UI components, pass typed data using the exported types from `pagewrite-astro/collections` (or `pagewrite-astro/schemas`):

```astro
---
// src/components/SiteNavbar.astro
import type { Navbar } from "pagewrite-astro/collections";

interface Props {
  navbar: Navbar;
}

const { navbar } = Astro.props;
---

<header class="navbar">
  {navbar.logo && <img src={navbar.logo.light} alt={navbar.logo.alt ?? navbar.title ?? "Logo"} />}
  {navbar.title && <span class="brand-title">{navbar.title}</span>}
  {
    navbar.links && (
      <nav>
        {navbar.links.map((link) => (
          <a href={link.href}>{link.label}</a>
        ))}
      </nav>
    )
  }
</header>
```

```astro
---
// src/components/SiteFooter.astro
import type { Footer } from "pagewrite-astro/collections";

interface Props {
  footer: Footer;
}

const { footer } = Astro.props;
---

<footer class="footer">
  {footer.siteTitle && <div class="title">{footer.siteTitle}</div>}
  {footer.description && <p class="description">{footer.description}</p>}
  {
    footer.links && (
      <div class="links">
        {footer.links.map((link) => (
          <a href={link.href}>{link.label}</a>
        ))}
      </div>
    )
  }
  {footer.copyright && <p class="copyright">&copy; {footer.copyright}</p>}
</footer>
```

### Type Generation Caveat

> [!NOTE]
> `astro:content` types (such as collection names and entry types for `getCollection` and `getEntry`) are generated per host application by Astro's Content Layer. Whenever you update your `content.config.ts`, run `astro sync` or start `astro dev` in your host application to generate the `.astro/types.d.ts` declarations.

## Ad-Hoc Fetching

You can fetch content outside the Astro build by running the CLI in a predeploy step, CI job, or local verification command:

```bash
pagewrite-astro fetch --site-id your-site-id --token rmx_live_xxxxxxxxxxxx --out src/content/docs
```

For CI, wire it before your framework build:

```json
{
  "scripts": {
    "content:fetch": "pagewrite-astro fetch --site-id $PAGEWRITE_SITE_ID --token $PAGEWRITE_BUILD_TOKEN --out src/content/docs --clean",
    "prebuild": "pnpm content:fetch",
    "build": "astro build"
  }
}
```

To verify the remote content without keeping files on disk, use dry run:

```bash
pagewrite-astro fetch --site-id your-site-id --token rmx_live_xxxxxxxxxxxx --dry-run
```

CLI options mirror the integration defaults: `--token`, `--clean`, `--page-size`, and `--timeout-ms` are available.

See [CLI.md](./CLI.md) for the full command reference and CI examples.

## Lower-Level API

The package also exports the reusable content staging primitives:

```ts
import { fetchStaticFileTree, fetchAllFileDocuments, stageSiteContent } from "pagewrite-astro";

await stageSiteContent("your-site-id", "rmx_live_xxxxxxxxxxxx", "./content/docs");
```

`stageSiteContent` fetches the static file tree and paginated file documents, converts file tree paths into safe MDX file paths, upserts `title` and `slug` frontmatter, and writes files to the target directory.

## Publishing

Package publishing is handled by GitHub Actions. Configure an `NPM_TOKEN` repository secret with permission to publish `pagewrite-astro`, then publish a GitHub release to run the npm publish workflow.

The workflow installs dependencies with pnpm, runs typecheck, tests, and build, then publishes to the npm registry with provenance enabled. It can also be started manually from the Actions tab with `workflow_dispatch`.

## Security Notes

- Never commit build tokens.
- Build tokens should be read-only and scoped to fetch site content.
- File tree paths are normalized and checked before writing.
- Missing tokens, API failures, invalid tree responses, and disk write errors fail the Astro build.
