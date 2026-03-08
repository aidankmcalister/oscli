import { Command, CommanderError, Option } from "commander";
import { createBuilder } from "./builder";
import {
  clearPersistentCorner,
  createLogChain,
  createStyleBuilder,
  isRailEnabled,
  isOutputSuppressed,
  renderLink,
  setOutputSuppressed,
  setRailEnabled,
  type LogChain,
  type LogLevel,
  type StyleBuilder,
  writeLine,
  writeSectionGap,
  writeSectionLine,
  writeSectionLines,
} from "./output";
import {
  renderConfirmPrompt,
  renderDatePrompt,
  renderListPrompt,
  renderMultiselectPrompt,
  renderNumberPrompt,
  renderPasswordPrompt,
  renderSearchPrompt,
  renderSelectPrompt,
  renderTextPrompt,
  type PromptSubmitResult,
  writePromptSummary,
} from "./primitives/prompt";
import { box as renderBox } from "./primitives/box";
import { diff as renderDiff } from "./primitives/diff";
import { renderDivider } from "./primitives/divider";
import { progress as runProgress } from "./primitives/progress";
import { spin as runSpinner } from "./primitives/spinner";
import { table as renderTable } from "./primitives/table";
import { tree as renderTree, type TreeNode } from "./primitives/tree";
import { createStorage } from "./storage";
import { suggest as suggestValue } from "./suggest";
import {
  activeTheme as theme,
  applyTheme,
  type ColorName,
  type ThemePreset,
  type ThemeOverride,
  themePresets,
} from "./theme";

type PromptLike<TValue = unknown> = {
  readonly __valueType: TValue;
  config(): unknown;
};

type FlagLike<TValue = unknown> = {
  readonly __valueType: TValue;
  config(): unknown;
};

type PromptDefinitions = Record<string, PromptLike>;
type FlagDefinitions = Record<string, FlagLike>;

type InferPromptValue<TBuilder> =
  TBuilder extends PromptLike<infer TValue> ? TValue : never;

type InferFlagValue<TBuilder> = TBuilder extends FlagLike<infer TValue>
  ? TValue
  : never;

type StorageShape<TPrompts extends PromptDefinitions> = {
  [K in keyof TPrompts]: InferPromptValue<TPrompts[K]>;
};

type FlagsShape<TFlags extends FlagDefinitions> = {
  [K in keyof TFlags]: InferFlagValue<TFlags[K]>;
};

type PromptFns<TPrompts extends PromptDefinitions> = {
  [K in keyof TPrompts]: () => Promise<StorageShape<TPrompts>[K]>;
};

type CLIConfig<
  TPrompts extends PromptDefinitions,
  TFlags extends FlagDefinitions,
> = {
  description?: string;
  prompts?: TPrompts;
  flags?: TFlags;
  theme?: ThemeOverride | ThemePreset;
  autocompleteHint?: string;
  json?: boolean;
  emojis?: boolean;
};

type RuntimePromptConfig = {
  type?: string;
  label?: string;
  describe?: string;
  placeholder?: string;
  defaultValue?: unknown;
  hasDefault?: boolean;
  optional?: boolean;
  validate?: (value: unknown) => true | string | Promise<true | string>;
  transform?: (value: unknown) => unknown;
  theme?: string;
  promptColor?: ColorName;
  choices?: readonly string[];
  rules?: Partial<Record<string, string>>;
  min?: number;
  max?: number;
  prefix?: string;
  format?: string;
  confirmMode?: "toggle" | "simple";
};

type RuntimeFlagConfig = {
  type?: "string" | "boolean" | "number";
  label?: string;
  defaultValue?: unknown;
  hasDefault?: boolean;
  optional?: boolean;
  choices?: readonly unknown[];
};

type PromptResolution =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

type CommandHandler = () => Promise<void> | void;

type StreamName = "stdout" | "stderr";

export type ExitCode = "usage" | "auth" | "not_found" | "network" | "error";

export interface ExitOptions {
  hint?: string;
  code?: number | ExitCode;
}

export interface TestOptions<
  TPrompts extends PromptDefinitions,
  TFlags extends FlagDefinitions,
> {
  inputs?: Partial<Record<keyof TPrompts, unknown>>;
  flags?: Partial<FlagsShape<TFlags>>;
  argv?: string[];
}

export interface TestResult<
  TPrompts extends PromptDefinitions,
  TFlags extends FlagDefinitions,
> {
  storage: Partial<StorageShape<TPrompts>>;
  flags: FlagsShape<TFlags>;
  output: string;
  exitCode: number;
}

const EXIT_CODE_MAP: Record<ExitCode, number> = {
  usage: 2,
  auth: 3,
  not_found: 4,
  network: 5,
  error: 1,
};

async function resolvePromptValue(
  config: RuntimePromptConfig,
  rawValue: unknown,
): Promise<PromptResolution> {
  const maybeOptional =
    config.optional && rawValue === "" ? undefined : rawValue;

  const transformed = config.transform
    ? config.transform(maybeOptional)
    : maybeOptional;

  if (config.validate) {
    const validation = await config.validate(transformed);
    if (validation !== true) {
      return {
        ok: false,
        error: validation,
      };
    }
  }

  return {
    ok: true,
    value: transformed,
  };
}

function hasPromptDefault(config: RuntimePromptConfig): boolean {
  return config.hasDefault === true;
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

  return format.replace(/YYYY/g, year).replace(/MM/g, month).replace(/DD/g, day);
}

function promptFlagUsage(
  promptName: string,
  config: RuntimePromptConfig,
): string {
  if (config.type === "confirm") {
    return `--${promptName}`;
  }

  if (config.type === "multiselect" || config.type === "list") {
    return `--${promptName} <value...>`;
  }

  return `--${promptName} <value>`;
}

export function resolveExitCode(code: number | ExitCode | undefined): number {
  if (typeof code === "number") {
    return code;
  }

  return EXIT_CODE_MAP[code ?? "error"];
}

function normalizeCommanderMessage(message: string): string {
  return message.replace(/^error:\s*/i, "");
}

function extractUnknownCommand(message: string): string | null {
  const match = message.match(/unknown command '([^']+)'/i);
  return match?.[1] ?? null;
}

function createPromptBypassOption(
  promptName: string,
  config: RuntimePromptConfig,
): Option | null {
  switch (config.type) {
    case "confirm":
      return new Option(`--${promptName}`, "");
    case "multiselect":
    case "list":
      return new Option(`--${promptName} <value...>`, "");
    case "number":
    case "text":
    case "password":
    case "select":
    case "search":
    case "date":
      return new Option(`--${promptName} <value>`, "");
    default:
      return null;
  }
}

function coercePromptBypassValue(
  promptName: string,
  config: RuntimePromptConfig,
  rawValue: unknown,
): unknown {
  switch (config.type) {
    case "number": {
      const parsed =
        typeof rawValue === "number" ? rawValue : Number(String(rawValue ?? ""));
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid value for --${promptName}: expected a number.`);
      }
      return parsed;
    }

    case "confirm":
      if (typeof rawValue === "boolean") {
        return rawValue;
      }
      if (typeof rawValue === "string") {
        const normalized = rawValue.trim().toLowerCase();
        if (["1", "true", "t", "y", "yes"].includes(normalized)) {
          return true;
        }
        if (["0", "false", "f", "n", "no"].includes(normalized)) {
          return false;
        }
      }
      throw new Error(`Invalid value for --${promptName}: expected y/n.`);

    case "multiselect":
    case "list": {
      const values = Array.isArray(rawValue)
        ? rawValue.map((value) => String(value).trim()).filter(Boolean)
        : String(rawValue ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

      if (
        config.choices &&
        values.some((value) => !config.choices?.includes(value))
      ) {
        throw new Error(
          `Invalid value for --${promptName}. Expected values from: ${config.choices.join(", ")}.`,
        );
      }

      return values;
    }

    case "select":
    case "search":
      if (typeof rawValue !== "string") {
        throw new Error(`Invalid value for --${promptName}: expected a string.`);
      }
      if (config.choices && !config.choices.includes(rawValue)) {
        throw new Error(
          `Invalid value for --${promptName}. Expected one of: ${config.choices.join(", ")}.`,
        );
      }
      return rawValue;

    case "date": {
      const format = config.format ?? "YYYY-MM-DD";
      const parsed = parseDateByFormat(String(rawValue ?? "").trim(), format);
      if (!parsed) {
        throw new Error(`Invalid value for --${promptName}. Expected ${format}.`);
      }
      return parsed;
    }

    case "text":
    case "password":
      return typeof rawValue === "string" ? rawValue : String(rawValue ?? "");

    default:
      return rawValue;
  }
}

function resolveFlagValue(
  flagName: string,
  config: RuntimeFlagConfig,
  rawValue: unknown,
  source: string | undefined,
): unknown {
  let value: unknown;

  if (source === "cli" || source === "test") {
    value = rawValue;
  } else if (config.hasDefault) {
    value = config.defaultValue;
  } else if (config.optional) {
    value = undefined;
  } else if (config.type === "boolean") {
    value = false;
  } else {
    value = undefined;
  }

  if (value === undefined) {
    return value;
  }

  if (config.type === "number") {
    const parsed =
      typeof value === "number" ? value : Number(String(value).trim());

    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid value for --${flagName}: expected a number.`);
    }

    value = parsed;
  }

  if (config.type === "boolean" && typeof value !== "boolean") {
    value = Boolean(value);
  }

  if (config.choices && !config.choices.includes(value)) {
    throw new Error(
      `Invalid value for --${flagName}. Expected one of: ${config.choices.join(", ")}.`,
    );
  }

  return value;
}

async function renderByType(
  config: RuntimePromptConfig,
  fallbackLabel: string,
  summaryWidth?: number,
): Promise<unknown> {
  const label = config.label ?? fallbackLabel;
  const resolve = async (value: unknown): Promise<PromptSubmitResult<unknown>> => {
    const result = await resolvePromptValue(config, value);
    if (result.ok === false) {
      return result;
    }

    return {
      ok: true,
      value: result.value,
      summaryValue: formatPromptSummaryValue(config, result.value),
    };
  };

  switch (config.type) {
    case "text":
      return renderTextPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "string" ? config.defaultValue : undefined,
        resolve,
      });

    case "password":
      return renderPasswordPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "string" ? config.defaultValue : undefined,
        resolve,
      });

    case "number":
      return renderNumberPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        min: config.min,
        max: config.max,
        prefix: config.prefix,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "number" ? config.defaultValue : undefined,
        resolve,
      });

    case "select":
      if (!config.choices) {
        throw new Error(`Select prompt "${label}" missing choices.`);
      }
      return renderSelectPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        choices: config.choices,
        rules: config.rules,
        resolve,
      });

    case "search":
      if (!config.choices) {
        throw new Error(`Search prompt "${label}" missing choices.`);
      }
      return renderSearchPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        choices: config.choices,
        rules: config.rules,
        placeholder: config.placeholder,
        resolve,
      });

    case "multiselect":
      if (!config.choices) {
        throw new Error(`Multiselect prompt "${label}" missing choices.`);
      }
      return renderMultiselectPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        choices: config.choices,
        min: config.min,
        max: config.max,
        resolve,
      });

    case "list":
      return renderListPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        min: config.min,
        max: config.max,
        placeholder: config.placeholder,
        resolve,
      });

    case "date":
      return renderDatePrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        summaryWidth,
        format: config.format,
        placeholder: config.placeholder,
        defaultValue:
          config.defaultValue instanceof Date ? config.defaultValue : undefined,
        resolve,
      });

    case "confirm":
      return renderConfirmPrompt({
        label,
        describe: config.describe,
        promptColor: config.promptColor,
        confirmMode: config.confirmMode,
        summaryWidth,
        defaultValue:
          typeof config.defaultValue === "boolean" ? config.defaultValue : undefined,
        resolve,
      });

    default:
      throw new Error(`Unknown prompt type for "${label}".`);
  }
}

function formatPromptSummaryValue(
  config: RuntimePromptConfig,
  value: unknown,
): string {
  switch (config.type) {
    case "password":
      return typeof value === "string" ? "*".repeat(value.length) : "";
    case "multiselect":
    case "list":
      return Array.isArray(value) ? value.join(", ") : String(value ?? "");
    case "confirm":
      return value ? "yes" : "no";
    case "date":
      return value instanceof Date
        ? formatDateValue(value, config.format ?? "YYYY-MM-DD")
        : String(value ?? "");
    default:
      return String(value ?? "");
  }
}

function clearStorage<T extends Record<string, unknown>>(storage: Partial<T>): void {
  for (const key of Object.keys(storage) as Array<keyof T>) {
    delete storage[key];
  }
}

function resolveTheme(
  value: ThemeOverride | ThemePreset | undefined,
): ThemeOverride {
  if (typeof value === "string") {
    return themePresets[value] ?? {};
  }

  return value ?? {};
}

export function createCLI<
  TPrompts extends PromptDefinitions = {},
  TFlags extends FlagDefinitions = {},
>(
  configFn: (b: ReturnType<typeof createBuilder>) => CLIConfig<TPrompts, TFlags>,
) {
  const config = configFn(createBuilder());
  const resolvedThemeOverride = resolveTheme(config.theme);
  const promptDefs = (config.prompts ?? {}) as TPrompts;
  const flagDefs = (config.flags ?? {}) as TFlags;
  const runtimePromptConfigs = new Map<keyof TPrompts, RuntimePromptConfig>();
  const runtimeFlagConfigs = new Map<keyof TFlags, RuntimeFlagConfig>();

  if (Object.prototype.hasOwnProperty.call(flagDefs, "yes")) {
    throw new Error("Flag name 'yes' is reserved by oscli. Use a different name.");
  }

  if (Object.prototype.hasOwnProperty.call(flagDefs, "no-color")) {
    throw new Error("Flag 'no-color' is reserved by oscli.");
  }

  if (config.json && Object.prototype.hasOwnProperty.call(flagDefs, "json")) {
    throw new Error("Flag name 'json' is reserved by oscli. Use a different name.");
  }

  for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
    runtimePromptConfigs.set(key, promptDefs[key].config() as RuntimePromptConfig);
  }

  for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
    runtimeFlagConfigs.set(key, flagDefs[key].config() as RuntimeFlagConfig);
  }

  const summaryWidth = Math.max(
    0,
    ...Object.keys(promptDefs).map((key) => {
      const runtimeConfig = runtimePromptConfigs.get(key as keyof TPrompts);
      return (runtimeConfig?.label ?? key).length;
    }),
  );

  const storage = createStorage<StorageShape<TPrompts>>();
  const prompt = {} as PromptFns<TPrompts>;
  const flags = {} as FlagsShape<TFlags>;
  const promptBypassValues = new Map<keyof TPrompts, unknown>();
  const commandHandlers = new Map<string, CommandHandler>();
  const testInputs = new Map<keyof TPrompts, unknown>();
  let testFlagOverrides: Partial<FlagsShape<TFlags>> | null = null;
  let mainHandler: CommandHandler | undefined;
  let autoYes = false;
  let isTTY = process.stdout.isTTY === true;
  let noColor =
    process.env.NO_COLOR !== undefined ||
    process.env.TERM === "dumb" ||
    process.argv.includes("--no-color");
  let resolvedTheme = applyTheme(resolvedThemeOverride, noColor);
  let exitInterceptor: ((code: number) => never) | null = null;
  let jsonMode = false;
  let resultValue: unknown;
  let hasResult = false;

  function initializeFlags(): void {
    for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
      const runtimeConfig = runtimeFlagConfigs.get(key);
      if (!runtimeConfig) {
        continue;
      }

      const name = String(key);
      if (runtimeConfig.hasDefault) {
        (flags as Record<string, unknown>)[name] = runtimeConfig.defaultValue;
      } else if (runtimeConfig.type === "boolean" && !runtimeConfig.optional) {
        (flags as Record<string, unknown>)[name] = false;
      } else {
        (flags as Record<string, unknown>)[name] = undefined;
      }
    }
  }

  initializeFlags();

  const _writeLine = (
    line: string,
    stream: StreamName = "stdout",
  ) => {
    writeSectionLine(line, stream);
  };

  const _writeInlineLine = (
    line: string,
    stream: StreamName = "stdout",
  ) => {
    writeLine(line, stream);
  };

  const executeExit = (code: number): never => {
    if (exitInterceptor) {
      return exitInterceptor(code);
    }

    process.exit(code);
  };

  const exitWithMessage = (
    message: string,
    options: ExitOptions = {},
    extraHint?: string,
  ): never => {
    const shouldCloseRail = isRailEnabled() && theme.symbols.outro.length > 0;
    clearPersistentCorner();
    writeLine(
      `${theme.layout.indent}${theme.color.error(theme.symbols.error)} ${theme.color.error(message)}`,
      "stderr",
    );

    if (options.hint) {
      writeLine(
        `${theme.layout.indent}${theme.layout.indent}${theme.color.dim(`→ ${options.hint}`)}`,
        "stderr",
      );
    }

    if (extraHint) {
      writeLine(
        `${theme.layout.indent}${theme.layout.indent}${theme.color.dim(extraHint)}`,
        "stderr",
      );
    }

    if (shouldCloseRail) {
      setRailEnabled(false);
      writeLine(theme.color.border(theme.symbols.outro), "stderr");
    }

    return executeExit(resolveExitCode(options.code));
  };

  const failNonInteractivePrompt = (
    promptName: string,
    runtimeConfig: RuntimePromptConfig,
  ): never => {
    return exitWithMessage(
      `Prompt "${promptName}" requires input but no default or flag was provided.`,
      {
        hint: `Pass ${promptFlagUsage(promptName, runtimeConfig)} or set a default in the prompt definition.`,
        code: "usage",
      },
    );
  };

  const registerOptions = (target: Command): void => {
    for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
      const runtimeConfig = runtimeFlagConfigs.get(key);
      if (!runtimeConfig) {
        continue;
      }

      const option =
        runtimeConfig.type === "boolean"
          ? new Option(`--${String(key)}`, runtimeConfig.label ?? "")
          : new Option(`--${String(key)} <value>`, runtimeConfig.label ?? "");

      if (runtimeConfig.choices) {
        option.choices(runtimeConfig.choices.map((choice) => String(choice)));
      }

      target.addOption(option);
    }

    for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
      if (Object.prototype.hasOwnProperty.call(flagDefs, String(key))) {
        continue;
      }

      if (
        String(key) === "yes" ||
        String(key) === "no-color" ||
        (config.json === true && String(key) === "json")
      ) {
        continue;
      }

      const runtimeConfig = runtimePromptConfigs.get(key);
      if (!runtimeConfig) {
        continue;
      }

      const option = createPromptBypassOption(String(key), runtimeConfig);
      if (!option) {
        continue;
      }

      if (runtimeConfig.type === "password") {
        option.hideHelp();
      }

      if (
        (runtimeConfig.type === "select" ||
          runtimeConfig.type === "search" ||
          runtimeConfig.type === "multiselect") &&
        runtimeConfig.choices
      ) {
        option.choices(runtimeConfig.choices.map((choice) => String(choice)));
      }

      target.addOption(option);
    }

    target.option("-y, --yes", "Answer yes to all confirmation prompts");
    target.option("--no-color", "Disable ANSI colors");
    if (config.json === true) {
      target.option("--json", "Output JSON only");
    }
  };

  const getOptionSource = (program: Command, parser: Command, name: string) => {
    return parser.getOptionValueSource(name) ?? program.getOptionValueSource(name);
  };

  const getOptions = (parser: Command): Record<string, unknown> => {
    if (typeof parser.optsWithGlobals === "function") {
      return parser.optsWithGlobals() as Record<string, unknown>;
    }

    return parser.opts() as Record<string, unknown>;
  };

  const hydrateRuntime = async (program: Command, parser: Command) => {
    clearStorage(storage.data as Partial<StorageShape<TPrompts>>);
    initializeFlags();
    promptBypassValues.clear();

    const opts = getOptions(parser);
    autoYes = opts.yes === true;
    jsonMode = config.json === true && opts.json === true;
    setOutputSuppressed(jsonMode);
    cli._jsonMode = jsonMode;

    for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
      const runtimeConfig = runtimeFlagConfigs.get(key);
      if (!runtimeConfig) {
        continue;
      }

      const name = String(key);
      const hasTestOverride = testFlagOverrides
        ? Object.prototype.hasOwnProperty.call(testFlagOverrides, key)
        : false;
      const rawValue = hasTestOverride
        ? (testFlagOverrides as Record<string, unknown>)[name]
        : opts[name];
      const source = hasTestOverride
        ? "test"
        : getOptionSource(program, parser, name);

      let resolved: unknown;
      try {
        resolved = resolveFlagValue(name, runtimeConfig, rawValue, source);
      } catch (error) {
        if (error instanceof Error) {
          exitWithMessage(error.message, { code: "usage" });
        }
        throw error;
      }

      (flags as Record<string, unknown>)[name] = resolved;
    }

    for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
      const runtimeConfig = runtimePromptConfigs.get(key);
      if (!runtimeConfig) {
        continue;
      }

      const name = String(key);
      const hasFlagOverride = testFlagOverrides
        ? Object.prototype.hasOwnProperty.call(testFlagOverrides, key)
        : false;
      const source = hasFlagOverride
        ? "test"
        : getOptionSource(program, parser, name);

      if (source !== "cli" && source !== "test") {
        continue;
      }

      let bypassRaw: unknown;
      try {
        bypassRaw = Object.prototype.hasOwnProperty.call(flagDefs, name)
          ? (flags as Record<string, unknown>)[name]
          : coercePromptBypassValue(name, runtimeConfig, opts[name]);
      } catch (error) {
        if (error instanceof Error) {
          exitWithMessage(error.message, { code: "usage" });
        }
        throw error;
      }

      const resolved = await resolvePromptValue(runtimeConfig, bypassRaw);
      if (resolved.ok === false) {
        exitWithMessage(resolved.error, { code: "usage" });
      }

      const finalValue = (resolved as { ok: true; value: unknown }).value;
      storage.set(key, finalValue as StorageShape<TPrompts>[typeof key]);
      promptBypassValues.set(key, finalValue);
    }
  };

  function log(message: string): LogChain;
  function log(
    level: Exclude<LogLevel, "plain">,
    message: string,
  ): LogChain;
  function log(
    levelOrMessage: Exclude<LogLevel, "plain"> | string,
    maybeMessage?: string,
  ): LogChain {
    if (maybeMessage === undefined) {
      return createLogChain("plain", levelOrMessage, (renderedMessage) => {
        _writeLine(`${theme.layout.indent}${theme.color.value(renderedMessage)}`);
      });
    }

    const level = levelOrMessage as Exclude<LogLevel, "plain">;
    const symbol =
      level === "info"
        ? theme.color.info(theme.symbols.info)
        : level === "warn"
          ? theme.color.warning(theme.symbols.warning)
          : level === "error"
            ? theme.color.error(theme.symbols.error)
            : theme.color.success(theme.symbols.success);

    const colorize =
      level === "info"
        ? theme.color.info
        : level === "warn"
          ? theme.color.warning
          : level === "error"
            ? theme.color.error
            : theme.color.success;

    return createLogChain(level, maybeMessage, (renderedMessage) => {
      _writeLine(
        `${theme.layout.indent}${symbol} ${colorize(renderedMessage)}`,
        level === "error" ? "stderr" : "stdout",
      );
    });
  }

  const cli = {
    storage: storage.data as Partial<StorageShape<TPrompts>>,
    flags,
    prompt,
    _theme: resolvedTheme,
    _isTTY: isTTY,
    _noColor: noColor,
    _jsonMode: jsonMode,
    _writeLine,
    suggest: suggestValue,
    command: (name: string, fn: () => Promise<void> | void) => {
      commandHandlers.set(name, fn);
    },
    run: async (fn?: () => Promise<void> | void) => {
      if (fn) {
        mainHandler = fn;
      }

      const program = new Command();
      const registeredCommandNames = [...commandHandlers.keys()];
      let handled = false;

      isTTY = process.stdout.isTTY === true;
      noColor =
        process.env.NO_COLOR !== undefined ||
        process.env.TERM === "dumb" ||
        process.argv.includes("--no-color");
      jsonMode = false;
      hasResult = false;
      resultValue = undefined;
      setOutputSuppressed(false);
      clearPersistentCorner();
      resolvedTheme = applyTheme(resolvedThemeOverride, noColor);
      cli._theme = resolvedTheme;
      cli._isTTY = isTTY;
      cli._noColor = noColor;
      cli._jsonMode = jsonMode;

      program.name("oscli");
      if (config.description) {
        program.description(config.description);
      }

      program.showSuggestionAfterError(false);
      program.configureOutput({
        outputError: () => {},
      });
      program.exitOverride();
      registerOptions(program);

      if (commandHandlers.size === 0) {
        program.action(async () => {
          handled = true;
          await hydrateRuntime(program, program);

          const handler = fn ?? mainHandler;
          if (!handler) {
            throw new Error("run() requires a handler in single-command mode.");
          }

          await handler();
        });
      } else {
        for (const [name, handler] of commandHandlers) {
          const command = program.command(name);
          registerOptions(command);
          command.action(async () => {
            handled = true;
            await hydrateRuntime(program, command);
            await handler();
          });
        }
      }

      try {
        await program.parseAsync(process.argv);

        if (commandHandlers.size > 0 && !handled) {
          program.outputHelp();
        }

        if (jsonMode && hasResult) {
          process.stdout.write(`${JSON.stringify(resultValue, null, 2)}\n`);
        }
      } catch (error) {
        if (error instanceof CommanderError) {
          if (error.exitCode === 0) {
            return;
          }

          if (
            error.code === "commander.unknownCommand" ||
            (error.code === "commander.excessArguments" && process.argv[2])
          ) {
            const unknownCommand =
              extractUnknownCommand(error.message) ?? process.argv[2] ?? null;
            const hint =
              unknownCommand === null
                ? undefined
                : suggestValue(unknownCommand, registeredCommandNames) ?? undefined;

            exitWithMessage(
              unknownCommand === null
                ? normalizeCommanderMessage(error.message)
                : `Unknown command: "${unknownCommand}"`,
              hint
                ? { hint: `Did you mean: ${hint}?`, code: "usage" }
                : { code: "usage" },
              config.autocompleteHint,
            );
          }

          if (error.code === "commander.unknownOption") {
            exitWithMessage(normalizeCommanderMessage(error.message), {
              code: "usage",
            }, config.autocompleteHint);
          }

          exitWithMessage(normalizeCommanderMessage(error.message), {
            code: "usage",
          });
        }

        throw error;
      }
    },
    test: async (
      options: TestOptions<TPrompts, TFlags> = {},
    ): Promise<TestResult<TPrompts, TFlags>> => {
      const originalArgv = process.argv;
      const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
      const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");
      const stdoutWrite = process.stdout.write.bind(process.stdout);
      const stderrWrite = process.stderr.write.bind(process.stderr);
      const originalExit = process.exit;
      let output = "";
      let exitCode = 0;
      const EXIT_SENTINEL = "__OSCLI_TEST_EXIT__";

      process.argv = ["node", "oscli", ...(options.argv ?? [])];
      Object.defineProperty(process.stdout, "isTTY", {
        configurable: true,
        value: false,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        configurable: true,
        value: false,
      });

      process.stdout.write = ((chunk: string | Uint8Array) => {
        output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
        return true;
      }) as typeof process.stdout.write;
      process.stderr.write = ((chunk: string | Uint8Array) => {
        output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
        return true;
      }) as typeof process.stderr.write;
      process.exit = ((code?: string | number | null) => {
        exitCode = typeof code === "number" ? code : Number(code ?? 0) || 0;
        throw new Error(EXIT_SENTINEL) as never;
      }) as typeof process.exit;

      testInputs.clear();
      for (const [key, value] of Object.entries(options.inputs ?? {})) {
        testInputs.set(key as keyof TPrompts, value);
      }
      testFlagOverrides = options.flags ?? null;
      exitInterceptor = (code: number) => {
        exitCode = code;
        throw new Error(EXIT_SENTINEL);
      };

      try {
        await cli.run();
      } catch (error) {
        if (!(error instanceof Error) || error.message !== EXIT_SENTINEL) {
          throw error;
        }
      } finally {
        testInputs.clear();
        testFlagOverrides = null;
        exitInterceptor = null;
        setOutputSuppressed(false);
        clearPersistentCorner();
        process.argv = originalArgv;
        process.stdout.write = stdoutWrite as typeof process.stdout.write;
        process.stderr.write = stderrWrite as typeof process.stderr.write;
        process.exit = originalExit;
        if (stdoutDescriptor) {
          Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
        }
        if (stderrDescriptor) {
          Object.defineProperty(process.stderr, "isTTY", stderrDescriptor);
        }
      }

      return {
        storage: { ...storage.data },
        flags: { ...(flags as Record<string, unknown>) } as FlagsShape<TFlags>,
        output,
        exitCode,
      };
    },
    intro: (message: string) => {
      if (isOutputSuppressed()) {
        return;
      }

      clearPersistentCorner();
      setRailEnabled(false);
      if (resolvedTheme.layout.spacing > 0) {
        process.stdout.write("\n".repeat(resolvedTheme.layout.spacing));
      }
      writeLine(
        `${theme.color.border(theme.symbols.intro)}  ${theme.color.title(message)}`,
      );
      setRailEnabled(true);
      writeSectionGap();
    },
    outro: (message: string) => {
      if (isOutputSuppressed()) {
        return;
      }

      clearPersistentCorner();
      setRailEnabled(false);
      writeLine(
        `${theme.color.border(theme.symbols.outro)}  ${theme.color.title(message)}`,
      );
      if (resolvedTheme.layout.spacing > 0) {
        process.stdout.write("\n".repeat(resolvedTheme.layout.spacing));
      }
    },
    log,
    style: (): StyleBuilder => createStyleBuilder(cli._noColor),
    setResult: (value: unknown) => {
      resultValue = value;
      hasResult = true;
    },
    link: (label: string, url: string) => {
      _writeInlineLine(
        `${theme.layout.indent}${renderLink(label, url, cli._noColor, cli._isTTY)}`,
      );
    },
    divider: (label?: string) => {
      writeSectionLine(renderDivider(label, cli._noColor, cli._isTTY));
    },
    table: (
      headers: string[],
      rows: Array<Array<string | number | boolean | null | undefined>>,
    ) => renderTable(headers, rows),
    tree: (data: TreeNode) => renderTree(data),
    diff: (before: string, after: string) => {
      writeSectionLines(renderDiff(before, after));
    },
    box: (options: { title?: string; content: string }) => {
      writeSectionLines(renderBox(options));
    },
    spin: async <T>(
      label: string,
      fn: () => Promise<T>,
      options?: Parameters<typeof runSpinner>[2],
    ) => {
      return runSpinner(label, fn, {
        ...options,
        isTTY: cli._isTTY,
        noColor: cli._noColor,
      });
    },
    progress: async <TStep extends string>(
      label: string,
      steps: readonly TStep[],
      fn: (step: TStep, index: number) => Promise<void>,
    ) => {
      await runProgress(label, steps, fn, {
        isTTY: cli._isTTY,
        noColor: cli._noColor,
      });
    },
    confirm: async (label: string, defaultValue?: boolean) => {
      if (autoYes) {
        writePromptSummary(label, "(--yes)");
        return true;
      }

      if (!cli._isTTY) {
        if (defaultValue !== undefined) {
          writePromptSummary(label, defaultValue ? "yes" : "no");
          return defaultValue;
        }

        return exitWithMessage(
          `Prompt "${label}" requires input but no default or flag was provided.`,
          {
            hint: "Pass --yes to auto-approve or provide a default value.",
            code: "usage",
          },
        );
      }

      return renderConfirmPrompt({
        label,
        confirmMode: "simple",
        defaultValue,
      });
    },
    success: (message: string) => {
      _writeLine(
        `${theme.layout.indent}${theme.color.success(theme.symbols.success)} ${theme.color.success(message)}`,
      );
    },
    exit: (message: string, options?: ExitOptions): never => {
      return exitWithMessage(message, options);
    },
  };

  for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
    prompt[key] = (async () => {
      const runtimeConfig = runtimePromptConfigs.get(key);
      if (!runtimeConfig) {
        throw new Error(`Unknown prompt "${String(key)}".`);
      }

      const label = runtimeConfig.label ?? String(key);

      if (testInputs.has(key)) {
        const inputValue = testInputs.get(key);
        const resolved = await resolvePromptValue(runtimeConfig, inputValue);
        if (resolved.ok === false) {
          return exitWithMessage(resolved.error, { code: "usage" });
        }

        const finalValue = (resolved as { ok: true; value: unknown }).value as StorageShape<TPrompts>[typeof key];
        storage.set(key, finalValue);
        writePromptSummary(
          label,
          formatPromptSummaryValue(runtimeConfig, finalValue),
          summaryWidth,
        );
        return finalValue;
      }

      if (promptBypassValues.has(key)) {
        const bypassValue = promptBypassValues.get(key) as StorageShape<TPrompts>[typeof key];
        promptBypassValues.delete(key);
        storage.set(key, bypassValue);
        writePromptSummary(
          label,
          formatPromptSummaryValue(runtimeConfig, bypassValue),
          summaryWidth,
        );
        return bypassValue;
      }

      if (runtimeConfig.type === "confirm" && autoYes) {
        const value = true as StorageShape<TPrompts>[typeof key];
        storage.set(key, value);
        writePromptSummary(label, "(--yes)", summaryWidth);
        return value;
      }

      if (!cli._isTTY) {
        if (hasPromptDefault(runtimeConfig)) {
          const resolved = await resolvePromptValue(
            runtimeConfig,
            runtimeConfig.defaultValue,
          );

          if (resolved.ok === false) {
            return exitWithMessage(resolved.error, { code: "usage" });
          }

          const finalValue = (resolved as { ok: true; value: unknown }).value as StorageShape<TPrompts>[typeof key];
          storage.set(key, finalValue);
          writePromptSummary(
            label,
            formatPromptSummaryValue(runtimeConfig, finalValue),
            summaryWidth,
          );
          return finalValue;
        }

        if (runtimeConfig.optional) {
          const resolved = await resolvePromptValue(runtimeConfig, undefined);
          if (resolved.ok === false) {
            return exitWithMessage(resolved.error, { code: "usage" });
          }

          const finalValue = (resolved as { ok: true; value: unknown }).value as StorageShape<TPrompts>[typeof key];
          storage.set(key, finalValue);
          return finalValue;
        }

        return failNonInteractivePrompt(String(key), runtimeConfig);
      }

      const finalValue = (await renderByType(
        runtimeConfig,
        String(key),
        summaryWidth,
      )) as StorageShape<TPrompts>[typeof key];

      storage.set(key, finalValue);
      return finalValue;
    }) as PromptFns<TPrompts>[typeof key];
  }

  return cli;
}
