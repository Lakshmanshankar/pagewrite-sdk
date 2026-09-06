# Usage Guide

This guide details all the components exported by `pagewrite-ui` and the props they accept. Components are grouped by their folder sections.

## 1. Docs Components (`pagewrite-ui/docs`)

These components are typically used in the overall documentation layout.

### `Header`

Used as the SEO `<head>` element for your document, injecting metadata, robots tags, and Open Graph content.

| Prop           | Type                 | Default           | Description                                                                   |
| :------------- | :------------------- | :---------------- | :---------------------------------------------------------------------------- |
| `title`        | `string`             | `"Default Title"` | Primary title of the page.                                                    |
| `description`  | `string`             | `-`               | Meta description.                                                             |
| `keywords`     | `string \| string[]` | `-`               | Keywords for SEO. Arrays are automatically joined.                            |
| `image`        | `string`             | `-`               | Open Graph/Twitter image URL. Automatically resolves relative to `Astro.url`. |
| `canonicalURL` | `URL \| string`      | `-`               | Canonical link for SEO.                                                       |
| `noindex`      | `boolean`            | `false`           | Set to `true` to disable indexing by search engines.                          |
| `nofollow`     | `boolean`            | `false`           | Set to `true` to disable search engines following links.                      |
| `type`         | `string`             | `"website"`       | Open Graph type.                                                              |

### `Footer`

A standard footer component for documentation layouts.

| Prop          | Type                                     | Default                | Description                                                                                                                                       |
| :------------ | :--------------------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `logo`        | `object`                                 | `-`                    | Contains `light` (string), `dark` (string, optional), and `alt` (string, optional) for the logo image. Falls back to `siteTitle` text if omitted. |
| `siteTitle`   | `string`                                 | `"Site Logo"`          | The name of the site.                                                                                                                             |
| `description` | `string`                                 | `-`                    | Short description shown under the logo.                                                                                                           |
| `copyright`   | `string`                                 | `"Your Company, Inc."` | Copyright notice string.                                                                                                                          |
| `links`       | `Array<{ label: string, href: string }>` | `[]`                   | Standard navigation links.                                                                                                                        |
| `legalLinks`  | `Array<{ label: string, href: string }>` | `[]`                   | Legal links like Privacy or Terms.                                                                                                                |

### `TableOfContent`

Generates a sticky Table of Contents sidebar for your documentation pages.

| Prop       | Type    | Default | Description                                                          |
| :--------- | :------ | :------ | :------------------------------------------------------------------- |
| `headings` | `Array` | `-`     | Array of Astro heading objects (containing `depth`, `slug`, `text`). |

### `Search`

A component used to provide search functionality for the documentation.

---

## 2. General Components (`pagewrite-ui/components`)

Core structural and interactive UI components.

### `Card`

A generic card component for highlighting items.

| Prop    | Type     | Default | Description                               |
| :------ | :------- | :------ | :---------------------------------------- |
| `title` | `string` | `-`     | The card heading.                         |
| `href`  | `string` | `-`     | An optional link to wrap around the card. |

### `ContextMenu`

An interactive AI actions menu providing one-click options to copy markdown or open the current markdown file in ChatGPT, Claude, or Gemini.

### `Scripts`

Theme initializer script for handling light and dark modes securely without flashing.

| Usage         | Description                                             |
| :------------ | :------------------------------------------------------ |
| `<Scripts />` | Simply drop inside the `<head>` of your Astro document. |

---

## 3. MDX Components (`pagewrite-ui/mdx`)

Components specifically designed to be passed into Astro's MDX renderer to augment standard markdown.

### `Callout`

Highlights a block of content with distinct visual styling.

| Prop    | Type                                          | Default | Description                    |
| :------ | :-------------------------------------------- | :------ | :----------------------------- |
| `type`  | `"info" \| "warning" \| "success" \| "error"` | `-`     | The theme of the callout.      |
| `title` | `string`                                      | `-`     | Heading for the callout block. |

### `Image`

Optimized image component that replaces standard markdown images to include styling and captions.

| Prop      | Type     | Default      | Description                                |
| :-------- | :------- | :----------- | :----------------------------------------- |
| `src`     | `string` | _(required)_ | Image source URL.                          |
| `alt`     | `string` | _(required)_ | Accessibility text.                        |
| `caption` | `string` | `-`          | A text caption rendered beneath the image. |

### `Spacer`

Utility component to add vertical spacing within MDX content.

| Prop   | Type               | Default | Description             |
| :----- | :----------------- | :------ | :---------------------- |
| `size` | `number \| string` | `-`     | Amount of space to add. |

---

## 4. Icons (`pagewrite-ui/icons`)

A collection of lightweight SVG icon components.

| Property            | Details                                                                                                                                                                     |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Available Icons** | `ArrowTopRight`, `BlueSky`, `ChatGPT`, `ChevronLeft`, `ChevronRight`, `Claude`, `Gemini`, `Github`, `Leetcode`, `LinkedIn`, `Markdown`, `Medium`, `Twitter_X`               |
| **Props**           | They generally accept any standard HTML/SVG attributes such as a `class` _(string)_ prop for Tailwind styling and sizing (e.g. `<Github class="w-5 h-5 text-gray-500" />`). |
