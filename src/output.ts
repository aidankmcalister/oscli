import * as readline from "node:readline";
import { activeTheme as theme } from "./theme";

let railEnabled = false;

function normalizeLine(line: string): string {
  return line.startsWith(theme.layout.indent)
    ? line.slice(theme.layout.indent.length)
    : line;
}

export function setRailEnabled(enabled: boolean): void {
  railEnabled = enabled;
}

export function decorateLine(line: string): string {
  if (!railEnabled) {
    return line;
  }

  const content = normalizeLine(line);

  if (theme.symbols.pipe.length === 0) {
    return `${theme.layout.indent}${content}`;
  }

  return `${theme.color.border(theme.symbols.pipe)}  ${content}`;
}

export function writeLine(line: string, stream: "stdout" | "stderr" = "stdout"): void {
  const target = stream === "stdout" ? process.stdout : process.stderr;
  target.write(`${decorateLine(line)}\n`);
}

export function writeSectionLine(
  line: string,
  stream: "stdout" | "stderr" = "stdout",
): void {
  writeLine(line, stream);
  writeSectionGap(stream);
}

export function writeLines(
  value: string,
  stream: "stdout" | "stderr" = "stdout",
): void {
  for (const line of value.split("\n")) {
    writeLine(line, stream);
  }
}

export function writeSectionLines(
  value: string,
  stream: "stdout" | "stderr" = "stdout",
): void {
  writeLines(value, stream);
  writeSectionGap(stream);
}

export function writeSectionGap(
  stream: "stdout" | "stderr" = "stdout",
): void {
  for (let index = 0; index < theme.layout.spacing; index += 1) {
    writeLine("", stream);
  }
}

export function writeLiveLine(line: string): void {
  const decorated = decorateLine(line);

  if (!process.stdout.isTTY) {
    process.stdout.write(`${decorated}\n`);
    return;
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(decorated);
}

export function finalizeLiveLine(line: string): void {
  writeLiveLine(line);
  if (process.stdout.isTTY) {
    process.stdout.write("\n");
  }
  writeSectionGap();
}
