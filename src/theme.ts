import * as pc from "picocolors";

export type ColorName =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray";

const defaultSymbols = {
  cursor: "›",
  radio_on: "●",
  radio_off: "○",
  check_on: "◉",
  check_off: "○",
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  intro_square: "┌",
  intro_rounded: "╭",
  outro_square: "└",
  outro_rounded: "╰",
  pipe: "│",
  intro: "┌",
  outro: "└",
  bar_fill: "#",
  bar_empty: "-",
} as const;

export type ThemeSymbols = {
  [K in keyof typeof defaultSymbols]: string;
};

type ThemeColorFns = {
  cursor: (s: string) => string;
  label: (s: string) => string;
  muted: (s: string) => string;
  dim: (s: string) => string;
  active: (s: string) => string;
  success: (s: string) => string;
  error: (s: string) => string;
  warning: (s: string) => string;
  info: (s: string) => string;
  value: (s: string) => string;
  key: (s: string) => string;
  title: (s: string) => string;
  border: (s: string) => string;
  timer: (s: string) => string;
  hint: (s: string) => string;
};

export type ResolvedTheme = {
  symbols: ThemeSymbols;
  color: ThemeColorFns;
  layout: {
    indent: string;
    boxMinWidth: number;
    progressWidth: number;
    spacing: 0 | 1 | 2;
  };
};

export interface ThemeOverride {
  cursor?: ColorName;
  active?: ColorName;
  success?: ColorName;
  error?: ColorName;
  warning?: ColorName;
  info?: ColorName;
  border?: ColorName;
  sidebar?: false | "square" | "rounded";
  symbols?: Partial<ThemeSymbols>;
  spacing?: 0 | 1 | 2;
}

const colorFormatters: Record<ColorName, (value: string) => string> = {
  black: pc.black,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  white: pc.white,
  gray: pc.gray,
};

function paint(value: string, formatter: (input: string) => string): string {
  return process.stdout.isTTY ? formatter(value) : value;
}

function byColorName(name: ColorName): (value: string) => string {
  return (value: string) => paint(value, colorFormatters[name]);
}

function createDefaultTheme(): ResolvedTheme {
  return {
    symbols: { ...defaultSymbols },
    color: {
      cursor: byColorName("magenta"),
      label: (s: string) => paint(s, (value) => pc.bold(pc.white(value))),
      muted: byColorName("gray"),
      dim: (s: string) => paint(s, pc.dim),
      active: byColorName("magenta"),
      success: byColorName("green"),
      error: byColorName("red"),
      warning: byColorName("yellow"),
      info: byColorName("blue"),
      value: byColorName("white"),
      key: byColorName("gray"),
      title: (s: string) => paint(s, (value) => pc.bold(pc.white(value))),
      border: (s: string) => paint(s, pc.dim),
      timer: byColorName("gray"),
      hint: (s: string) => paint(s, (value) => pc.dim(pc.italic(value))),
    },
    layout: {
      indent: "  ",
      boxMinWidth: 40,
      progressWidth: 20,
      spacing: 1,
    },
  };
}

export const theme: ResolvedTheme = createDefaultTheme();
export let activeTheme: ResolvedTheme = theme;

function resolveSidebarSymbols(
  symbols: ThemeSymbols,
  sidebar: ThemeOverride["sidebar"],
): ThemeSymbols {
  if (sidebar === "rounded") {
    return {
      ...symbols,
      intro: symbols.intro_rounded,
      outro: symbols.outro_rounded,
      pipe: symbols.pipe,
    };
  }

  if (sidebar === false) {
    return {
      ...symbols,
      intro: "",
      outro: "",
      pipe: "",
    };
  }

  return {
    ...symbols,
    intro: symbols.intro_square,
    outro: symbols.outro_square,
    pipe: symbols.pipe,
  };
}

export function applyTheme(override: ThemeOverride = {}): ResolvedTheme {
  const mergedSymbols = {
    ...theme.symbols,
    ...(override.symbols ?? {}),
  };

  const resolved: ResolvedTheme = {
    symbols: resolveSidebarSymbols(mergedSymbols, override.sidebar),
    color: {
      ...theme.color,
      ...(override.cursor ? { cursor: byColorName(override.cursor) } : {}),
      ...(override.active ? { active: byColorName(override.active) } : {}),
      ...(override.success ? { success: byColorName(override.success) } : {}),
      ...(override.error ? { error: byColorName(override.error) } : {}),
      ...(override.warning ? { warning: byColorName(override.warning) } : {}),
      ...(override.info ? { info: byColorName(override.info) } : {}),
      ...(override.border ? { border: byColorName(override.border) } : {}),
    },
    layout: {
      ...theme.layout,
      spacing: override.spacing ?? theme.layout.spacing,
    },
  };

  activeTheme = resolved;
  return resolved;
}

const ANSI_PATTERN =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI stripping helper
  /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

export function visibleLength(value: string): number {
  return stripAnsi(value).length;
}

export function padVisibleEnd(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - visibleLength(value)))}`;
}

export function stripSharedIndent(lines: string[]): string[] {
  const indent = activeTheme.layout.indent;
  const nonEmptyLines = lines.filter((line) => line.length > 0);

  if (
    nonEmptyLines.length === 0 ||
    !nonEmptyLines.every((line) => line.startsWith(indent))
  ) {
    return lines;
  }

  return lines.map((line) =>
    line.startsWith(indent) ? line.slice(indent.length) : line,
  );
}
