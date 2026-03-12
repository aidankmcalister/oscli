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

export type ThemeColorFns = {
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

export type ThemePreset = "default" | "basic" | "rounded";

export const themePresets: Record<ThemePreset, ThemeOverride> = {
  default: {},
  basic: {
    sidebar: false,
    spacing: 0,
    cursor: "cyan",
    active: "cyan",
    symbols: {
      pipe: "│",
    },
  },
  rounded: {
    sidebar: "rounded",
    spacing: 1,
  },
};

/** @internal */
export const colorFormatters: Record<ColorName, (value: string) => string> = {
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

let defaultTheme: ResolvedTheme | null = null;
let _shouldColor: boolean | null = null;
const colorFormatterCache = new Map<ColorName, (value: string) => string>();

function shouldColor(): boolean {
  if (_shouldColor === null) {
    const stdout = typeof process === "object" && process !== null
      ? (process as { stdout?: { isTTY?: boolean } }).stdout
      : undefined;
    _shouldColor = !activeNoColor && stdout?.isTTY === true;
  }

  return _shouldColor;
}

function paint(value: string, formatter: (input: string) => string): string {
  return shouldColor() ? formatter(value) : value;
}

function byColorName(name: ColorName): (value: string) => string {
  const cached = colorFormatterCache.get(name);
  if (cached) {
    return cached;
  }

  const formatter = (value: string) => paint(value, colorFormatters[name]);
  colorFormatterCache.set(name, formatter);
  return formatter;
}

/** @internal */
export function themedColor(name: ColorName): (value: string) => string {
  return byColorName(name);
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

function getDefaultTheme(): ResolvedTheme {
  defaultTheme ??= createDefaultTheme();
  return defaultTheme;
}

/** @internal */
export const theme: ResolvedTheme = new Proxy({} as ResolvedTheme, {
  get(_target, property) {
    return getDefaultTheme()[property as keyof ResolvedTheme];
  },
  ownKeys() {
    return Reflect.ownKeys(getDefaultTheme());
  },
  getOwnPropertyDescriptor(_target, property) {
    return (
      Object.getOwnPropertyDescriptor(getDefaultTheme(), property) ?? {
        configurable: true,
        enumerable: true,
        writable: false,
        value: getDefaultTheme()[property as keyof ResolvedTheme],
      }
    );
  },
});

/** @internal */
export let activeTheme: ResolvedTheme = theme;
/** @internal */
export let activeNoColor = false;

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

export function applyTheme(
  override: ThemeOverride = {},
  noColor = false,
): ResolvedTheme {
  const baseTheme = getDefaultTheme();
  const baseSymbols = resolveSidebarSymbols(baseTheme.symbols, override.sidebar);
  const mergedSymbols = {
    ...baseSymbols,
    ...(override.symbols ?? {}),
  };

  activeNoColor = noColor;
  _shouldColor = null;

  const color = noColor
    ? {
        cursor: (s: string) => s,
        label: (s: string) => s,
        muted: (s: string) => s,
        dim: (s: string) => s,
        active: (s: string) => s,
        success: (s: string) => s,
        error: (s: string) => s,
        warning: (s: string) => s,
        info: (s: string) => s,
        value: (s: string) => s,
        key: (s: string) => s,
        title: (s: string) => s,
        border: (s: string) => s,
        timer: (s: string) => s,
        hint: (s: string) => s,
      }
    : {
        ...baseTheme.color,
        ...(override.cursor ? { cursor: byColorName(override.cursor) } : {}),
        ...(override.active ? { active: byColorName(override.active) } : {}),
        ...(override.success ? { success: byColorName(override.success) } : {}),
        ...(override.error ? { error: byColorName(override.error) } : {}),
        ...(override.warning ? { warning: byColorName(override.warning) } : {}),
        ...(override.info ? { info: byColorName(override.info) } : {}),
        ...(override.border ? { border: byColorName(override.border) } : {}),
      };

  const resolved: ResolvedTheme = {
    symbols: mergedSymbols,
    color,
    layout: {
      ...baseTheme.layout,
      spacing: override.spacing ?? baseTheme.layout.spacing,
    },
  };

  activeTheme = resolved;
  return resolved;
}

const ANSI_PATTERN =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI stripping helper
  /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

/** @internal */
export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

/** @internal */
export function visibleLength(value: string): number {
  return stripAnsi(value).length;
}

/** @internal */
export function padVisibleEnd(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - visibleLength(value)))}`;
}

/** @internal */
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
