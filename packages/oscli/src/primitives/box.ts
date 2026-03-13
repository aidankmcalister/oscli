import {
  activeTheme as theme,
  stripSharedIndent,
  visibleLength,
} from "../theme";
import { stdoutColumns, stdoutIsTTY } from "../output";

export type BoxOptions = {
  title?: string;
  content: string;
};

function renderLegacyBox(options: BoxOptions): string {
  const { title, content } = options;
  const lines = content.split("\n");
  const contentWidth = Math.max(0, ...lines.map((line) => line.length));

  const topCore = title ? ` ${title} ` : "";
  const topFill = Math.max(0, contentWidth + 2 - topCore.length);
  const top = `┌${topCore}${"─".repeat(topFill)}┐`;

  const body = lines.map((line) => `│ ${line.padEnd(contentWidth)} │`);
  const bottom = `└${"─".repeat(contentWidth + 2)}┘`;

  return [top, ...body, bottom].join("\n");
}

export function box(options: BoxOptions): string {
  if (!stdoutIsTTY()) {
    return renderLegacyBox(options);
  }

  const { title, content } = options;
  const lines = stripSharedIndent(content.split("\n"));
  const maxContentWidth = Math.max(
    0,
    ...lines.map((line) => visibleLength(line)),
  );
  const maxBoxWidth = Math.max(
    32,
    stdoutColumns(120) - 6,
  );
  const contentWidth = Math.max(
    26,
    Math.min(maxContentWidth, maxBoxWidth - 6),
  );
  const railWidth = contentWidth + 4;

  let topCore = "";
  if (title) {
    const maxTitleWidth = Math.max(0, railWidth - 3);
    const safeTitle =
      title.length <= maxTitleWidth
        ? title
        : `${title.slice(0, Math.max(0, maxTitleWidth - 1))}…`;
    topCore = `${theme.color.border("─ ")}${theme.color.title(safeTitle)}${theme.color.border(" ")}`;
  }

  const topFill = Math.max(0, railWidth - visibleLength(topCore));
  const top = `${theme.layout.indent}${theme.color.border("┌")}${topCore}${theme.color.border("─".repeat(topFill))}${theme.color.border("┐")}`;

  const body = lines.map((line) => {
    const padded = `${line}${" ".repeat(Math.max(0, contentWidth - visibleLength(line)))}`;
    return `${theme.layout.indent}${theme.color.border("│")}  ${padded}  ${theme.color.border("│")}`;
  });

  const bottom = `${theme.layout.indent}${theme.color.border("└")}${theme.color.border("─".repeat(railWidth))}${theme.color.border("┘")}`;

  return [top, ...body, bottom].join("\n");
}
