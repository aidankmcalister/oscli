type Cell = string | number | boolean | null | undefined;

export function table(headers: string[], rows: Cell[][]): string {
  const normalizedRows = rows.map((row) =>
    row.map((cell) => (cell == null ? "" : String(cell))),
  );

  const columnCount = headers.length;
  const widths = Array.from({ length: columnCount }, (_, col) => {
    const headerWidth = headers[col]?.length ?? 0;
    const rowWidth = Math.max(
      0,
      ...normalizedRows.map((row) => (row[col] ?? "").length),
    );
    return Math.max(headerWidth, rowWidth);
  });

  const makeBorder = (left: string, mid: string, right: string) =>
    `${left}${widths.map((w) => "─".repeat(w + 2)).join(mid)}${right}`;

  const formatRow = (cells: string[]) => {
    const padded = cells.map((cell, col) => cell.padEnd(widths[col] ?? 0));
    return `│ ${padded.join(" │ ")} │`;
  };

  const top = makeBorder("┌", "┬", "┐");
  const header = formatRow(headers);
  const divider = makeBorder("├", "┼", "┤");
  const data = normalizedRows.map((row) =>
    formatRow(Array.from({ length: columnCount }, (_, i) => row[i] ?? "")),
  );
  const bottom = makeBorder("└", "┴", "┘");

  return [top, header, divider, ...data, bottom].join("\n");
}
