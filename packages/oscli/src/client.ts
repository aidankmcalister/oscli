import type {
  Command as CommanderCommand,
  Option as CommanderOption,
} from "commander";
import { createBuilder } from "./builder";
import { formatDateValue, parseDateByFormat } from "./date";
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
import { ascii as renderAscii, type AsciiStyle } from "./primitives/ascii";
import { box as renderBox } from "./primitives/box";
import { diff as renderDiff } from "./primitives/diff";
import { renderDivider } from "./primitives/divider";
import type { ProgressRenderOptions } from "./primitives/progress";
import type { SpinnerOptions } from "./primitives/spinner";
import { table as renderTable } from "./primitives/table";
import { tree as renderTree, type TreeNode } from "./primitives/tree";
import { createStorage } from "./storage";
import { suggest as suggestValue } from "./suggest";
import * as pc from "picocolors";
import {
  activeTheme as theme,
  applyTheme,
  colorFormatters,
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

export type TitleStyle = {
  color?: ColorName;
  uppercase?: boolean;
  bold?: boolean;
};

export type TitleConfig = string | { text: string; style?: TitleStyle };

type CLIConfig<
  TPrompts extends PromptDefinitions,
  TFlags extends FlagDefinitions,
> = {
  title?: TitleConfig;
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

export type AnimateEvent =
  | { type: "intro"; message: string }
  | { type: "prompt_start"; key: string; label: string; promptType: string }
  | {
      type: "prompt_preview";
      key: string;
      label: string;
      promptType: string;
      lines: string[];
    }
  | { type: "char"; key: string; value: string; full: string }
  | {
      type: "prompt_submit";
      key: string;
      label: string;
      displayValue: string;
    }
  | { type: "outro"; message: string }
  | { type: "run_complete" }
  | { type: "loop_restart" }
  | { type: "spin_start"; label: string }
  | { type: "spin_complete"; label: string }
  | {
      type: "progress_start";
      label: string;
      steps: string[];
      currentStepIndex: number;
      percent: number;
    }
  | {
      type: "progress_update";
      label: string;
      steps: string[];
      currentStepIndex: number;
      percent: number;
    }
  | {
      type: "progress_complete";
      label: string;
      steps: string[];
      currentStepIndex: number;
      percent: number;
    }
  | { type: "log_line"; level: string; message: string }
  | { type: "box_render"; title?: string; content: string }
  | { type: "success_line"; message: string };

export interface AnimateOptions<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
> {
  inputs: Partial<TInputs>;
  ignoreDefaults?: boolean;
  timing?: {
    typeDelay?: number;
    promptDelay?: number;
    completionDelay?: number;
    loop?: boolean;
    loopDelay?: number;
  };
}

type ResolvedAnimateTiming = {
  typeDelay: number;
  promptDelay: number;
  completionDelay: number;
  loop: boolean;
  loopDelay: number;
};

const MIN_ANIMATE_SPIN_DURATION = 1000;
const MIN_ANIMATE_PROGRESS_STEP_DURATION = 700;

let spinnerModulePromise: Promise<typeof import("./primitives/spinner")> | null = null;
let progressModulePromise: Promise<typeof import("./primitives/progress")> | null = null;
let commanderModulePromise: Promise<typeof import("commander")> | null = null;

function loadSpinnerModule() {
  spinnerModulePromise ??= import("./primitives/spinner");
  return spinnerModulePromise;
}

function loadProgressModule() {
  progressModulePromise ??= import("./primitives/progress");
  return progressModulePromise;
}

function loadCommanderModule() {
  // Keep commander out of browser bundles that only use createCLI().animate().
  commanderModulePromise ??= import(
    /* webpackIgnore: true */
    "commander"
  );
  return commanderModulePromise;
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

function resolveExitCode(code: number | ExitCode | undefined): number {
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
  OptionCtor: typeof CommanderOption,
): CommanderOption | null {
  switch (config.type) {
    case "confirm":
      return new OptionCtor(`--${promptName}`, "");
    case "multiselect":
    case "list":
      return new OptionCtor(`--${promptName} <value...>`, "");
    case "number":
    case "text":
    case "password":
    case "select":
    case "search":
    case "date":
      return new OptionCtor(`--${promptName} <value>`, "");
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

function wait(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, delay));
  });
}

function humanizePause(baseDelay: number, variance = 0.18): number {
  if (baseDelay <= 0) {
    return 0;
  }

  const min = 1 - variance;
  const max = 1 + variance;
  const multiplier = min + Math.random() * (max - min);
  return Math.max(0, Math.round(baseDelay * multiplier));
}

function humanizeTypeDelay(
  baseDelay: number,
  sequence: string,
  index: number,
): number {
  if (baseDelay <= 0) {
    return 0;
  }

  const char = sequence[index] ?? "";
  let delay = baseDelay;
  const lastIndex = Math.max(0, sequence.length - 1);
  const progress = lastIndex === 0 ? 1 : index / lastIndex;

  if (index === 0) {
    delay *= 1.55;
  } else if (progress < 0.3) {
    delay *= 1.12;
  } else if (progress > 0.8) {
    delay *= 1.2;
  } else {
    delay *= 0.9;
  }

  if (char === " ") {
    delay *= 1.45;
  } else if (/[.,!?;:]/.test(char)) {
    delay *= 1.8;
  } else if (/[-_/]/.test(char)) {
    delay *= 1.25;
  }

  return humanizePause(delay, 0.2);
}

function resolveAnimateTiming(
  timing?: AnimateOptions["timing"],
): ResolvedAnimateTiming {
  return {
    typeDelay: timing?.typeDelay ?? 85,
    promptDelay: timing?.promptDelay ?? 360,
    completionDelay: timing?.completionDelay ?? 620,
    loop: timing?.loop ?? false,
    loopDelay: timing?.loopDelay ?? 1500,
  };
}

function hasOwnKey<T extends object>(
  target: T,
  key: PropertyKey,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function coerceAnimateValue(
  config: RuntimePromptConfig,
  rawValue: unknown,
): unknown {
  switch (config.type) {
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
      return Boolean(rawValue);

    case "number":
      return typeof rawValue === "number" ? rawValue : Number(rawValue);

    case "date":
      if (rawValue instanceof Date) {
        return rawValue;
      }
      if (typeof rawValue === "string") {
        return (
          parseDateByFormat(rawValue.trim(), config.format ?? "YYYY-MM-DD") ??
          rawValue
        );
      }
      return rawValue;

    case "multiselect":
    case "list":
      if (Array.isArray(rawValue)) {
        return rawValue.map((value) => String(value));
      }
      if (rawValue === undefined || rawValue === null) {
        return [];
      }
      return [String(rawValue)];

    default:
      return rawValue;
  }
}

function resolveAnimateChoiceLabel(
  config: RuntimePromptConfig,
  rawValue: unknown,
): string {
  const needle = String(rawValue ?? "");
  const match = config.choices?.find((choice) => String(choice) === needle);
  return String(match ?? rawValue ?? "");
}

function resolveTitleText(config: { title?: TitleConfig }): string {
  if (config.title) {
    return typeof config.title === "string" ? config.title : config.title.text;
  }
  return "";
}

function resolveTitleStyle(config: { title?: TitleConfig }): TitleStyle | undefined {
  if (config.title && typeof config.title === "object") {
    return config.title.style;
  }
  return undefined;
}

function renderStyledTitle(
  text: string,
  style: TitleStyle | undefined,
  fallbackColor: (s: string) => string,
): string {
  let result = style?.uppercase ? text.toUpperCase() : text;
  if (style?.color) {
    result = colorFormatters[style.color](result);
    if (style.bold) {
      result = pc.bold(result);
    }
  } else if (style?.bold) {
    result = pc.bold(fallbackColor(result));
  } else {
    result = fallbackColor(result);
  }
  return result;
}

function deriveAnimateIntroMessage(title?: string): string {
  return title?.trim() ?? "";
}

function deriveAnimateOutroMessage(
  title: string | undefined,
  resolvedValues: Map<string, unknown>,
): string {
  const normalized = title?.trim().toLowerCase() ?? "";
  const primaryValue =
    typeof resolvedValues.get("project") === "string"
      ? (resolvedValues.get("project") as string)
      : typeof resolvedValues.get("name") === "string"
        ? (resolvedValues.get("name") as string)
        : null;

  if (!primaryValue) {
    return "";
  }

  if (normalized.includes("create")) {
    return `Created ${primaryValue}`;
  }

  if (normalized.includes("init")) {
    return `Initialized ${primaryValue}`;
  }

  return "";
}

function resolveTheme(
  value: ThemeOverride | ThemePreset | undefined,
): ThemeOverride {
  if (typeof value === "string") {
    return themePresets[value] ?? {};
  }

  return value ?? {};
}

function animatePromptType(config: RuntimePromptConfig): string {
  if (config.type === "confirm") {
    return config.confirmMode === "simple" ? "confirm-simple" : "confirm-toggle";
  }

  return config.type ?? "unknown";
}

async function* animatePromptSequence(
  key: string,
  label: string,
  config: RuntimePromptConfig,
  rawValue: unknown,
  timing: ResolvedAnimateTiming,
  options?: {
    ignoreDefaults?: boolean;
  },
): AsyncGenerator<AnimateEvent, unknown> {
  const value = coerceAnimateValue(config, rawValue);
  let finalValue = value;
  const resolved = await resolvePromptValue(config, value);
  if (resolved.ok) {
    finalValue = resolved.value;
  }

  if (config.type === "list") {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      yield {
        type: "prompt_start",
        key,
        label,
        promptType: animatePromptType(config),
      };

      await wait(humanizePause(timing.promptDelay));

      const sequence = String(item ?? "");
      let typed = "";
      for (const [index, char] of Array.from(sequence).entries()) {
        typed += char;
        yield {
          type: "char",
          key,
          value: char,
          full: typed,
        };
        await wait(humanizeTypeDelay(timing.typeDelay, sequence, index));
      }

      yield {
        type: "prompt_submit",
        key,
        label,
        displayValue: typed,
      };

      await wait(humanizePause(timing.completionDelay));
    }

    return finalValue;
  }

  yield {
    type: "prompt_start",
    key,
    label,
    promptType: animatePromptType(config),
  };

  if (config.type === "select" || config.type === "search") {
    const startIndex = 0;
    const targetIndex = resolveAnimateChoiceIndex(config, value, startIndex);

    yield {
      type: "prompt_preview",
      key,
      label,
      promptType: animatePromptType(config),
      lines: buildSelectPreviewLines(config, startIndex),
    };

    await wait(
      humanizePause(Math.max(timing.promptDelay, timing.typeDelay * 1.8, 120)),
    );

    for (const index of moveIndexToward(startIndex, targetIndex)) {
      yield {
        type: "prompt_preview",
        key,
        label,
        promptType: animatePromptType(config),
        lines: buildSelectPreviewLines(config, index),
      };
      await wait(humanizePause(Math.max(timing.typeDelay * 1.8, 120)));
    }
  } else if (config.type === "multiselect") {
    const choices = config.choices ?? [];
    const defaultValues = new Set(
      options?.ignoreDefaults
        ? []
        : Array.isArray(config.defaultValue)
          ? config.defaultValue.map((entry) => String(entry))
          : [],
    );
    const targetValues = new Set(
      Array.isArray(value) ? value.map((entry) => String(entry)) : [],
    );
    let activeIndex = 0;
    let currentSelections = new Set(defaultValues);

    yield {
      type: "prompt_preview",
      key,
      label,
      promptType: animatePromptType(config),
      lines: buildMultiselectPreviewLines(
        config,
        activeIndex,
        currentSelections,
      ),
    };

    await wait(
      humanizePause(Math.max(timing.promptDelay, timing.typeDelay * 2.2, 200)),
    );

    const choiceOrder = choices.map((choice, index) => ({
      label: String(choice),
      index,
    }));
    const toggles = choiceOrder.filter(({ label: choiceLabel }) =>
      currentSelections.has(choiceLabel) !== targetValues.has(choiceLabel),
    );

    for (const toggle of toggles) {
      for (const index of moveIndexToward(activeIndex, toggle.index)) {
        activeIndex = index;
        yield {
          type: "prompt_preview",
          key,
          label,
          promptType: animatePromptType(config),
          lines: buildMultiselectPreviewLines(
            config,
            activeIndex,
            currentSelections,
          ),
        };
        await wait(humanizePause(Math.max(timing.typeDelay * 2.2, 200)));
      }

      const keyLabel = toggle.label;
      if (currentSelections.has(keyLabel)) {
        currentSelections.delete(keyLabel);
      } else {
        currentSelections.add(keyLabel);
      }

      yield {
        type: "prompt_preview",
        key,
        label,
        promptType: animatePromptType(config),
        lines: buildMultiselectPreviewLines(
          config,
          activeIndex,
          currentSelections,
        ),
      };
      await wait(humanizePause(Math.max(timing.typeDelay * 2.2, 240)));
    }
  } else if (config.type === "confirm" && config.confirmMode === "toggle") {
    const startValue = true;
    const targetValue = Boolean(value);

    yield {
      type: "prompt_preview",
      key,
      label,
      promptType: animatePromptType(config),
      lines: buildConfirmPreviewLines(startValue),
    };

    await wait(
      humanizePause(Math.max(timing.promptDelay, timing.typeDelay * 3, 340)),
    );

    if (startValue !== targetValue) {
      yield {
        type: "prompt_preview",
        key,
        label,
        promptType: animatePromptType(config),
        lines: buildConfirmPreviewLines(targetValue),
      };
    }

    await wait(humanizePause(Math.max(timing.typeDelay * 3, 340)));
  } else {
    await wait(humanizePause(timing.promptDelay));
  }

  const sequence = animateCharSequence(config, value);
  if (sequence !== null) {
    let typed = "";
    for (const [index, char] of Array.from(sequence).entries()) {
      typed += char;
      yield {
        type: "char",
        key,
        value: char,
        full: typed,
      };
      await wait(humanizeTypeDelay(timing.typeDelay, sequence, index));
    }
  }

  let displayValue = formatPromptSummaryValue(config, finalValue);
  if (config.type === "select" || config.type === "search") {
    displayValue = resolveAnimateChoiceLabel(config, finalValue);
  } else if (config.type === "multiselect") {
    displayValue = Array.isArray(finalValue)
      ? finalValue
          .map((item) => resolveAnimateChoiceLabel(config, item))
          .join(", ")
      : String(finalValue ?? "");
  }

  yield {
    type: "prompt_submit",
    key,
    label,
    displayValue,
  };

  await wait(humanizePause(timing.completionDelay));

  return finalValue;
}

function animateCharSequence(
  config: RuntimePromptConfig,
  value: unknown,
): string | null {
  switch (config.type) {
    case "text":
    case "number":
      return String(value ?? "");
    case "date":
      return value instanceof Date
        ? formatDateValue(value, config.format ?? "YYYY-MM-DD")
        : String(value ?? "");
    case "password":
      return "*".repeat(String(value ?? "").length);
    case "search":
      return resolveAnimateChoiceLabel(config, value);
    case "confirm":
      if (config.confirmMode === "simple") {
        return value ? "y" : "n";
      }
      return null;
    default:
      return null;
  }
}

function resolveAnimateChoiceIndex(
  config: RuntimePromptConfig,
  rawValue: unknown,
  fallbackIndex = 0,
): number {
  const choices = config.choices ?? [];
  if (choices.length === 0) {
    return 0;
  }

  const label = resolveAnimateChoiceLabel(config, rawValue);
  const index = choices.findIndex((choice) => String(choice) === label);
  return index >= 0 ? index : Math.max(0, Math.min(fallbackIndex, choices.length - 1));
}

function buildSelectPreviewLines(
  config: RuntimePromptConfig,
  activeIndex: number,
): string[] {
  const choices = config.choices ?? [];
  return [
    ...choices.map((choice, index) => {
      const isActive = index === activeIndex;
      const cursor = isActive ? theme.symbols.cursor : " ";
      const radio = isActive ? theme.symbols.radio_on : theme.symbols.radio_off;
      return `${cursor} ${radio} ${choice}`;
    }),
    "↑↓ navigate   enter select",
  ];
}

function buildMultiselectPreviewLines(
  config: RuntimePromptConfig,
  activeIndex: number,
  selectedValues: Set<string>,
): string[] {
  const choices = config.choices ?? [];
  return [
    ...choices.map((choice, index) => {
      const choiceValue = String(choice);
      const isActive = index === activeIndex;
      const isSelected = selectedValues.has(choiceValue);
      const cursor = isActive ? theme.symbols.cursor : " ";
      const icon = isSelected ? theme.symbols.check_on : theme.symbols.check_off;
      return `${cursor} ${icon} ${choice}`;
    }),
    "↑↓ navigate   space toggle   enter confirm",
  ];
}

function buildConfirmPreviewLines(value: boolean): string[] {
  return [
    value
      ? `${theme.symbols.radio_on} Yes  /  ${theme.symbols.radio_off} No`
      : `${theme.symbols.radio_off} Yes  /  ${theme.symbols.radio_on} No`,
  ];
}

function moveIndexToward(current: number, target: number): number[] {
  const frames: number[] = [];
  let pointer = current;
  while (pointer !== target) {
    pointer += pointer < target ? 1 : -1;
    frames.push(pointer);
  }
  return frames;
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
  let animateEventPush: ((event: AnimateEvent) => void) | null = null;
  let activeAnimateTiming: ResolvedAnimateTiming | null = null;
  let animateIgnoreDefaults = false;
  let autoYes = false;
  let isTTY = false;
  let noColor = false;
  let resolvedTheme = applyTheme(resolvedThemeOverride, false);
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

  const registerOptions = (
    target: CommanderCommand,
    OptionCtor: typeof CommanderOption,
  ): void => {
    for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
      const runtimeConfig = runtimeFlagConfigs.get(key);
      if (!runtimeConfig) {
        continue;
      }

      const option =
        runtimeConfig.type === "boolean"
          ? new OptionCtor(`--${String(key)}`, runtimeConfig.label ?? "")
          : new OptionCtor(
              `--${String(key)} <value>`,
              runtimeConfig.label ?? "",
            );

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

      const option = createPromptBypassOption(
        String(key),
        runtimeConfig,
        OptionCtor,
      );
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

  const getOptionSource = (
    program: CommanderCommand,
    parser: CommanderCommand,
    name: string,
  ) => {
    return parser.getOptionValueSource(name) ?? program.getOptionValueSource(name);
  };

  const getOptions = (parser: CommanderCommand): Record<string, unknown> => {
    if (typeof parser.optsWithGlobals === "function") {
      return parser.optsWithGlobals() as Record<string, unknown>;
    }

    return parser.opts() as Record<string, unknown>;
  };

  const hydrateRuntime = async (
    program: CommanderCommand,
    parser: CommanderCommand,
  ) => {
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
        if (animateEventPush) {
          animateEventPush({ type: "log_line", level: "plain", message: renderedMessage });
          return;
        }
        _writeLine(`${theme.layout.indent}${theme.color.value(renderedMessage)}`);
      });
    }

    const level = levelOrMessage as Exclude<LogLevel, "plain">;
    return createLogChain(level, maybeMessage, (renderedMessage) => {
      if (animateEventPush) {
        animateEventPush({ type: "log_line", level, message: renderedMessage });
        return;
      }

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

      _writeLine(
        `${theme.layout.indent}${symbol} ${colorize(renderedMessage)}`,
        level === "error" ? "stderr" : "stdout",
      );
    });
  }

  // TODO: Step 2 — cli.animate() browser adapter
  // A framework-agnostic event emitter variant that streams animation
  // events (prompt_start, keypress, prompt_submit, run_complete) so
  // React/Svelte/Vue components can render the animation without a TTY.
  const _promptConfigs: Record<string, RuntimePromptConfig> = {};
  for (const [key, value] of runtimePromptConfigs) {
    _promptConfigs[String(key)] = value;
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
    _promptConfigs,
    suggest: suggestValue,
    animate: async function* (
      options: AnimateOptions<Record<Extract<keyof TPrompts, string>, unknown>>,
    ): AsyncGenerator<AnimateEvent> {
      const timing = resolveAnimateTiming(options.timing);

      while (true) {
        clearStorage(storage.data as Partial<StorageShape<TPrompts>>);
        promptBypassValues.clear();
        testInputs.clear();

        const resolvedValues = new Map<string, unknown>();
        const introMessage = deriveAnimateIntroMessage(resolveTitleText(config));
        const ignoreDefaults = options.ignoreDefaults === true;

        if (introMessage.length > 0) {
          yield {
            type: "intro",
            message: introMessage,
          };
        }

        if (mainHandler) {
          for (const [key, value] of Object.entries(options.inputs)) {
            testInputs.set(key as keyof TPrompts, value);
          }

          activeAnimateTiming = timing;
          animateIgnoreDefaults = ignoreDefaults;

          const pendingEvents: AnimateEvent[] = [];
          let handlerDone = false;
          let notifyDrain: (() => void) | null = null;

          animateEventPush = (event: AnimateEvent) => {
            pendingEvents.push(event);
            notifyDrain?.();
            notifyDrain = null;
          };

          const waitForActivity = () =>
            new Promise<void>((resolve) => {
              if (pendingEvents.length > 0 || handlerDone) {
                resolve();
              } else {
                notifyDrain = resolve;
              }
            });

          try {
            const handlerPromise = Promise.resolve()
              .then(() => mainHandler!())
              .finally(() => {
                handlerDone = true;
                notifyDrain?.();
                notifyDrain = null;
              });

            while (!handlerDone || pendingEvents.length > 0) {
              await waitForActivity();
              while (pendingEvents.length > 0) {
                yield pendingEvents.shift()!;
              }
            }

            await handlerPromise;
          } finally {
            animateEventPush = null;
            activeAnimateTiming = null;
            animateIgnoreDefaults = false;
            testInputs.clear();
          }
        } else {
          for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
            const runtimeConfig = runtimePromptConfigs.get(key);
            if (!runtimeConfig || !runtimeConfig.type) {
              continue;
            }

            const name = String(key);
            const label = runtimeConfig.label ?? name;
            const hasInput = hasOwnKey(options.inputs, name);
            const rawValue = hasInput
              ? options.inputs[name]
              : ignoreDefaults
                ? undefined
                : hasPromptDefault(runtimeConfig)
                  ? runtimeConfig.defaultValue
                  : undefined;

            if (rawValue === undefined) {
              continue;
            }

            const animation = animatePromptSequence(
              name,
              label,
              runtimeConfig,
              rawValue,
              timing,
              { ignoreDefaults },
            );

            while (true) {
              const step = await animation.next();
              if (step.done) {
                resolvedValues.set(name, step.value);
                break;
              }
              yield step.value;
            }
          }

          yield {
            type: "outro",
            message: deriveAnimateOutroMessage(resolveTitleText(config), resolvedValues),
          };
        }

        yield { type: "run_complete" };

        if (!timing.loop) {
          return;
        }

        await wait(humanizePause(timing.loopDelay, 0.08));
        yield { type: "loop_restart" };
      }
    },
    main: (fn: CommandHandler) => {
      mainHandler = fn;
    },
    command: (name: string, fn: () => Promise<void> | void) => {
      commandHandlers.set(name, fn);
    },
    run: async (fn?: () => Promise<void> | void) => {
      if (fn) {
        mainHandler = fn;
      }

      const { Command, CommanderError, Option } = await loadCommanderModule();
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

      const titleText = resolveTitleText(config);
      program.name("oscli");
      if (titleText) {
        program.description(titleText);
      }

      program.showSuggestionAfterError(false);
      program.configureOutput({
        outputError: () => {},
      });
      program.exitOverride();
      registerOptions(program, Option);

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
          registerOptions(command, Option);
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
    intro: (message: string, style?: TitleStyle) => {
      if (animateEventPush) {
        animateEventPush({ type: "intro", message });
        return;
      }
      if (isOutputSuppressed()) {
        return;
      }

      const titleStyle = style ?? resolveTitleStyle(config);

      clearPersistentCorner();
      setRailEnabled(false);
      if (resolvedTheme.layout.spacing > 0) {
        process.stdout.write("\n".repeat(resolvedTheme.layout.spacing));
      }
      writeLine(
        `${theme.color.border(theme.symbols.intro)}  ${renderStyledTitle(message, titleStyle, theme.color.title)}`,
      );
      setRailEnabled(true);
      writeSectionGap();
    },
    outro: (message: string) => {
      if (animateEventPush) {
        animateEventPush({ type: "outro", message });
        return;
      }
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
      writeSectionLine(renderDivider(label));
    },
    table: (
      headers: string[],
      rows: Array<Array<string | number | boolean | null | undefined>>,
    ) => renderTable(headers, rows),
    tree: (data: TreeNode) => renderTree(data),
    diff: (before: string, after: string) => {
      writeSectionLines(renderDiff(before, after));
    },
    ascii: (text: string, style?: AsciiStyle) => {
      const lines = renderAscii(text);
      if (lines.length === 0) {
        return;
      }
      const colorize = style?.color
        ? (s: string) => {
            let result = colorFormatters[style.color!](s);
            if (style.bold) result = pc.bold(result);
            if (style.dim) result = pc.dim(result);
            return result;
          }
        : style?.bold
          ? (s: string) => pc.bold(s)
          : style?.dim
            ? (s: string) => pc.dim(s)
            : (s: string) => s;
      for (const line of lines) {
        writeLine(colorize(line));
      }
      writeSectionGap();
    },
    box: (options: { title?: string; content: string }) => {
      if (animateEventPush) {
        animateEventPush({ type: "box_render", title: options.title, content: options.content });
        return;
      }
      writeSectionLines(renderBox(options));
    },
    spin: async <T>(
      label: string,
      fn: () => Promise<T>,
      options?: SpinnerOptions,
    ) => {
      if (animateEventPush) {
        const startedAt = Date.now();
        animateEventPush({ type: "spin_start", label });
        try {
          const result = await fn();
          const remaining = Math.max(
            0,
            MIN_ANIMATE_SPIN_DURATION - (Date.now() - startedAt),
          );
          if (remaining > 0) {
            await wait(remaining);
          }
          animateEventPush({ type: "spin_complete", label });
          return result;
        } catch (error) {
          const remaining = Math.max(
            0,
            MIN_ANIMATE_SPIN_DURATION - (Date.now() - startedAt),
          );
          if (remaining > 0) {
            await wait(remaining);
          }
          throw error;
        }
      }
      const { spin: runSpinner } = await loadSpinnerModule();
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
      if (animateEventPush) {
        const progressSteps = steps.map((step) => String(step));
        const total = progressSteps.length;

        if (total === 0) {
          animateEventPush({
            type: "progress_complete",
            label,
            steps: progressSteps,
            currentStepIndex: 0,
            percent: 100,
          });
          return;
        }

        animateEventPush({
          type: "progress_start",
          label,
          steps: progressSteps,
          currentStepIndex: 0,
          percent: 0,
        });

        for (let index = 0; index < steps.length; index += 1) {
          const step = steps[index] as TStep;
          const startedAt = Date.now();
          await fn(step, index);

          const remaining = Math.max(
            0,
            MIN_ANIMATE_PROGRESS_STEP_DURATION - (Date.now() - startedAt),
          );
          if (remaining > 0) {
            await wait(remaining);
          }

          if (index < steps.length - 1) {
            animateEventPush({
              type: "progress_update",
              label,
              steps: progressSteps,
              currentStepIndex: index + 1,
              percent: Math.round(((index + 1) / total) * 100),
            });
          }
        }

        animateEventPush({
          type: "progress_complete",
          label,
          steps: progressSteps,
          currentStepIndex: progressSteps.length - 1,
          percent: 100,
        });
        return;
      }

      const { progress: runProgress } = await loadProgressModule();
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
      if (animateEventPush) {
        animateEventPush({ type: "success_line", message });
        return;
      }
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
      const animatePromptValue = async (
        rawValue: unknown,
      ): Promise<
        | { animated: false }
        | { animated: true; value: StorageShape<TPrompts>[typeof key] }
      > => {
        if (!animateEventPush || !activeAnimateTiming) {
          return { animated: false };
        }

        const animation = animatePromptSequence(
          String(key),
          label,
          runtimeConfig,
          rawValue,
          activeAnimateTiming,
          { ignoreDefaults: animateIgnoreDefaults },
        );

        while (true) {
          const step = await animation.next();
          if (step.done) {
            return {
              animated: true,
              value: step.value as StorageShape<TPrompts>[typeof key],
            };
          }

          animateEventPush(step.value);
        }
      };

      if (testInputs.has(key)) {
        const inputValue = testInputs.get(key);
        const animated = await animatePromptValue(inputValue);
        if (animated.animated) {
          storage.set(key, animated.value);
          return animated.value;
        }

        const resolved = await resolvePromptValue(runtimeConfig, inputValue);
        if (resolved.ok === false) {
          return exitWithMessage(resolved.error, { code: "usage" });
        }

        const finalValue = (resolved as { ok: true; value: unknown }).value as StorageShape<TPrompts>[typeof key];
        storage.set(key, finalValue);
        if (!animateEventPush) {
          writePromptSummary(
            label,
            formatPromptSummaryValue(runtimeConfig, finalValue),
            summaryWidth,
          );
        }
        return finalValue;
      }

      if (promptBypassValues.has(key)) {
        const bypassValue = promptBypassValues.get(key) as StorageShape<TPrompts>[typeof key];
        promptBypassValues.delete(key);
        const animated = await animatePromptValue(bypassValue);
        if (animated.animated) {
          storage.set(key, animated.value);
          return animated.value;
        }

        storage.set(key, bypassValue);
        if (!animateEventPush) {
          writePromptSummary(
            label,
            formatPromptSummaryValue(runtimeConfig, bypassValue),
            summaryWidth,
          );
        }
        return bypassValue;
      }

      if (runtimeConfig.type === "confirm" && autoYes) {
        const value = true as StorageShape<TPrompts>[typeof key];
        storage.set(key, value);
        if (!animateEventPush) {
          writePromptSummary(label, "(--yes)", summaryWidth);
        }
        return value;
      }

      if (!cli._isTTY) {
        if (animateEventPush && activeAnimateTiming && animateIgnoreDefaults) {
          return failNonInteractivePrompt(String(key), runtimeConfig);
        }

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
