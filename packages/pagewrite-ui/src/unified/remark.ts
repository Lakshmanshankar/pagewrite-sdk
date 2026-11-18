import remarkComment from "@slorber/remark-comment";

/**
 * Remark plugin to ensure HTML comments in MDX are preserved in the AST
 * so rehype plugins (like rehypeTableWidths) can inspect and process them.
 */
export function remarkPreserveComments() {
  return (tree: any) => {
    function walk(node: any) {
      if (!node || !node.children) return;
      for (const child of node.children) {
        if (child.type === "comment") {
          child.type = "html";
          child.value = `<!--${child.commentValue}-->`;
        }
        walk(child);
      }
    }
    walk(tree);
  };
}

/**
 * Combined remark plugins to support HTML comments (<!-- ... -->) in MDX
 */
export const remarkTableWidths = [[remarkComment, { ast: true }], remarkPreserveComments];

export default remarkTableWidths;
