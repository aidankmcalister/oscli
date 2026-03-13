import * as pc from "picocolors";
import {
  activeNoColor,
  activeTheme as theme,
  colorFormatters,
  type ColorName,
  stripAnsi,
  visibleLength,
} from "./theme";

let railEnabled = false;
let lastLiveLineWidth = 0;
let hasPersistentCorner = false;
let outputSuppressed = false;

type OutputStreamLike = {
  isTTY?: boolean;
  columns?: number;
  write(value: string): unknown;
};

const noopStream: OutputStreamLike = {
  isTTY: false,
  write() {
    return true;
  },
};

function getStdout(): OutputStreamLike {
  if (typeof process !== "object" || process === null) {
    return noopStream;
  }

  return (process as { stdout?: OutputStreamLike }).stdout ?? noopStream;
}

function getStderr(): OutputStreamLike {
  if (typeof process !== "object" || process === null) {
    return noopStream;
  }

  return (process as { stderr?: OutputStreamLike }).stderr ?? noopStream;
}

export function stdoutIsTTY(): boolean {
  return getStdout().isTTY === true;
}

export function stdoutColumns(fallback = 80): number {
  return getStdout().columns ?? fallback;
}

function writeStdoutAnsi(value: string): void {
  getStdout().write(value);
}

export type LogLevel = "info" | "warn" | "error" | "success" | "plain";

export interface LogChain {
  bold(): LogChain;
  italic(): LogChain;
  underline(): LogChain;
  flush(): void;
  [Symbol.dispose](): void;
}

export interface StyleBuilder {
  color(name: ColorName): StyleBuilder;
  bold(): StyleBuilder;
  italic(): StyleBuilder;
  underline(): StyleBuilder;
  dim(): StyleBuilder;
  render(text: string): string;
}

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

export function setOutputSuppressed(suppressed: boolean): void {
  outputSuppressed = suppressed;
}

export function isOutputSuppressed(): boolean {
  return outputSuppressed;
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

function canRenderPersistentCorner(stream: "stdout" | "stderr"): boolean {
  return (
    stream === "stdout" &&
    !outputSuppressed &&
    railEnabled &&
    stdoutIsTTY() &&
    theme.symbols.outro.length > 0
  );
}

export function clearPersistentCorner(): void {
  if (!hasPersistentCorner || !stdoutIsTTY()) {
    return;
  }

  writeStdoutAnsi("\u001b[1A\u001b[2K\r");
  hasPersistentCorner = false;
}

function writePersistentCorner(stream: "stdout" | "stderr"): void {
  if (!canRenderPersistentCorner(stream)) {
    return;
  }

  getStdout().write(`${theme.color.border(theme.symbols.outro)}\n`);
  hasPersistentCorner = true;
}

export function writeLine(line: string, stream: "stdout" | "stderr" = "stdout"): void {
  if (outputSuppressed) {
    return;
  }

  if (stream === "stdout" && hasPersistentCorner) {
    clearPersistentCorner();
  }

  const target = stream === "stdout" ? getStdout() : getStderr();
  const decorated = decorateLine(line);
  const formatted =
    activeNoColor || target.isTTY !== true ? stripAnsi(decorated) : decorated;
  target.write(`${formatted}\n`);
  writePersistentCorner(stream);
}

export function createLogChain(
  _level: LogLevel,
  message: string,
  writeFn: (message: string) => void,
): LogChain {
  const modifiers: Array<(value: string) => string> = [];
  let flushed = false;

  const applyModifiers = (value: string): string => {
    if (activeNoColor || !stdoutIsTTY()) {
      return value;
    }

    return modifiers.reduce((current, modifier) => modifier(current), value);
  };

  const flush = () => {
    if (flushed) {
      return;
    }

    flushed = true;
    writeFn(applyModifiers(message));
  };

  const chain: LogChain = {
    bold() {
      modifiers.push(pc.bold);
      return chain;
    },
    italic() {
      modifiers.push(pc.italic);
      return chain;
    },
    underline() {
      modifiers.push(pc.underline);
      return chain;
    },
    flush,
    [Symbol.dispose]() {
      flush();
    },
  };

  queueMicrotask(flush);
  return chain;
}

export function createStyleBuilder(noColor: boolean): StyleBuilder {
  type Transform = {
    kind: "color" | "format";
    fn: (value: string) => string;
  };

  const transforms: Transform[] = [];

  const builder: StyleBuilder = {
    color(name: ColorName) {
      const next = transforms.filter((transform) => transform.kind !== "color");
      next.push({
        kind: "color",
        fn: colorFormatters[name],
      });
      transforms.splice(0, transforms.length, ...next);
      return builder;
    },
    bold() {
      transforms.push({ kind: "format", fn: pc.bold });
      return builder;
    },
    italic() {
      transforms.push({ kind: "format", fn: pc.italic });
      return builder;
    },
    underline() {
      transforms.push({ kind: "format", fn: pc.underline });
      return builder;
    },
    dim() {
      transforms.push({ kind: "format", fn: pc.dim });
      return builder;
    },
    render(text: string) {
      if (noColor) {
        return text;
      }

      return transforms.reduce((current, transform) => transform.fn(current), text);
    },
  };

  return builder;
}

export function renderLink(
  label: string,
  url: string,
  noColor: boolean,
  isTTY: boolean,
): string {
  if (noColor || !isTTY) {
    return `${label} (${url})`;
  }

  const renderedLabel = theme.color.active(label);
  return `\u001B]8;;${url}\u001B\\${renderedLabel}\u001B]8;;\u001B\\`;
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
  if (outputSuppressed) {
    return;
  }

  for (let index = 0; index < theme.layout.spacing; index += 1) {
    writeLine("", stream);
  }
}

export function writeLiveLine(line: string): void {
  if (outputSuppressed) {
    return;
  }

  clearPersistentCorner();

  const decorated = decorateLine(line);
  const formatted =
    activeNoColor || getStdout().isTTY !== true
      ? stripAnsi(decorated)
      : decorated;

  if (getStdout().isTTY !== true) {
    getStdout().write(`${formatted}\n`);
    return;
  }

  const width = visibleLength(formatted);
  const padding = " ".repeat(Math.max(0, lastLiveLineWidth - width));
  getStdout().write(`\r${formatted}${padding}`);
  lastLiveLineWidth = Math.max(lastLiveLineWidth, width);
}

export function finalizeLiveLine(line: string): void {
  if (outputSuppressed) {
    return;
  }

  writeLiveLine(line);
  if (getStdout().isTTY === true) {
    getStdout().write("\n");
    lastLiveLineWidth = 0;
  }
  writeSectionGap();
}
