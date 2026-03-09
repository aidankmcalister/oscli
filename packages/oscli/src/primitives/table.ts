import { activeTheme as theme } from "../theme";

type Cell = string | number | boolean | null | undefined;

function normalizeRows(rows: Cell[][]): string[][] {
  return rows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}

function renderLegacyTable(headers: string[], rows: string[][]): string {
  const columnCount = headers.length;
  const widths = Array.from({ length: columnCount }, (_, col) => {
    const headerWidth = headers[col]?.length ?? 0;
    const rowWidth = Math.max(0, ...rows.map((row) => (row[col] ?? "").length));
    return Math.max(headerWidth, rowWidth);
  });

  const makeBorder = (left: string, mid: string, right: string) =>
    `${left}${widths.map((width) => "─".repeat(width + 2)).join(mid)}${right}`;

  const formatRow = (cells: string[]) => {
    const padded = cells.map((cell, col) => cell.padEnd(widths[col] ?? 0));
    return `│ ${padded.join(" │ ")} │`;
  };

  const top = makeBorder("┌", "┬", "┐");
  const header = formatRow(headers);
  const divider = makeBorder("├", "┼", "┤");
  const data = rows.map((row) =>
    formatRow(Array.from({ length: columnCount }, (_, index) => row[index] ?? "")),
  );
  const bottom = makeBorder("└", "┴", "┘");

  return [top, header, divider, ...data, bottom].join("\n");
}

export function table(headers: string[], rows: Cell[][]): string {
  const normalizedRows = normalizeRows(rows);

  if (!process.stdout.isTTY) {
    return renderLegacyTable(headers, normalizedRows);
  }

  const columnCount = headers.length;
  const widths = Array.from({ length: columnCount }, (_, col) => {
    const headerWidth = headers[col]?.length ?? 0;
    const rowWidth = Math.max(
      0,
      ...normalizedRows.map((row) => (row[col] ?? "").length),
    );
    return Math.max(headerWidth, rowWidth);
  });

  const gap = "  ";
  const contentWidth =
    widths.reduce((total, width) => total + width, 0) + gap.length * Math.max(0, columnCount - 1);

  const header = `${theme.layout.indent}${headers
    .map((cell, index) => theme.color.title(cell.padEnd(widths[index] ?? 0)))
    .join(gap)}`;

  const divider = `${theme.layout.indent}${theme.color.border("─".repeat(contentWidth))}`;

  const data = normalizedRows.map((row) => {
    const padded = Array.from({ length: columnCount }, (_, index) =>
      (row[index] ?? "").padEnd(widths[index] ?? 0),
    );

    const styled = padded.map((cell, index) =>
      index === 0 ? theme.color.key(cell) : theme.color.value(cell),
    );

    return `${theme.layout.indent}${styled.join(gap)}`;
  });

  return [header, divider, ...data].join("\n");
}
