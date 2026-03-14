import { activeTheme as theme } from "../theme";

export interface TreeNode {
  [key: string]: TreeNode | null;
}

function renderEntries(
  node: TreeNode,
  prefix = "",
): string[] {
  const entries = Object.entries(node);

  return entries.flatMap(([name, value], index) => {
    const last = index === entries.length - 1;
    const branch = last ? "└─" : "├─";
    const nextPrefix = `${prefix}${last ? "   " : `${theme.color.border("│")}  `}`;
    const line = `${theme.color.border(branch)} ${
      value === null ? theme.color.value(name) : theme.color.label(name)
    }`;

    if (value === null) {
      return [`${prefix}${line}`];
    }

    return [`${prefix}${line}`, ...renderEntries(value, nextPrefix)];
  });
}

export function tree(data: TreeNode): string {
  return renderEntries(data).join("\n");
}
