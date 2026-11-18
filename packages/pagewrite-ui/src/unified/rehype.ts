const COL_WIDTHS_REGEX = /col-widths:\s*([0-9a-zA-Z%.,\s-]+?)(?:\s*-->|\s*\*\/|$)/i;

function appendStyle(properties: Record<string, any>, newStyles: string) {
  const existing = properties.style;
  if (!existing) {
    properties.style = newStyles;
  } else if (typeof existing === "string") {
    const trimmed = existing.trim().replace(/;$/, "");
    properties.style = `${trimmed}; ${newStyles}`;
  }
}

/**
 * Rehype plugin to extract `<!-- col-widths: 135,147,200 -->` comments
 * immediately preceding a <table> and attach column widths via:
 * 1. `data-col-widths` attribute on <table>
 * 2. <colgroup> with <col style="width: ...; min-width: ...;">
 * 3. Inline style with `width` and `min-width` on <th> and <td> cells
 */
export function rehypeTableWidths() {
  return (tree: any) => {
    function visitNode(node: any) {
      if (!node || !node.children || !Array.isArray(node.children)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        let commentText: string | null = null;

        // Check if direct child is a comment / raw / mdx expression node
        if (
          child.type === "raw" ||
          child.type === "comment" ||
          child.type === "mdxFlowExpression"
        ) {
          commentText = child.value;
        } else if (
          child.type === "element" &&
          child.tagName === "p" &&
          Array.isArray(child.children)
        ) {
          // Check if comment was wrapped in a <p>
          const nonWhitespace = child.children.filter(
            (c: any) => !(c.type === "text" && /^\s*$/.test(c.value))
          );
          if (
            nonWhitespace.length === 1 &&
            (nonWhitespace[0].type === "raw" ||
              nonWhitespace[0].type === "comment" ||
              nonWhitespace[0].type === "mdxFlowExpression")
          ) {
            commentText = nonWhitespace[0].value;
          }
        }

        if (commentText) {
          const match = commentText.match(COL_WIDTHS_REGEX);
          if (match) {
            const rawWidths = match[1]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const widths = rawWidths.map((w) => (/^\d+(\.\d+)?$/.test(w) ? `${w}px` : w));

            // Look ahead for the next element (must be a <table>)
            let tableIndex = -1;
            for (let j = i + 1; j < node.children.length; j++) {
              const next = node.children[j];
              if (next.type === "element" && next.tagName === "table") {
                tableIndex = j;
                break;
              }
              // Skip text nodes that only contain whitespace
              if (next.type === "text" && /^\s*$/.test(next.value)) {
                continue;
              }
              // If anything else appears before the table, stop lookahead
              break;
            }

            if (tableIndex !== -1) {
              const table = node.children[tableIndex];
              table.properties = table.properties || {};
              table.properties["data-col-widths"] = rawWidths.join(",");

              // Create <colgroup> with <col> elements
              const colgroup = {
                type: "element",
                tagName: "colgroup",
                properties: {},
                children: widths.map((w) => ({
                  type: "element",
                  tagName: "col",
                  properties: {
                    style: `width: ${w}; min-width: ${w};`,
                    width: w.endsWith("px") ? w.replace("px", "") : undefined,
                  },
                  children: [],
                })),
              };

              // Insert <colgroup> at the beginning of <table> (before thead/tbody)
              table.children = table.children || [];
              const firstElemIndex = table.children.findIndex((c: any) => c.type === "element");
              if (firstElemIndex !== -1) {
                table.children.splice(firstElemIndex, 0, colgroup);
              } else {
                table.children.unshift(colgroup);
              }

              // Apply width and min-width to all <th> and <td> cells
              function applyToRows(section: any) {
                if (!section.children || !Array.isArray(section.children)) return;
                for (const tr of section.children) {
                  if (tr.type === "element" && tr.tagName === "tr") {
                    let colIdx = 0;
                    for (const cell of tr.children || []) {
                      if (
                        cell.type === "element" &&
                        (cell.tagName === "th" || cell.tagName === "td")
                      ) {
                        const span = parseInt(
                          cell.properties?.colSpan || cell.properties?.colspan || 1,
                          10
                        );
                        if (colIdx < widths.length) {
                          const w = widths[colIdx];
                          cell.properties = cell.properties || {};
                          appendStyle(cell.properties, `width: ${w}; min-width: ${w};`);
                        }
                        colIdx += span;
                      }
                    }
                  }
                }
              }

              for (const section of table.children) {
                if (
                  section.type === "element" &&
                  (section.tagName === "thead" ||
                    section.tagName === "tbody" ||
                    section.tagName === "tfoot")
                ) {
                  applyToRows(section);
                } else if (section.type === "element" && section.tagName === "tr") {
                  // Table rows direct children of table
                  applyToRows({ children: [section] });
                }
              }

              // Remove the comment node from AST so it does not render
              node.children.splice(i, 1);
              i--; // Adjust index after removal
            }
          }
        }

        visitNode(child);
      }
    }

    visitNode(tree);
  };
}

export default rehypeTableWidths;
