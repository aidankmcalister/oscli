export type BoxOptions = {
  title?: string;
  content: string;
};

export function box(options: BoxOptions): string {
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
