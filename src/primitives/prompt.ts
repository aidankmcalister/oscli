import * as readline from "node:readline";
import { writeLine, writeLines, writeSectionLine } from "../output";
import { activeTheme as theme, padVisibleEnd } from "../theme";

export type PromptSubmitResult<T> =
  | { ok: true; value: T; summaryValue?: string }
  | { ok: false; error: string };

type SharedPromptOptions<TInput, TValue> = {
  label: string;
  describe?: string;
  summaryWidth?: number;
  resolve?: (
    value: TInput,
  ) => PromptSubmitResult<TValue> | Promise<PromptSubmitResult<TValue>>;
};

export type TextPromptOptions<TValue = string> = SharedPromptOptions<
  string,
  TValue
> & {
  placeholder?: string;
  defaultValue?: string;
};

export type PasswordPromptOptions<TValue = string> = SharedPromptOptions<
  string,
  TValue
> & {
  placeholder?: string;
  defaultValue?: string;
};

export type NumberPromptOptions<TValue = number> = SharedPromptOptions<
  number,
  TValue
> & {
  min?: number;
  max?: number;
  prefix?: string;
  placeholder?: string;
  defaultValue?: number;
};

export type SelectPromptOptions<T extends string, TValue = T> =
  SharedPromptOptions<T, TValue> & {
    choices: readonly T[];
    rules?: Partial<Record<T, string>>;
  };

export type MultiselectPromptOptions<T extends string, TValue = T[]> =
  SharedPromptOptions<T[], TValue> & {
    choices: readonly T[];
    min?: number;
    max?: number;
  };

export type ConfirmPromptOptions<TValue = boolean> = SharedPromptOptions<
  boolean,
  TValue
> & {
  defaultValue?: boolean;
};

const INDENT = theme.layout.indent;
let completedPromptLabelWidth = 0;

export function enableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
}

export function disableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

export function clearLine(): void {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

export function moveCursorUp(lines: number): void {
  readline.moveCursor(process.stdout, 0, -lines);
}

function clearRenderedBlock(lines: number): void {
  if (!process.stdout.isTTY || lines === 0) return;
  moveCursorUp(lines);
  readline.cursorTo(process.stdout, 0);
  readline.clearScreenDown(process.stdout);
}

function renderBlock(lines: string[], renderedLines: number): number {
  clearRenderedBlock(renderedLines);
  writeLines(lines.join("\n"));
  return lines.length;
}

function defaultResolve<T>(value: T): PromptSubmitResult<T> {
  return { ok: true, value };
}

function getSummaryWidth(label: string, summaryWidth?: number): number {
  completedPromptLabelWidth = Math.max(
    completedPromptLabelWidth,
    summaryWidth ?? 0,
    label.length,
  );
  return completedPromptLabelWidth;
}

export function writePromptSummary(
  label: string,
  value: string,
  summaryWidth?: number,
): void {
  const summaryLabel = `${label}:`;
  const width = getSummaryWidth(
    summaryLabel,
    summaryWidth === undefined ? undefined : summaryWidth + 1,
  );
  const paddedLabel = padVisibleEnd(theme.color.key(summaryLabel), width);

  writeSectionLine(
    `${INDENT}${theme.color.success(theme.symbols.success)} ${paddedLabel}  ${theme.color.value(value)}`,
  );
}

function buildEmptyPreview(
  placeholder?: string,
  defaultValue?: string,
): string | undefined {
  if (placeholder) return placeholder;
  if (defaultValue !== undefined) return `(${defaultValue})`;
  return undefined;
}

async function renderTextLikePrompt<TValue>(
  options: SharedPromptOptions<string, TValue> & {
    placeholder?: string;
    defaultValue?: string;
    prefix?: string;
    mask?: boolean;
    maskDefault?: boolean;
  },
): Promise<TValue> {
  const {
    label,
    describe,
    summaryWidth,
    placeholder,
    defaultValue,
    prefix,
    mask = false,
    maskDefault = false,
    resolve = defaultResolve<string | TValue> as (
      value: string,
    ) => PromptSubmitResult<TValue> | Promise<PromptSubmitResult<TValue>>,
  } = options;

  let value = "";
  let errorMessage = "";
  let renderedLines = 0;

  const render = () => {
    const lines = [`${INDENT}${theme.color.label(label)}`];

    if (describe) {
      lines.push(`${INDENT}${theme.color.hint(describe)}`);
    }

    const emptyPreview = buildEmptyPreview(
      placeholder,
      defaultValue === undefined
        ? undefined
        : maskDefault
          ? "*".repeat(defaultValue.length)
          : defaultValue,
    );

    let display = "";
    if (value.length > 0) {
      const text = mask ? "*".repeat(value.length) : value;
      display = mask ? theme.color.muted(text) : theme.color.value(text);
    } else if (emptyPreview) {
      display = theme.color.muted(emptyPreview);
    }

    const prefixText = prefix ? `${theme.color.muted(prefix)} ` : "";
    const cursor = theme.color.cursor(theme.symbols.cursor);
    const caret = theme.color.cursor("_");

    lines.push(
      `${INDENT}${prefixText}${cursor} ${
        display.length > 0 ? `${display}${caret}` : caret
      }`,
    );

    if (errorMessage) {
      lines.push(
        `${INDENT}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
      );
    }

    renderedLines = renderBlock(lines, renderedLines);
  };

  return new Promise((resolvePrompt, reject) => {
    const cleanup = () => {
      process.stdin.off("data", onData);
      disableRawMode();
    };

    const onData = async (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        clearRenderedBlock(renderedLines);
        writeLine("");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\r" || key === "\n") {
        const candidate = value.length > 0 ? value : (defaultValue ?? "");
        const result = await resolve(candidate);

        if (result.ok === false) {
          errorMessage = result.error;
          render();
          return;
        }

        cleanup();
        clearRenderedBlock(renderedLines);
        const summaryValue =
          result.summaryValue ??
          (mask ? "*".repeat(candidate.length) : candidate || "");
        writePromptSummary(label, summaryValue, summaryWidth);
        resolvePrompt(result.value);
        return;
      }

      if (key === "\u007f" || key === "\b" || key === "\x08") {
        value = value.slice(0, -1);
        errorMessage = "";
        render();
        return;
      }

      if (key >= " " && key <= "~") {
        value += key;
        errorMessage = "";
        render();
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

export function renderTextPrompt<TValue = string>(
  options: TextPromptOptions<TValue>,
): Promise<TValue> {
  return renderTextLikePrompt(options);
}

export function renderPasswordPrompt<TValue = string>(
  options: PasswordPromptOptions<TValue>,
): Promise<TValue> {
  return renderTextLikePrompt({
    ...options,
    mask: true,
    maskDefault: true,
  });
}

export async function renderNumberPrompt<TValue = number>(
  options: NumberPromptOptions<TValue>,
): Promise<TValue> {
  const { min, max, prefix, placeholder, defaultValue, resolve, ...shared } =
    options;

  return renderTextLikePrompt({
    ...shared,
    prefix,
    placeholder,
    defaultValue:
      defaultValue === undefined ? undefined : String(defaultValue),
    resolve: async (rawValue) => {
      const normalized =
        prefix && rawValue.startsWith(prefix)
          ? rawValue.slice(prefix.length).trim()
          : rawValue.trim();

      const parsed = Number(normalized);

      if (Number.isNaN(parsed)) {
        return {
          ok: false,
          error: "Invalid number. Please enter a numeric value.",
        };
      }

      if (min !== undefined && parsed < min) {
        return {
          ok: false,
          error: `Value must be at least ${min}.`,
        };
      }

      if (max !== undefined && parsed > max) {
        return {
          ok: false,
          error: `Value must be at most ${max}.`,
        };
      }

      if (!resolve) {
        return {
          ok: true,
          value: parsed as TValue,
          summaryValue: String(parsed),
        };
      }

      const result = await resolve(parsed);
      if (!result.ok) return result;

      return {
        ok: true,
        value: result.value,
        summaryValue: result.summaryValue ?? String(parsed),
      };
    },
  });
}

export function renderSelectPrompt<T extends string, TValue = T>(
  options: SelectPromptOptions<T, TValue>,
): Promise<TValue> {
  const {
    label,
    describe,
    choices,
    rules,
    summaryWidth,
    resolve = defaultResolve<T | TValue> as (
      value: T,
    ) => PromptSubmitResult<TValue> | Promise<PromptSubmitResult<TValue>>,
  } = options;

  const choiceWidth = Math.max(0, ...choices.map((choice) => choice.length));
  let selectedIndex = 0;
  let errorMessage = "";
  let renderedLines = 0;

  const render = () => {
    const lines = [`${INDENT}${theme.color.label(label)}`];

    if (describe) {
      lines.push(`${INDENT}${theme.color.hint(describe)}`);
    }

    lines.push(
      ...choices.map((choice, index) => {
        const active = index === selectedIndex;
        const cursor = active ? `${theme.color.cursor(theme.symbols.cursor)} ` : "  ";
        const icon = active
          ? theme.color.active(theme.symbols.radio_on)
          : theme.color.muted(theme.symbols.radio_off);
        const text = active
          ? theme.color.value(choice.padEnd(choiceWidth, " "))
          : theme.color.muted(choice.padEnd(choiceWidth, " "));
        const rule = rules?.[choice];

        return `${INDENT}${cursor}${icon} ${text}${
          rule ? `  ${theme.color.dim(rule)}` : ""
        }`;
      }),
    );

    lines.push(`${INDENT}${theme.color.dim("↑↓ navigate   enter select")}`);

    if (errorMessage) {
      lines.push(
        `${INDENT}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
      );
    }

    renderedLines = renderBlock(lines, renderedLines);
  };

  return new Promise((resolvePrompt, reject) => {
    const cleanup = () => {
      process.stdin.off("data", onData);
      disableRawMode();
    };

    const onData = async (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        clearRenderedBlock(renderedLines);
        writeLine("");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\u001b[A") {
        selectedIndex =
          selectedIndex === 0 ? choices.length - 1 : selectedIndex - 1;
        errorMessage = "";
        render();
        return;
      }

      if (key === "\u001b[B") {
        selectedIndex =
          selectedIndex === choices.length - 1 ? 0 : selectedIndex + 1;
        errorMessage = "";
        render();
        return;
      }

      if (key === "\r" || key === "\n") {
        const selected = choices[selectedIndex];
        const result = await resolve(selected);

        if (result.ok === false) {
          errorMessage = result.error;
          render();
          return;
        }

        cleanup();
        clearRenderedBlock(renderedLines);
        writePromptSummary(
          label,
          result.summaryValue ?? selected,
          summaryWidth,
        );
        resolvePrompt(result.value);
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

export function renderMultiselectPrompt<T extends string, TValue = T[]>(
  options: MultiselectPromptOptions<T, TValue>,
): Promise<TValue> {
  const {
    label,
    describe,
    choices,
    min,
    max,
    summaryWidth,
    resolve = defaultResolve<T[] | TValue> as (
      value: T[],
    ) => PromptSubmitResult<TValue> | Promise<PromptSubmitResult<TValue>>,
  } = options;

  let cursorIndex = 0;
  const selected = new Set<number>();
  let errorMessage = "";
  let renderedLines = 0;

  const rangeHint =
    min !== undefined && max !== undefined
      ? `${min}–${max}`
      : min !== undefined
        ? `${min}+`
        : max !== undefined
          ? `0–${max}`
          : undefined;

  const render = () => {
    const title = rangeHint
      ? `${theme.color.label(label)}  ${theme.color.muted(`(${rangeHint})`)}`
      : theme.color.label(label);

    const lines = [`${INDENT}${title}`];

    if (describe) {
      lines.push(`${INDENT}${theme.color.hint(describe)}`);
    }

    lines.push(
      ...choices.map((choice, index) => {
        const isSelected = selected.has(index);
        const active = index === cursorIndex;
        const cursor = active ? `${theme.color.cursor(theme.symbols.cursor)} ` : "  ";
        const icon = isSelected
          ? theme.color.active(theme.symbols.check_on)
          : theme.color.muted(theme.symbols.check_off);
        const text = active || isSelected
          ? theme.color.value(choice)
          : theme.color.muted(choice);

        return `${INDENT}${cursor}${icon} ${text}`;
      }),
    );

    lines.push(
      `${INDENT}${theme.color.dim("↑↓ navigate   space toggle   enter confirm")}`,
    );

    if (errorMessage) {
      lines.push(
        `${INDENT}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
      );
    }

    renderedLines = renderBlock(lines, renderedLines);
  };

  return new Promise((resolvePrompt, reject) => {
    const cleanup = () => {
      process.stdin.off("data", onData);
      disableRawMode();
    };

    const onData = async (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        clearRenderedBlock(renderedLines);
        writeLine("");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\u001b[A") {
        cursorIndex = cursorIndex === 0 ? choices.length - 1 : cursorIndex - 1;
        errorMessage = "";
        render();
        return;
      }

      if (key === "\u001b[B") {
        cursorIndex = cursorIndex === choices.length - 1 ? 0 : cursorIndex + 1;
        errorMessage = "";
        render();
        return;
      }

      if (key === " ") {
        if (selected.has(cursorIndex)) {
          selected.delete(cursorIndex);
          errorMessage = "";
          render();
          return;
        }

        if (max !== undefined && selected.size >= max) {
          errorMessage = `Select at most ${max}.`;
          render();
          return;
        }

        selected.add(cursorIndex);
        errorMessage = "";
        render();
        return;
      }

      if (key === "\r" || key === "\n") {
        if (min !== undefined && selected.size < min) {
          errorMessage = `Select at least ${min}.`;
          render();
          return;
        }

        const values = choices.filter((_, index) => selected.has(index));
        const result = await resolve(values);

        if (result.ok === false) {
          errorMessage = result.error;
          render();
          return;
        }

        cleanup();
        clearRenderedBlock(renderedLines);
        writePromptSummary(
          label,
          result.summaryValue ?? values.join(", "),
          summaryWidth,
        );
        resolvePrompt(result.value);
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

export async function renderConfirmPrompt<TValue = boolean>(
  options: ConfirmPromptOptions<TValue>,
): Promise<TValue> {
  const { label, describe, defaultValue, resolve, summaryWidth } = options;

  const hint =
    defaultValue === true ? "(Y/n)" : defaultValue === false ? "(y/N)" : "(y/n)";

  const fallbackValue =
    defaultValue === undefined ? undefined : defaultValue ? "y" : "n";

  return renderTextLikePrompt({
    label,
    describe,
    summaryWidth,
    placeholder: hint,
    defaultValue: fallbackValue,
    resolve: async (input) => {
      const normalized = input.trim().toLowerCase();

      if (normalized !== "y" && normalized !== "yes" && normalized !== "n" && normalized !== "no") {
        return {
          ok: false,
          error: "Please enter y or n.",
        };
      }

      const value = normalized === "y" || normalized === "yes";

      if (!resolve) {
        return {
          ok: true,
          value: value as TValue,
          summaryValue: value ? "yes" : "no",
        };
      }

      const result = await resolve(value);
      if (!result.ok) return result;

      return {
        ok: true,
        value: result.value,
        summaryValue: result.summaryValue ?? (value ? "yes" : "no"),
      };
    },
  });
}
