# Pagewrite Content CLI

`pagewrite-astro` fetches Pagewrite CMS content without running an Astro build. Use it in CI, predeploy steps, or local checks when you want MDX files written into an Astro content directory ahead of time.

## Installation

The CLI is included with `pagewrite-astro`:

```bash
pnpm add pagewrite-astro
```

After installation, run it through your package manager:

```bash
pnpm pagewrite-astro --help
```

## Authentication

Pass the build token directly using the `--token` option:

```bash
pagewrite-astro fetch --site-id your-site-id --token rmx_live_xxxxxxxxxxxx
```

## Usage

```bash
pagewrite-astro fetch --site-id <siteId> [options]
```

The `fetch` command stages the site content by fetching the static file tree and paginated file documents, adding `title` and `slug` frontmatter, and writing `.mdx` files to the output directory.

```bash
pagewrite-astro fetch --site-id your-site-id --out src/content/docs
```

## Options

| Option                  | Default            | Description                                               |
| ----------------------- | ------------------ | --------------------------------------------------------- |
| `--site-id <id>`        | required           | Pagewrite site id to fetch.                               |
| `--out <dir>`           | `src/content/docs` | Output directory for generated MDX files.                 |
| `--output-dir <dir>`    | `src/content/docs` | Alias for `--out`.                                        |
| `--token <token>`       | required           | Build token value.                                        |
| `--clean`               | `false`            | Remove the output directory before writing files.         |
| `--dry-run`             | `false`            | Fetch and validate content, then remove temporary output. |
| `--page-size <number>`  | `100`              | File document page size.                                  |
| `--timeout-ms <number>` | `30000`            | Request timeout in milliseconds.                          |
| `-h`, `--help`          | none               | Show CLI help.                                            |

## Examples

Fetch content into the default Astro content directory:

```bash
pagewrite-astro fetch --site-id your-site-id
```

Fetch into a custom collection directory:

```bash
pagewrite-astro fetch --site-id your-site-id --out src/content/blog
```

Clean the target directory before writing fresh content:

```bash
pagewrite-astro fetch --site-id your-site-id --out src/content/docs --clean
```

Validate remote content without keeping files on disk:

```bash
pagewrite-astro fetch --site-id your-site-id --dry-run
```

## CI Integration

Run the CLI before your framework build:

```json
{
  "scripts": {
    "content:fetch": "pagewrite-astro fetch --site-id $PAGEWRITE_SITE_ID --token $PAGEWRITE_BUILD_TOKEN --out src/content/docs --clean",
    "prebuild": "pnpm content:fetch",
    "build": "astro build"
  }
}
```

Make sure `PAGEWRITE_BUILD_TOKEN` and `PAGEWRITE_SITE_ID` are configured as CI secrets or environment variables.

## Notes

- Build tokens should be read-only and scoped to fetch site content.
- `--clean` is ignored during `--dry-run`; dry runs write to a temporary directory and remove it afterward.
- Unsafe absolute paths and path traversal entries from the remote file tree are rejected before files are written.
