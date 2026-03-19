import * as pc from "picocolors";
import {
  activeNoColor,
  activeTheme as theme,
  colorFormatters,
  type ColorName,
  stripAnsi,
} from "./theme";

let railEnabled = false;
let hasPersistentCorner = false;
let outputSuppressed = false;
let liveBlockHeight = 0;

const ANSI_SEQUENCE = /^\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/;
const LIVE_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

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

function splitVisiblePrefix(value: string, visibleChars: number): [string, string] {
  let index = 0;
  let remaining = visibleChars;

  while (index < value.length && remaining > 0) {
    const ansi = value.slice(index).match(ANSI_SEQUENCE);
    if (ansi) {
      index += ansi[0].length;
      continue;
    }

    index += 1;
    remaining -= 1;
  }

  while (index < value.length) {
    const ansi = value.slice(index).match(ANSI_SEQUENCE);
    if (!ansi) {
      break;
    }

    index += ansi[0].length;
  }

  return [value.slice(0, index), value.slice(index)];
}

function railIconCandidates(): string[] {
  return [
    theme.symbols.cursor,
    theme.symbols.radio_on,
    theme.symbols.radio_off,
    theme.symbols.check_on,
    theme.symbols.check_off,
    theme.symbols.success,
    theme.symbols.error,
    theme.symbols.warning,
    theme.symbols.info,
    theme.symbols.step_active,
    theme.symbols.step_done,
    theme.symbols.step_pending,
    ...LIVE_SPINNER_FRAMES,
  ].filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function decorateRailIcon(content: string): string | null {
  if (theme.layout.sidebarIcons !== "inside") {
    return null;
  }

  const plain = stripAnsi(content);
  const match = railIconCandidates()
    .sort((left, right) => right.length - left.length)
    .find((candidate) => plain.startsWith(`${candidate} `));

  if (!match) {
    return null;
  }

  const [renderedIcon, rest] = splitVisiblePrefix(content, match.length);
  return `${renderedIcon}  ${rest.startsWith(" ") ? rest.slice(1) : rest}`;
}

export function decorateLine(line: string): string {
  if (!railEnabled) {
    return line;
  }

  const content = normalizeLine(line);

  if (theme.symbols.pipe.length === 0) {
    return content;
  }

  const insideRail = decorateRailIcon(content);
  if (insideRail) {
    return insideRail;
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
  if (liveBlockHeight > 0) {
    writeStdoutAnsi(`\u001b[${liveBlockHeight}A\r\u001b[J`);
    liveBlockHeight = 0;
    hasPersistentCorner = false;
    return;
  }

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

  if (stream === "stdout" && liveBlockHeight > 0) {
    clearPersistentCorner();
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

  if (canRenderPersistentCorner("stdout")) {
    getStdout().write(`${formatted}\n${theme.color.border(theme.symbols.outro)}\n`);
    liveBlockHeight = 2;
    hasPersistentCorner = false;
    return;
  }

  getStdout().write(`${formatted}\n`);
  liveBlockHeight = 1;
}

export function finalizeLiveLine(line: string): void {
  if (outputSuppressed) {
    return;
  }

  clearPersistentCorner();
  writeSectionLine(line);
}
