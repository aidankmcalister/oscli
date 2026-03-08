import * as readline from "node:readline";
import { activeNoColor, activeTheme as theme, stripAnsi } from "./theme";

let railEnabled = false;

function normalizeLine(line: string): string {
  return line.startsWith(theme.layout.indent)
    ? line.slice(theme.layout.indent.length)
    : line;
}

export function setRailEnabled(enabled: boolean): void {
  railEnabled = enabled;
}

export function isRailEnabled(): boolean {
  return railEnabled;
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
  const decorated = decorateLine(line);
  const formatted =
    activeNoColor || target.isTTY !== true ? stripAnsi(decorated) : decorated;
  target.write(`${formatted}\n`);
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
  const formatted =
    activeNoColor || process.stdout.isTTY !== true
      ? stripAnsi(decorated)
      : decorated;

  if (!process.stdout.isTTY) {
    process.stdout.write(`${formatted}\n`);
    return;
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(formatted);
}

export function finalizeLiveLine(line: string): void {
  writeLiveLine(line);
  if (process.stdout.isTTY) {
    process.stdout.write("\n");
  }
  writeSectionGap();
}
