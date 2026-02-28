import { Command, Option } from "commander";
import process from "node:process";
import readline from "node:readline";

const BUILDER_MARK: unique symbol = Symbol("oscli.builder");

type PromptKind =
  | "text"
  | "number"
  | "password"
  | "select"
  | "multi"
  | "confirm";

type SymbolName = "ok" | "err" | "warn" | "prompt";

type SymbolSet = Record<SymbolName, string>;

const UNICODE_SYMBOLS: SymbolSet = {
  ok: "✓",
  err: "✕",
  warn: "▲",
  prompt: "◆",
};

const ASCII_SYMBOLS: SymbolSet = {
  ok: "[ok]",
  err: "[x]",
  warn: "[!]",
  prompt: "[?]",
};

const BRAILLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const ASCII_SPINNER_FRAMES = ["|", "/", "-", "\\"];

type ValidationResult = boolean | string | Error | null | undefined;

export interface ValidationContext {
  key: string;
  storage: Record<string, unknown>;
}

type Validator<TValue> = (
  value: TValue,
  context: ValidationContext,
) => ValidationResult | Promise<ValidationResult>;

type Transformer<TValue> = (
  value: TValue,
  context: ValidationContext,
) => TValue | Promise<TValue>;

interface InputDefinition<TValue, TOptional extends boolean = boolean> {
  kind: PromptKind;
  choices: readonly string[] | undefined;
  label: string | undefined;
  placeholder: string | undefined;
  hasDefault: boolean;
  defaultValue: TValue | undefined;
  min: number | undefined;
  max: number | undefined;
  validators: Array<Validator<TValue>>;
  description: string | undefined;
  optional: TOptional;
  transforms: Array<Transformer<TValue>>;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class CLIExitError extends Error {
  cancelled = true;

  constructor(message: string | undefined) {
    super(message ?? "CLI exited");
    this.name = "CLIExitError";
  }
}

class CLIOutroError extends Error {
  completed = true;

  constructor(message: string | undefined) {
    super(message ?? "CLI completed");
    this.name = "CLIOutroError";
  }
}

export class InputBuilder<TValue, TOptional extends boolean = false> {
  readonly [BUILDER_MARK] = true;

  private readonly kind: PromptKind;
  private readonly choices: readonly string[] | undefined;
  private labelValue: string | undefined;
  private placeholderValue: string | undefined;
  private hasDefaultValue = false;
  private defaultValueData: TValue | undefined;
  private minValue: number | undefined;
  private maxValue: number | undefined;
  private readonly validatorsList: Array<Validator<TValue>> = [];
  private descriptionValue: string | undefined;
  private optionalValue = false;
  private readonly transformsList: Array<Transformer<TValue>> = [];

  constructor(kind: PromptKind, options: { choices?: readonly string[] } = {}) {
    this.kind = kind;
    this.choices = options.choices;
  }

  label(value: string): this {
    this.labelValue = String(value);
    return this;
  }

  placeholder(value: string): this {
    this.placeholderValue = String(value);
    return this;
  }

  default(value: TValue): this {
    this.hasDefaultValue = true;
    this.defaultValueData = value;
    return this;
  }

  min(value: number): this {
    this.minValue = Number(value);
    return this;
  }

  max(value: number): this {
    this.maxValue = Number(value);
    return this;
  }

  validate(fn: Validator<TValue>): this {
    if (typeof fn !== "function") {
      throw new TypeError("validate() expects a function.");
    }
    this.validatorsList.push(fn);
    return this;
  }

  describe(value: string): this {
    this.descriptionValue = String(value);
    return this;
  }

  optional(): InputBuilder<TValue, true> {
    this.optionalValue = true;
    return this as unknown as InputBuilder<TValue, true>;
  }

  transform(fn: Transformer<TValue>): this {
    if (typeof fn !== "function") {
      throw new TypeError("transform() expects a function.");
    }
    this.transformsList.push(fn);
    return this;
  }

  toDefinition(): InputDefinition<TValue, TOptional> {
    return {
      kind: this.kind,
      choices: this.choices,
      label: this.labelValue,
      placeholder: this.placeholderValue,
      hasDefault: this.hasDefaultValue,
      defaultValue: this.defaultValueData,
      min: this.minValue,
      max: this.maxValue,
      validators: [...this.validatorsList],
      description: this.descriptionValue,
      optional: this.optionalValue as TOptional,
      transforms: [...this.transformsList],
    };
  }
}

type AnyInputBuilder = InputBuilder<any, any>;

type PromptBuilderMap = Record<string, AnyInputBuilder>;

type InferBuilderValue<TBuilder> =
  TBuilder extends InputBuilder<infer TValue, infer TOptional>
    ? TOptional extends true
      ? TValue | undefined
      : TValue
    : never;

type StorageFromPrompts<TPrompts extends PromptBuilderMap> = {
  [K in keyof TPrompts]: InferBuilderValue<TPrompts[K]>;
};

type PromptResolvers<TPrompts extends PromptBuilderMap> = {
  [K in keyof TPrompts]: () => Promise<InferBuilderValue<TPrompts[K]>>;
};

interface CLIConfig<TPrompts extends PromptBuilderMap> {
  description?: string;
  prompts: TPrompts;
}

export interface CLI<TPrompts extends PromptBuilderMap> {
  storage: StorageFromPrompts<TPrompts>;
  prompt: PromptResolvers<TPrompts>;
  argv(argv: string[]): this;
  intro(message: string): void;
  warn(message: string): void;
  success(message: string): void;
  log(level: string, message: string): void;
  spin<TValue>(
    label: string,
    fn: () => Promise<TValue> | TValue,
  ): Promise<TValue>;
  confirm(message: string): Promise<boolean>;
  progress<TItem>(
    label: string,
    items: Iterable<TItem>,
    fn: (item: TItem, index: number, total: number) => Promise<void> | void,
  ): Promise<void>;
  table(
    title: string,
    columns: readonly string[],
    rows: ReadonlyArray<ReadonlyArray<unknown>>,
  ): void;
  exit(message?: string): never;
  outro(message: string): never;
  run(
    fn: () => Promise<void> | void,
    options?: { argv?: string[] },
  ): Promise<{ cancelled: false } | { cancelled: true; message: string }>;
}

interface BuilderFactory {
  text(): InputBuilder<string>;
  number(): InputBuilder<number>;
  password(): InputBuilder<string>;
  select<const TChoices extends readonly [string, ...string[]]>(options: {
    choices: TChoices;
  }): InputBuilder<TChoices[number]>;
  multi<const TChoices extends readonly [string, ...string[]]>(options: {
    choices: TChoices;
  }): InputBuilder<Array<TChoices[number]>>;
  multiselect<const TChoices extends readonly [string, ...string[]]>(options: {
    choices: TChoices;
  }): InputBuilder<Array<TChoices[number]>>;
  confirm(): InputBuilder<boolean>;
}

function createBuilders(): BuilderFactory {
  return {
    text: () => new InputBuilder("text"),
    number: () => new InputBuilder("number"),
    password: () => new InputBuilder("password"),
    select: <const TChoices extends readonly [string, ...string[]]>({
      choices,
    }: {
      choices: TChoices;
    }) => {
      ensureChoices("select", choices);
      return new InputBuilder<TChoices[number]>("select", { choices });
    },
    multi: <const TChoices extends readonly [string, ...string[]]>({
      choices,
    }: {
      choices: TChoices;
    }) => {
      ensureChoices("multi", choices);
      return new InputBuilder<Array<TChoices[number]>>("multi", { choices });
    },
    multiselect: <const TChoices extends readonly [string, ...string[]]>({
      choices,
    }: {
      choices: TChoices;
    }) => {
      ensureChoices("multi", choices);
      return new InputBuilder<Array<TChoices[number]>>("multi", { choices });
    },
    confirm: () => new InputBuilder("confirm"),
  };
}

function ensureChoices(
  kind: "select" | "multi",
  choices: readonly string[],
): void {
  if (choices.length === 0) {
    throw new TypeError(`b.${kind}() requires a non-empty choices array.`);
  }
}

function shouldUseAscii(): boolean {
  return (
    !process.stdout.isTTY ||
    process.env.TERM === "dumb" ||
    typeof process.env.NO_COLOR === "string"
  );
}

function canUseAnimatedSpinner(): boolean {
  return (
    Boolean(process.stdout.isTTY) &&
    process.env.TERM !== "dumb" &&
    !process.env.CI
  );
}

function isProcessExitDisabled(): boolean {
  return process.env.OSCLI_DISABLE_PROCESS_EXIT === "1";
}

function getSymbols(): SymbolSet {
  return shouldUseAscii() ? ASCII_SYMBOLS : UNICODE_SYMBOLS;
}

function writeLine(line: string): void {
  process.stdout.write(`${line}\n`);
}

function toFlagName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function toCommanderProperty(flagName: string): string {
  const parts = flagName.split("-").filter(Boolean);
  if (parts.length === 0) return "";
  const [head, ...tail] = parts;
  return (
    head +
    tail
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join("")
  );
}

function titleFromKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function cloneDefault<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) return [...value] as TValue;
  return value;
}

function splitMulti(value: unknown): string[] {
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "t", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "f", "no", "n", "off"].includes(normalized)) return false;
  throw new ValidationError(
    `Expected a boolean value but received "${String(value)}".`,
  );
}

function resolveChoice(
  rawValue: unknown,
  choices: readonly string[],
  key: string,
): string {
  if (typeof rawValue === "string" && choices.includes(rawValue))
    return rawValue;
  const value = String(rawValue).trim();
  if (choices.includes(value)) return value;
  const asIndex = Number.parseInt(value, 10);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= choices.length) {
    return choices[asIndex - 1] as string;
  }
  throw new ValidationError(
    `${key} must be one of: ${choices.join(", ")}. Received "${String(rawValue)}".`,
  );
}

function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

function coerceValue(
  definition: InputDefinition<unknown>,
  key: string,
  rawValue: unknown,
): unknown {
  if (rawValue === undefined) return undefined;

  switch (definition.kind) {
    case "text":
    case "password":
      return String(rawValue);

    case "number": {
      const normalized = String(rawValue).trim();
      const isDecimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized);
      if (!isDecimal)
        throw new ValidationError(`${key} must be a valid number.`);
      return Number(normalized);
    }

    case "confirm":
      return parseBoolean(rawValue);

    case "select":
      return resolveChoice(rawValue, definition.choices ?? [], key);

    case "multi": {
      const incoming = Array.isArray(rawValue)
        ? rawValue
        : splitMulti(rawValue);
      return incoming.map((entry) =>
        resolveChoice(entry, definition.choices ?? [], key),
      );
    }

    default: {
      const exhaustive: never = definition.kind;
      throw new ValidationError(
        `Unsupported input type "${String(exhaustive)}".`,
      );
    }
  }
}

async function runValidators(
  definition: InputDefinition<unknown>,
  key: string,
  value: unknown,
  storage: Record<string, unknown>,
): Promise<void> {
  if (value === undefined) return;

  if (definition.kind === "number") {
    if (
      typeof definition.min === "number" &&
      typeof value === "number" &&
      value < definition.min
    ) {
      throw new ValidationError(`${key} must be >= ${definition.min}.`);
    }
    if (
      typeof definition.max === "number" &&
      typeof value === "number" &&
      value > definition.max
    ) {
      throw new ValidationError(`${key} must be <= ${definition.max}.`);
    }
  }

  if (definition.kind === "multi" && Array.isArray(value)) {
    if (typeof definition.min === "number" && value.length < definition.min) {
      throw new ValidationError(
        `${key} must include at least ${definition.min} choice(s).`,
      );
    }
    if (typeof definition.max === "number" && value.length > definition.max) {
      throw new ValidationError(
        `${key} must include at most ${definition.max} choice(s).`,
      );
    }
  }

  for (const validate of definition.validators) {
    const result = await validate(value, { key, storage });
    if (result === true || result === undefined || result === null) continue;
    if (result === false) throw new ValidationError(`${key} is invalid.`);
    if (typeof result === "string") throw new ValidationError(result);
    if (result instanceof Error) throw result;
  }
}

async function applyTransforms(
  definition: InputDefinition<unknown>,
  key: string,
  value: unknown,
  storage: Record<string, unknown>,
): Promise<unknown> {
  let transformed = value;
  for (const transform of definition.transforms) {
    transformed = await transform(transformed, { key, storage });
  }
  return transformed;
}

function buildPromptMessage(
  key: string,
  definition: InputDefinition<unknown>,
): string {
  const label = definition.label ?? titleFromKey(key);
  const optText = definition.optional ? " | optional" : "";

  if (definition.kind === "select" && definition.choices) {
    return `${label} (${definition.choices.join("/")})${optText} : `;
  }
  if (definition.kind === "multi" && definition.choices) {
    return `${label} (${definition.choices.join("/")}) | multiselect${optText} : `;
  }
  if (definition.kind === "confirm") {
    return `${label} (yes/no)${optText} : `;
  }
  const hint = definition.placeholder ? ` (${definition.placeholder})` : "";
  if (definition.optional) return `${label}${hint} | optional : `;
  return `${label}${hint}: `;
}

function askHiddenLine(message: string): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    const characters: string[] = [];
    const previousRawMode = input.isTTY ? input.isRaw : false;

    output.write(message);

    const finish = (value: string) => {
      input.off("data", onData);
      if (input.isTTY) input.setRawMode(previousRawMode);
      output.write("\n");
      resolve(value);
    };

    const onData = (chunk: string | Buffer) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const character of text) {
        if (character === "\r" || character === "\n") {
          finish(characters.join(""));
          return;
        }
        if (character === "\u0003") {
          output.write("^C\n");
          process.exit(130);
        }
        if (character === "\u007f" || character === "\b") {
          if (characters.length > 0) {
            characters.pop();
            output.write("\b \b");
          }
          continue;
        }
        if (character >= " " && character !== "\u007f") {
          characters.push(character);
          output.write("*");
        }
      }
    };

    if (input.isTTY) input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    input.on("data", onData);
  });
}

function askLine(
  message: string,
  options: { mask?: boolean } = {},
): Promise<string> {
  if (options.mask) return askHiddenLine(message);
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdout.isTTY),
    });
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

interface ChoicePromptOptions {
  label: string;
  choices: readonly string[];
  multi: boolean;
  optional: boolean;
}

function askChoiceList(
  options: ChoicePromptOptions,
): Promise<string | string[] | undefined> {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    const previousRawMode = input.isTTY ? input.isRaw : false;
    const selectedIndices = new Set<number>();
    let cursorIndex = 0;
    let renderedLineCount = 0;

    const clearRendered = () => {
      if (renderedLineCount === 0) return;
      output.write(`\u001b[${renderedLineCount}A`);
      for (let i = 0; i < renderedLineCount; i++) output.write("\u001b[2K\r\n");
      output.write(`\u001b[${renderedLineCount}A`);
      renderedLineCount = 0;
    };

    const render = () => {
      const lines: string[] = [options.label];
      for (let i = 0; i < options.choices.length; i++) {
        const choice = options.choices[i] ?? "";
        const isCursor = i === cursorIndex;
        const isSelected = options.multi ? selectedIndices.has(i) : isCursor;
        const marker = isSelected ? "●" : "○";
        const prefix = options.multi ? (isCursor ? "› " : "  ") : "";
        lines.push(`${prefix}${marker} ${choice}`);
      }
      const totalLines = Math.max(renderedLineCount, lines.length);
      if (renderedLineCount > 0) output.write(`\u001b[${renderedLineCount}A`);
      for (let i = 0; i < totalLines; i++) {
        output.write("\u001b[2K\r");
        if (i < lines.length) output.write(lines[i] ?? "");
        output.write("\n");
      }
      renderedLineCount = lines.length;
    };

    const cleanup = () => {
      input.off("data", onData);
      if (input.isTTY) input.setRawMode(previousRawMode);
    };

    const finish = (value: string | string[] | undefined) => {
      cleanup();
      clearRendered();
      if (value === undefined) output.write(`${options.label}: \n`);
      else if (Array.isArray(value))
        output.write(`${options.label}: ${value.join(", ")}\n`);
      else output.write(`${options.label}: ${value}\n`);
      resolve(value);
    };

    const onData = (chunk: string | Buffer) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (let i = 0; i < text.length; i++) {
        const character = text[i] ?? "";
        if (character === "\u0003") {
          cleanup();
          clearRendered();
          output.write("^C\n");
          process.exit(130);
        }
        if (character === "\r" || character === "\n") {
          if (options.multi) {
            const selected = Array.from(selectedIndices)
              .sort((a, b) => a - b)
              .map((idx) => options.choices[idx])
              .filter((c): c is string => c !== undefined);
            finish(selected);
          } else {
            finish(options.choices[cursorIndex] ?? options.choices[0]);
          }
          return;
        }
        if (character === "\u001b") {
          const next = text[i + 1];
          const afterNext = text[i + 2];
          if (next === "[" && (afterNext === "A" || afterNext === "B")) {
            cursorIndex =
              afterNext === "A"
                ? (cursorIndex - 1 + options.choices.length) %
                  options.choices.length
                : (cursorIndex + 1) % options.choices.length;
            render();
            i += 2;
            continue;
          }
          if (options.optional) {
            finish(undefined);
            return;
          }
          continue;
        }
        if (character === "k") {
          cursorIndex =
            (cursorIndex - 1 + options.choices.length) % options.choices.length;
          render();
          continue;
        }
        if (character === "j") {
          cursorIndex = (cursorIndex + 1) % options.choices.length;
          render();
          continue;
        }
        if (options.multi && character === " ") {
          if (selectedIndices.has(cursorIndex))
            selectedIndices.delete(cursorIndex);
          else selectedIndices.add(cursorIndex);
          render();
          continue;
        }
      }
    };

    if (input.isTTY) input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    render();
    input.on("data", onData);
  });
}

function askConfirmChoice(
  message: string,
  optional = false,
): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    const previousRawMode = input.isTTY ? input.isRaw : false;
    let selectedIndex = 1;
    let renderedLineCount = 0;

    const clearRendered = () => {
      if (renderedLineCount === 0) return;
      output.write(`\u001b[${renderedLineCount}A`);
      for (let i = 0; i < renderedLineCount; i++) output.write("\u001b[2K\r\n");
      output.write(`\u001b[${renderedLineCount}A`);
      renderedLineCount = 0;
    };

    const render = () => {
      const yesMarker = selectedIndex === 0 ? "●" : "○";
      const noMarker = selectedIndex === 1 ? "●" : "○";
      const lines = [message, `${yesMarker} Yes / ${noMarker} No`];
      const totalLines = Math.max(renderedLineCount, lines.length);
      if (renderedLineCount > 0) output.write(`\u001b[${renderedLineCount}A`);
      for (let i = 0; i < totalLines; i++) {
        output.write("\u001b[2K\r");
        if (i < lines.length) output.write(lines[i] ?? "");
        output.write("\n");
      }
      renderedLineCount = lines.length;
    };

    const cleanup = () => {
      input.off("data", onData);
      if (input.isTTY) input.setRawMode(previousRawMode);
    };

    const finish = (value: boolean | undefined) => {
      cleanup();
      clearRendered();
      output.write(
        `${message} ${value === undefined ? "" : value ? "Yes" : "No"}\n`,
      );
      resolve(value);
    };

    const onData = (chunk: string | Buffer) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (let i = 0; i < text.length; i++) {
        const character = text[i] ?? "";
        if (character === "\u0003") {
          cleanup();
          clearRendered();
          output.write("^C\n");
          process.exit(130);
        }
        if (character === "\r" || character === "\n") {
          finish(selectedIndex === 0);
          return;
        }
        if (["y", "Y", "h", "k"].includes(character)) {
          selectedIndex = 0;
          render();
          continue;
        }
        if (["n", "N", "j", "l", " "].includes(character)) {
          selectedIndex = 1;
          render();
          continue;
        }
        if (character === "\u001b") {
          const next = text[i + 1];
          const afterNext = text[i + 2];
          if (next === "[" && ["A", "B", "C", "D"].includes(afterNext ?? "")) {
            selectedIndex = afterNext === "A" || afterNext === "D" ? 0 : 1;
            render();
            i += 2;
            continue;
          }
          if (optional) {
            finish(undefined);
            return;
          }
        }
      }
    };

    if (input.isTTY) input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    render();
    input.on("data", onData);
  });
}

function runSpinner(initialLabel: string): {
  update: (newLabel: string) => void;
  stop: () => void;
} {
  const ascii = shouldUseAscii();
  const frames = ascii ? ASCII_SPINNER_FRAMES : BRAILLE_FRAMES;
  let frameIndex = 0;
  let currentLabel = initialLabel;
  const interval = setInterval(() => {
    process.stdout.write(
      `\r\u001b[2K${frames[frameIndex % frames.length]} ${currentLabel}`,
    );
    frameIndex++;
  }, 80);
  return {
    update(newLabel: string) {
      currentLabel = newLabel;
    },
    stop() {
      clearInterval(interval);
      process.stdout.write("\r\u001b[2K");
    },
  };
}

function normalizePromptConfig<TPrompts extends PromptBuilderMap>(
  configFactory: (builder: BuilderFactory) => CLIConfig<TPrompts>,
): {
  description: string | undefined;
  definitions: Record<string, InputDefinition<unknown>>;
} {
  const config = configFactory(createBuilders());
  const definitions: Record<string, InputDefinition<unknown>> = {};
  for (const [key, builder] of Object.entries(config.prompts)) {
    if (!builder || !(BUILDER_MARK in builder)) {
      throw new TypeError(
        `Prompt "${key}" must be created with the builder API.`,
      );
    }
    definitions[key] = builder.toDefinition() as InputDefinition<unknown>;
  }
  return { description: config.description, definitions };
}

function clearObject(object: Record<string, unknown>): void {
  for (const key of Object.keys(object)) delete object[key];
}

export function createCLI<const TPrompts extends PromptBuilderMap>(
  configFactory: (builder: BuilderFactory) => CLIConfig<TPrompts>,
): CLI<TPrompts> {
  if (typeof configFactory !== "function") {
    throw new TypeError("createCLI() expects a configuration function.");
  }

  const { description, definitions } = normalizePromptConfig(configFactory);
  const symbols = getSymbols();
  const command = new Command();
  const storageRecord: Record<string, unknown> = {};
  const storage = storageRecord as StorageFromPrompts<TPrompts>;
  const resolvedKeys = new Set<string>();
  const optionMeta = new Map<string, string>();

  let parsedOptions: Record<string, unknown> = {};
  let parsed = false;
  let argvOverride: string[] | undefined;

  command.name("oscli");
  if (description) command.description(description);
  command.allowExcessArguments(true);
  command.exitOverride((error) => {
    throw error;
  });

  for (const [key, definition] of Object.entries(definitions)) {
    const flagName = toFlagName(key);
    const propertyName = toCommanderProperty(flagName);
    const descriptionText =
      definition.description ?? definition.label ?? `${key} value`;
    optionMeta.set(key, propertyName);

    let option: Option;
    if (definition.kind === "multi") {
      option = new Option(`--${flagName} <value>`, descriptionText).argParser(
        (value: string, previous: string[] = []) => [
          ...previous,
          ...splitMulti(value),
        ],
      );
    } else if (definition.kind === "confirm") {
      option = new Option(`--${flagName} <value>`, descriptionText).argParser(
        parseBoolean,
      );
    } else {
      option = new Option(`--${flagName} <value>`, descriptionText);
    }
    command.addOption(option);
  }

  function emit(type: SymbolName, message: string): void {
    writeLine(`${symbols[type]} ${message}`);
  }

  function parseArgs(): Record<string, unknown> {
    if (parsed) return parsedOptions;
    command.parse(argvOverride ?? process.argv, { from: "node" });
    parsedOptions = command.opts<Record<string, unknown>>();
    parsed = true;
    return parsedOptions;
  }

  function canPrompt(): boolean {
    return (
      Boolean(process.stdin.isTTY) &&
      Boolean(process.stdout.isTTY) &&
      !process.env.CI
    );
  }

  async function resolveFinalValue(
    key: string,
    definition: InputDefinition<unknown>,
    rawValue: unknown,
  ): Promise<unknown> {
    if (isBlank(rawValue)) {
      if (definition.optional) return undefined;
      throw new ValidationError(`${key} is required.`);
    }
    const coerced = coerceValue(definition, key, rawValue);
    await runValidators(definition, key, coerced, storageRecord);
    const transformed = await applyTransforms(
      definition,
      key,
      coerced,
      storageRecord,
    );
    await runValidators(definition, key, transformed, storageRecord);
    return transformed;
  }

  async function promptForValue(
    key: string,
    definition: InputDefinition<unknown>,
  ): Promise<unknown> {
    if (!canPrompt()) {
      if (definition.optional) return undefined;
      throw new ValidationError(
        `No value provided for "${key}" and prompts are unavailable in non-interactive mode.`,
      );
    }

    while (true) {
      let answer: unknown;
      if (
        (definition.kind === "select" || definition.kind === "multi") &&
        definition.choices
      ) {
        answer = await askChoiceList({
          label: definition.label ?? titleFromKey(key),
          choices: definition.choices,
          multi: definition.kind === "multi",
          optional: definition.optional,
        });
      } else if (definition.kind === "confirm") {
        answer = await askConfirmChoice(
          definition.label ?? titleFromKey(key),
          definition.optional,
        );
      } else {
        answer = await askLine(buildPromptMessage(key, definition), {
          mask: definition.kind === "password",
        });
      }

      if (answer === undefined && definition.optional) return undefined;
      if (typeof answer === "string" && isBlank(answer) && definition.optional)
        return undefined;

      try {
        return await resolveFinalValue(key, definition, answer);
      } catch (error) {
        if (error instanceof ValidationError) {
          emit("warn", error.message);
          continue;
        }
        throw error;
      }
    }
  }

  async function resolvePrompt<K extends keyof TPrompts & string>(
    key: K,
  ): Promise<StorageFromPrompts<TPrompts>[K]> {
    if (!(key in definitions)) throw new Error(`Unknown prompt key "${key}".`);
    if (resolvedKeys.has(key)) return storage[key];

    const definition = definitions[key] as InputDefinition<unknown>;
    const options = parseArgs();
    const propertyName = optionMeta.get(key);

    if (propertyName && options[propertyName] !== undefined) {
      storageRecord[key] = await resolveFinalValue(
        key,
        definition,
        options[propertyName],
      );
      resolvedKeys.add(key);
      return storage[key];
    }

    if (definition.hasDefault) {
      storageRecord[key] = await resolveFinalValue(
        key,
        definition,
        cloneDefault(definition.defaultValue),
      );
      resolvedKeys.add(key);
      return storage[key];
    }

    storageRecord[key] = await promptForValue(key, definition);
    resolvedKeys.add(key);
    return storage[key];
  }

  const prompt = {} as PromptResolvers<TPrompts>;
  for (const key of Object.keys(definitions) as Array<
    keyof TPrompts & string
  >) {
    prompt[key] = (() =>
      resolvePrompt(key)) as PromptResolvers<TPrompts>[typeof key];
  }

  const cli: CLI<TPrompts> = {
    storage,
    prompt,

    argv(argv: string[]): CLI<TPrompts> {
      if (!Array.isArray(argv))
        throw new TypeError("cli.argv() expects an argv array.");
      resolvedKeys.clear();
      clearObject(storageRecord);
      argvOverride = [...argv];
      parsed = false;
      parsedOptions = {};
      return this;
    },

    intro(message: string): void {
      emit("prompt", message);
    },

    warn(message: string): void {
      emit("warn", message);
    },

    success(message: string): void {
      emit("ok", message);
    },

    log(level: string, message: string): void {
      const normalized = String(level).toLowerCase();
      if (normalized === "warn" || normalized === "warning") {
        writeLine(`${symbols.warn} [${normalized}] ${message}`);
        return;
      }
      if (normalized === "error") {
        writeLine(`${symbols.err} [${normalized}] ${message}`);
        return;
      }
      writeLine(`${symbols.prompt} [${normalized}] ${message}`);
    },

    async spin<TValue>(
      label: string,
      fn: () => Promise<TValue> | TValue,
    ): Promise<TValue> {
      if (!canUseAnimatedSpinner()) {
        writeLine(
          `${shouldUseAscii() ? ASCII_SPINNER_FRAMES[0] : BRAILLE_FRAMES[0]} ${label}`,
        );
        try {
          const value = await fn();
          writeLine(`${symbols.ok} ${label}`);
          return value;
        } catch (error) {
          writeLine(`${symbols.err} ${label} failed`);
          throw error;
        }
      }

      const spinner = runSpinner(label);
      try {
        const value = await fn();
        spinner.stop();
        writeLine(`${symbols.ok} ${label}`);
        return value;
      } catch (error) {
        spinner.stop();
        writeLine(`${symbols.err} ${label} failed`);
        throw error;
      }
    },

    async confirm(message: string): Promise<boolean> {
      if (!canPrompt()) {
        writeLine(`${symbols.prompt} ${message} [no]`);
        return false;
      }
      const value = await askConfirmChoice(message, false);
      return value ?? false;
    },

    async progress<TItem>(
      label: string,
      items: Iterable<TItem>,
      fn: (item: TItem, index: number, total: number) => Promise<void> | void,
    ): Promise<void> {
      const list = Array.from(items);
      writeLine(`${symbols.prompt} ${label}`);
      if (canUseAnimatedSpinner()) {
        const firstLabel = `1/${list.length} ${String(list[0])}`;
        const spinner = runSpinner(firstLabel);
        for (let i = 0; i < list.length; i++) {
          const item = list[i] as TItem;
          const itemLabel = `${i + 1}/${list.length} ${String(item)}`;
          spinner.update(itemLabel);
          try {
            await fn(item, i, list.length);
          } catch (error) {
            spinner.stop();
            writeLine(`${symbols.err} ${itemLabel}`);
            throw error;
          }
        }
        spinner.stop();
      } else {
        for (let i = 0; i < list.length; i++) {
          const item = list[i] as TItem;
          const itemLabel = `${i + 1}/${list.length} ${String(item)}`;
          writeLine(
            `${shouldUseAscii() ? ASCII_SPINNER_FRAMES[0] : BRAILLE_FRAMES[0]} ${itemLabel}`,
          );
          try {
            await fn(item, i, list.length);
            writeLine(`${symbols.ok} ${itemLabel}`);
          } catch (error) {
            writeLine(`${symbols.err} ${itemLabel}`);
            throw error;
          }
        }
      }
      writeLine(`${symbols.ok} ${label}`);
    },

    table(
      title: string,
      columns: readonly string[],
      rows: ReadonlyArray<ReadonlyArray<unknown>>,
    ): void {
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new TypeError("table() expects at least one column.");
      }
      const safeRows = Array.isArray(rows) ? rows : [];
      if (title) writeLine(`${symbols.prompt} ${title}`);

      const widths = columns.map((col, ci) => {
        const cellMax = safeRows.reduce(
          (max, row) => Math.max(max, String(row[ci] ?? "").length),
          0,
        );
        return Math.max(String(col).length, cellMax);
      });

      writeLine(
        columns.map((col, i) => String(col).padEnd(widths[i] ?? 0)).join(" | "),
      );
      writeLine(widths.map((w) => "-".repeat(w)).join("-+-"));
      for (const row of safeRows) {
        writeLine(
          columns
            .map((_, i) => String(row[i] ?? "").padEnd(widths[i] ?? 0))
            .join(" | "),
        );
      }
    },

    exit(message?: string): never {
      if (message) writeLine(`${symbols.err} ${message}`);
      throw new CLIExitError(message);
    },

    outro(message: string): never {
      emit("ok", message);
      if (!isProcessExitDisabled()) process.exit(0);
      throw new CLIOutroError(message);
    },

    async run(
      fn: () => Promise<void> | void,
      options: { argv?: string[] } = {},
    ): Promise<{ cancelled: false } | { cancelled: true; message: string }> {
      if (typeof fn !== "function")
        throw new TypeError("cli.run() expects a function.");

      resolvedKeys.clear();
      clearObject(storageRecord);

      if (Array.isArray(options.argv)) {
        argvOverride = [...options.argv];
        parsed = false;
      }

      parseArgs();

      try {
        await fn();
        return { cancelled: false };
      } catch (error) {
        if (error instanceof CLIOutroError) return { cancelled: false };
        if (error instanceof CLIExitError)
          return { cancelled: true, message: error.message };
        throw error;
      }
    },
  };

  return cli;
}
