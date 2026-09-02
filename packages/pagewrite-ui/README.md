# pagewrite-ui

`pagewrite-ui` is a comprehensive suite of UI components, MDX elements, and typography utilities built for Astro. It provides everything you need to build stunning documentation sites.

## Installation

You can install the package using your favorite package manager:

```bash
# Using npm
npm install pagewrite-ui

# Using pnpm
pnpm add pagewrite-ui

# Using yarn
yarn add pagewrite-ui
```

## How to Import

The package is designed with folder-level exports to keep your imports clean and organized.

You can import components from the root:

```astro
---
import { Header, Card, Callout } from "pagewrite-ui";
---
```

Or you can import them from their specific subpaths:

```astro
---
// Layout and Docs
import { Header, Footer, TableOfContent } from "pagewrite-ui/docs";

// General Components
import { Card, ContextMenu, Scripts } from "pagewrite-ui/components";

// MDX Custom Components
import { Callout, Image, Spacer } from "pagewrite-ui/mdx";

// SVG Icons
import { ChatGPT, Claude, Gemini, Github } from "pagewrite-ui/icons";
---
```

## CSS Setup

To use the `pagewrite-ui` styles with Tailwind CSS v4, simply import the required CSS in your main global stylesheet.

```css
@import "tailwindcss";

/* 1. Import dynamic values generated per-site */
@import "pagewrite-ui/styles/theme.css";
@import "pagewrite-ui/styles/typography.css";

/* 2. Import the static mappings to connect them to Tailwind */
@import "pagewrite-ui/styles/tailwind-theme.css";
```

For detailed component documentation and their props, please see the [Usage Guide](USAGE.md).
