import { activeTheme as theme } from "../theme";

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  value: string;
};

function buildTable(before: string[], after: string[]): number[][] {
  const rows = before.length + 1;
  const cols = after.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = before.length - 1; row >= 0; row -= 1) {
    for (let col = after.length - 1; col >= 0; col -= 1) {
      table[row][col] =
        before[row] === after[col]
          ? table[row + 1][col + 1] + 1
          : Math.max(table[row + 1][col], table[row][col + 1]);
    }
  }

  return table;
}

function diffLines(before: string[], after: string[]): DiffLine[] {
  const table = buildTable(before, after);
  const lines: DiffLine[] = [];
  let row = 0;
  let col = 0;

  while (row < before.length && col < after.length) {
    if (before[row] === after[col]) {
      lines.push({ type: "unchanged", value: before[row] ?? "" });
      row += 1;
      col += 1;
      continue;
    }

    if (table[row + 1][col] >= table[row][col + 1]) {
      lines.push({ type: "removed", value: before[row] ?? "" });
      row += 1;
      continue;
    }

    lines.push({ type: "added", value: after[col] ?? "" });
    col += 1;
  }

  while (row < before.length) {
    lines.push({ type: "removed", value: before[row] ?? "" });
    row += 1;
  }

  while (col < after.length) {
    lines.push({ type: "added", value: after[col] ?? "" });
    col += 1;
  }

  return lines;
}

export function diff(before: string, after: string): string {
  return diffLines(before.split("\n"), after.split("\n"))
    .map((line) => {
      if (line.type === "added") {
        return `${theme.color.success("+")} ${theme.color.success(line.value)}`;
      }

      if (line.type === "removed") {
        return `${theme.color.error("-")} ${theme.color.error(line.value)}`;
      }

      return `${theme.color.dim("  " + line.value)}`;
    })
    .join("\n");
}
