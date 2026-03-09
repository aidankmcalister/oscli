import { writeLine, writeLines, writeSectionLine } from "../output";
import {
  activeTheme as theme,
  padVisibleEnd,
  themedColor,
  type ColorName,
} from "../theme";

export type PromptSubmitResult<T> =
  | { ok: true; value: T; summaryValue?: string }
  | { ok: false; error: string };

type SharedPromptOptions<TInput, TValue> = {
  label: string;
  describe?: string;
  promptColor?: ColorName;
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

export type SearchPromptOptions<T extends string, TValue = T> =
  SharedPromptOptions<T, TValue> & {
    choices: readonly T[];
    rules?: Partial<Record<T, string>>;
    placeholder?: string;
  };

export type MultiselectPromptOptions<T extends string, TValue = T[]> =
  SharedPromptOptions<T[], TValue> & {
    choices: readonly T[];
    min?: number;
    max?: number;
  };

export type ListPromptOptions<TValue = string[]> = SharedPromptOptions<
  string[],
  TValue
> & {
  min?: number;
  max?: number;
  placeholder?: string;
};

export type DatePromptOptions<TValue = Date> = SharedPromptOptions<
  Date,
  TValue
> & {
  format?: string;
  placeholder?: string;
  defaultValue?: Date;
};

export type ConfirmPromptOptions<TValue = boolean> = SharedPromptOptions<
  boolean,
  TValue
> & {
  confirmMode?: "toggle" | "simple";
  defaultValue?: boolean;
};

function currentIndent(): string {
  return theme.layout.indent;
}
let completedPromptLabelWidth = 0;

function enableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
}

function disableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

function clearLine(): void {
  process.stdout.write("\u001b[2K\r");
}

function moveCursorUp(lines: number): void {
  if (lines > 0) {
    process.stdout.write(`\u001b[${lines}A`);
  }
}

function clearRenderedBlock(lines: number): void {
  if (!process.stdout.isTTY || lines === 0) {
    return;
  }

  moveCursorUp(lines);
  process.stdout.write("\r\u001b[J");
}

function renderBlock(lines: string[], renderedLines: number): number {
  clearRenderedBlock(renderedLines);
  writeLines(lines.join("\n"));
  return lines.length;
}

function defaultResolve<T>(value: T): PromptSubmitResult<T> {
  return { ok: true, value };
}

function promptLabel(label: string, promptColor?: ColorName): string {
  return promptColor ? themedColor(promptColor)(label) : theme.color.label(label);
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
    `${currentIndent()}${theme.color.success(theme.symbols.success)} ${paddedLabel}  ${theme.color.value(value)}`,
  );
}

function buildEmptyPreview(
  placeholder?: string,
  defaultValue?: string,
): string | undefined {
  if (placeholder) {
    return placeholder;
  }

  if (defaultValue !== undefined) {
    return `(${defaultValue})`;
  }

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
    promptColor,
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
    const lines = [`${currentIndent()}${promptLabel(label, promptColor)}`];

    if (describe) {
      lines.push(`${currentIndent()}${theme.color.hint(describe)}`);
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
      `${currentIndent()}${prefixText}${cursor} ${
        display.length > 0 ? `${display}${caret}` : caret
      }`,
    );

    if (errorMessage) {
      lines.push(
        `${currentIndent()}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
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
      if (!result.ok) {
        return result;
      }

      return {
        ok: true,
        value: result.value,
        summaryValue: result.summaryValue ?? String(parsed),
      };
    },
  });
}

function renderChoiceRow(
  label: string,
  active: boolean,
  selected: boolean,
  rule?: string,
): string {
  const cursor = active ? `${theme.color.cursor(theme.symbols.cursor)} ` : "  ";
  const icon = selected
    ? theme.color.active(theme.symbols.radio_on)
    : theme.color.muted(theme.symbols.radio_off);
  const text = active ? theme.color.value(label) : theme.color.muted(label);
  const suffix = rule ? `  ${theme.color.dim(rule)}` : "";
  return `${currentIndent()}${cursor}${icon} ${text}${suffix}`;
}

export function renderSelectPrompt<T extends string, TValue = T>(
  options: SelectPromptOptions<T, TValue>,
): Promise<TValue> {
  const {
    label,
    describe,
    promptColor,
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
    const lines = [`${currentIndent()}${promptLabel(label, promptColor)}`];

    if (describe) {
      lines.push(`${currentIndent()}${theme.color.hint(describe)}`);
    }

    lines.push(
      ...choices.map((choice, index) =>
        renderChoiceRow(
          choice.padEnd(choiceWidth, " "),
          index === selectedIndex,
          index === selectedIndex,
          rules?.[choice],
        ),
      ),
    );

    lines.push(`${currentIndent()}${theme.color.dim("↑↓ navigate   enter select")}`);

    if (errorMessage) {
      lines.push(
        `${currentIndent()}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
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
        writePromptSummary(label, result.summaryValue ?? selected, summaryWidth);
        resolvePrompt(result.value);
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

export function renderSearchPrompt<T extends string, TValue = T>(
  options: SearchPromptOptions<T, TValue>,
): Promise<TValue> {
  const {
    label,
    describe,
    promptColor,
    choices,
    rules,
    placeholder = "Type to filter",
    summaryWidth,
    resolve = defaultResolve<T | TValue> as (
      value: T,
    ) => PromptSubmitResult<TValue> | Promise<PromptSubmitResult<TValue>>,
  } = options;

  let query = "";
  let selectedIndex = 0;
  let errorMessage = "";
  let renderedLines = 0;

  const filterChoices = () => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized.length === 0
      ? choices
      : choices.filter((choice) => choice.toLowerCase().includes(normalized));

    if (selectedIndex >= filtered.length) {
      selectedIndex = Math.max(0, filtered.length - 1);
    }

    return filtered;
  };

  const render = () => {
    const filteredChoices = filterChoices();
    const choiceWidth = Math.max(
      0,
      ...filteredChoices.map((choice) => choice.length),
      ...choices.map((choice) => choice.length),
    );
    const cursor = theme.color.cursor(theme.symbols.cursor);
    const caret = theme.color.cursor("_");
    const input = query.length > 0
      ? `${theme.color.value(query)}${caret}`
      : `${theme.color.muted(placeholder)}${caret}`;

    const lines = [
      `${currentIndent()}${promptLabel(label, promptColor)}`,
    ];

    if (describe) {
      lines.push(`${currentIndent()}${theme.color.hint(describe)}`);
    }

    lines.push(`${currentIndent()}${cursor} ${input}`);

    if (filteredChoices.length === 0) {
      lines.push(`${currentIndent()}${theme.color.muted("No matches")}`);
    } else {
      lines.push(
        ...filteredChoices.map((choice, index) =>
          renderChoiceRow(
            choice.padEnd(choiceWidth, " "),
            index === selectedIndex,
            index === selectedIndex,
            rules?.[choice],
          ),
        ),
      );
    }

    lines.push(
      `${currentIndent()}${theme.color.dim("type to filter   ↑↓ navigate   enter select")}`,
    );

    if (errorMessage) {
      lines.push(
        `${currentIndent()}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
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
      const filteredChoices = filterChoices();

      if (key === "\u0003") {
        cleanup();
        clearRenderedBlock(renderedLines);
        writeLine("");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\u001b[A") {
        if (filteredChoices.length > 0) {
          selectedIndex =
            selectedIndex === 0 ? filteredChoices.length - 1 : selectedIndex - 1;
        }
        errorMessage = "";
        render();
        return;
      }

      if (key === "\u001b[B") {
        if (filteredChoices.length > 0) {
          selectedIndex =
            selectedIndex === filteredChoices.length - 1 ? 0 : selectedIndex + 1;
        }
        errorMessage = "";
        render();
        return;
      }

      if (key === "\u007f" || key === "\b" || key === "\x08") {
        query = query.slice(0, -1);
        errorMessage = "";
        render();
        return;
      }

      if (key === "\r" || key === "\n") {
        if (filteredChoices.length === 0) {
          errorMessage = "No matches found.";
          render();
          return;
        }

        const selected = filteredChoices[selectedIndex] as T;
        const result = await resolve(selected);

        if (result.ok === false) {
          errorMessage = result.error;
          render();
          return;
        }

        cleanup();
        clearRenderedBlock(renderedLines);
        writePromptSummary(label, result.summaryValue ?? selected, summaryWidth);
        resolvePrompt(result.value);
        return;
      }

      if (key >= " " && key <= "~") {
        query += key;
        errorMessage = "";
        selectedIndex = 0;
        render();
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
    promptColor,
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
      ? `${promptLabel(label, promptColor)}  ${theme.color.muted(`(${rangeHint})`)}`
      : promptLabel(label, promptColor);

    const lines = [`${currentIndent()}${title}`];

    if (describe) {
      lines.push(`${currentIndent()}${theme.color.hint(describe)}`);
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

        return `${currentIndent()}${cursor}${icon} ${text}`;
      }),
    );

    lines.push(
      `${currentIndent()}${theme.color.dim("↑↓ navigate   space toggle   enter confirm")}`,
    );

    if (errorMessage) {
      lines.push(
        `${currentIndent()}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
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

export function renderListPrompt<TValue = string[]>(
  options: ListPromptOptions<TValue>,
): Promise<TValue> {
  const {
    label,
    describe,
    promptColor,
    min,
    max,
    placeholder = "Add an item",
    summaryWidth,
    resolve = defaultResolve<string[] | TValue> as (
      value: string[],
    ) => PromptSubmitResult<TValue> | Promise<PromptSubmitResult<TValue>>,
  } = options;

  const items: string[] = [];
  let current = "";
  let errorMessage = "";
  let renderedLines = 0;

  const countHint = () => {
    if (max !== undefined) {
      return `${items.length} / ${max}`;
    }

    return String(items.length);
  };

  const render = () => {
    const cursor = theme.color.cursor(theme.symbols.cursor);
    const caret = theme.color.cursor("_");
    const input = current.length > 0
      ? `${theme.color.value(current)}${caret}`
      : `${theme.color.muted(placeholder)}${caret}`;
    const title = `${promptLabel(label, promptColor)}  ${theme.color.muted(`(${countHint()})`)}`;
    const lines = [`${currentIndent()}${title}`];

    if (describe) {
      lines.push(`${currentIndent()}${theme.color.hint(describe)}`);
    }

    lines.push(`${currentIndent()}${cursor} ${input}`);

    if (items.length > 0) {
      lines.push(
        ...items.map((item) => `${currentIndent()}${theme.color.dim("•")} ${theme.color.value(item)}`),
      );
    }

    if (errorMessage) {
      lines.push(
        `${currentIndent()}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
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

      if (key === "\u007f" || key === "\b" || key === "\x08") {
        current = current.slice(0, -1);
        errorMessage = "";
        render();
        return;
      }

      if (key === "\r" || key === "\n") {
        const next = current.trim();

        if (next.length === 0) {
          if (min !== undefined && items.length < min) {
            errorMessage = `Add at least ${min} item${min === 1 ? "" : "s"}.`;
            render();
            return;
          }

          const result = await resolve([...items]);
          if (result.ok === false) {
            errorMessage = result.error;
            render();
            return;
          }

          cleanup();
          clearRenderedBlock(renderedLines);
          writePromptSummary(
            label,
            result.summaryValue ?? items.join(", "),
            summaryWidth,
          );
          resolvePrompt(result.value);
          return;
        }

        if (max !== undefined && items.length >= max) {
          errorMessage = `Add at most ${max} items.`;
          render();
          return;
        }

        items.push(next);
        current = "";
        errorMessage = "";
        clearRenderedBlock(renderedLines);
        renderedLines = 0;
        writePromptSummary(label, next, summaryWidth);
        render();
        return;
      }

      if (key >= " " && key <= "~") {
        current += key;
        errorMessage = "";
        render();
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDateByFormat(input: string, format: string): Date | null {
  const tokens: string[] = [];
  const pattern = `^${escapeRegExp(format).replace(/YYYY|MM|DD/g, (token) => {
    tokens.push(token);
    return token === "YYYY" ? "(\\d{4})" : "(\\d{2})";
  })}$`;
  const match = input.match(new RegExp(pattern));

  if (!match) {
    return null;
  }

  let year = 0;
  let month = 1;
  let day = 1;

  for (let index = 0; index < tokens.length; index += 1) {
    const value = Number(match[index + 1]);
    if (tokens[index] === "YYYY") {
      year = value;
    } else if (tokens[index] === "MM") {
      month = value;
    } else if (tokens[index] === "DD") {
      day = value;
    }
  }

  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatDateValue(date: Date, format: string): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return format
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day);
}

export async function renderDatePrompt<TValue = Date>(
  options: DatePromptOptions<TValue>,
): Promise<TValue> {
  const {
    format = "YYYY-MM-DD",
    placeholder,
    defaultValue,
    resolve,
    ...shared
  } = options;

  return renderTextLikePrompt({
    ...shared,
    placeholder: placeholder ?? format,
    defaultValue:
      defaultValue === undefined ? undefined : formatDateValue(defaultValue, format),
    resolve: async (rawValue) => {
      const parsed = parseDateByFormat(rawValue.trim(), format);

      if (!parsed) {
        return {
          ok: false,
          error: `Enter a valid date in ${format} format.`,
        };
      }

      if (!resolve) {
        return {
          ok: true,
          value: parsed as TValue,
          summaryValue: formatDateValue(parsed, format),
        };
      }

      const result = await resolve(parsed);
      if (!result.ok) {
        return result;
      }

      return {
        ok: true,
        value: result.value,
        summaryValue: result.summaryValue ?? formatDateValue(parsed, format),
      };
    },
  });
}

export async function renderConfirmPrompt<TValue = boolean>(
  options: ConfirmPromptOptions<TValue>,
): Promise<TValue> {
  const {
    label,
    describe,
    promptColor,
    confirmMode = "simple",
    defaultValue,
    resolve,
    summaryWidth,
  } = options;

  if (confirmMode === "toggle") {
    let selected = defaultValue ?? true;
    let errorMessage = "";
    let renderedLines = 0;

    const render = () => {
      const yes = selected
        ? theme.color.active(`${theme.symbols.radio_on} Yes`)
        : theme.color.muted(`${theme.symbols.radio_off} Yes`);
      const no = !selected
        ? theme.color.active(`${theme.symbols.radio_on} No`)
        : theme.color.muted(`${theme.symbols.radio_off} No`);
      const lines = [`${currentIndent()}${promptLabel(label, promptColor)}`];

      if (describe) {
        lines.push(`${currentIndent()}${theme.color.hint(describe)}`);
      }

      lines.push(`${currentIndent()}${yes}${theme.color.muted("  /  ")}${no}`);

      if (errorMessage) {
        lines.push(
          `${currentIndent()}${theme.color.error(`${theme.symbols.error} ${errorMessage}`)}`,
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

        if (key === "\u001b[D" || key.toLowerCase() === "y") {
          selected = true;
          errorMessage = "";
          render();
          return;
        }

        if (key === "\u001b[C" || key.toLowerCase() === "n") {
          selected = false;
          errorMessage = "";
          render();
          return;
        }

        if (key === "\r" || key === "\n") {
          if (!resolve) {
            cleanup();
            clearRenderedBlock(renderedLines);
            writePromptSummary(label, selected ? "yes" : "no", summaryWidth);
            resolvePrompt(selected as TValue);
            return;
          }

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
            result.summaryValue ?? (selected ? "yes" : "no"),
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

  const hint =
    defaultValue === true ? "(Y/n)" : defaultValue === false ? "(y/N)" : "(y/n)";

  const fallbackValue =
    defaultValue === undefined ? undefined : defaultValue ? "y" : "n";

  return renderTextLikePrompt({
    label,
    describe,
    promptColor,
    summaryWidth,
    placeholder: hint,
    defaultValue: fallbackValue,
    resolve: async (input) => {
      const normalized = input.trim().toLowerCase();

      if (
        normalized !== "y" &&
        normalized !== "yes" &&
        normalized !== "n" &&
        normalized !== "no"
      ) {
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
      if (!result.ok) {
        return result;
      }

      return {
        ok: true,
        value: result.value,
        summaryValue: result.summaryValue ?? (value ? "yes" : "no"),
      };
    },
  });
}
