import { formatDateValue, parseDateByFormat } from "./date";
import {
  activeTheme as theme,
  colorFormatters,
} from "./theme";
import * as pc from "picocolors";

import type { AnimateEvent, AnimateOptions, TitleConfig, TitleStyle, RuntimePromptConfig } from "./types";
import { resolvePromptValue, formatPromptSummaryValue } from "./coerce";

export type ResolvedAnimateTiming = {
  typeDelay: number;
  promptDelay: number;
  completionDelay: number;
  loop: boolean;
  loopDelay: number;
};


export const MIN_ANIMATE_SPIN_DURATION = 1000;
export const MIN_ANIMATE_PROGRESS_STEP_DURATION = 700;

export function wait(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, delay));
  });
}

export function humanizePause(baseDelay: number, variance = 0.18): number {
  if (baseDelay <= 0) {
    return 0;
  }

  const min = 1 - variance;
  const max = 1 + variance;
  const multiplier = min + Math.random() * (max - min);
  return Math.max(0, Math.round(baseDelay * multiplier));
}

export function humanizeTypeDelay(
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

export function resolveAnimateTiming(
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

export function hasOwnKey<T extends object>(
  target: T,
  key: PropertyKey,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function coerceAnimateValue(
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

export function resolveAnimateChoiceLabel(
  config: RuntimePromptConfig,
  rawValue: unknown,
): string {
  const needle = String(rawValue ?? "");
  const match = config.choices?.find((choice) => String(choice) === needle);
  return String(match ?? rawValue ?? "");
}

export function resolveTitleText(config: { title?: TitleConfig }): string {
  if (config.title) {
    return typeof config.title === "string" ? config.title : config.title.text;
  }
  return "";
}

export function resolveTitleStyle(config: { title?: TitleConfig }): TitleStyle | undefined {
  if (config.title && typeof config.title === "object") {
    return config.title.style;
  }
  return undefined;
}

export function renderStyledTitle(
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

export function deriveAnimateIntroMessage(title?: string): string {
  return title?.trim() ?? "";
}

export function deriveAnimateOutroMessage(
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

export function animatePromptType(config: RuntimePromptConfig): string {
  if (config.type === "confirm") {
    return config.confirmMode === "simple" ? "confirm-simple" : "confirm-toggle";
  }

  return config.type ?? "unknown";
}

export function animateCharSequence(
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

export function resolveAnimateChoiceIndex(
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

export function buildSelectPreviewLines(
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

export function buildMultiselectPreviewLines(
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

export function buildConfirmPreviewLines(value: boolean): string[] {
  return [
    value
      ? `${theme.symbols.radio_on} Yes  /  ${theme.symbols.radio_off} No`
      : `${theme.symbols.radio_off} Yes  /  ${theme.symbols.radio_on} No`,
  ];
}

export function moveIndexToward(current: number, target: number): number[] {
  const frames: number[] = [];
  let pointer = current;
  while (pointer !== target) {
    pointer += pointer < target ? 1 : -1;
    frames.push(pointer);
  }
  return frames;
}

// ─── Type-specific preview sub-generators ────────────────────────────────────

async function* animateSelectPreview(
  key: string,
  label: string,
  config: RuntimePromptConfig,
  value: unknown,
  timing: ResolvedAnimateTiming,
): AsyncGenerator<AnimateEvent> {
  const promptType = animatePromptType(config);
  const startIndex = 0;
  const targetIndex = resolveAnimateChoiceIndex(config, value, startIndex);
  const selectDelay = Math.max(timing.promptDelay, timing.typeDelay * 1.8, 120);

  yield { type: "prompt_preview", key, label, promptType, lines: buildSelectPreviewLines(config, startIndex) };
  await wait(humanizePause(selectDelay));

  for (const index of moveIndexToward(startIndex, targetIndex)) {
    yield { type: "prompt_preview", key, label, promptType, lines: buildSelectPreviewLines(config, index) };
    await wait(humanizePause(Math.max(timing.typeDelay * 1.8, 120)));
  }
}

async function* animateMultiselectPreview(
  key: string,
  label: string,
  config: RuntimePromptConfig,
  value: unknown,
  timing: ResolvedAnimateTiming,
  ignoreDefaults: boolean,
): AsyncGenerator<AnimateEvent> {
  const promptType = animatePromptType(config);
  const choices = config.choices ?? [];
  const defaultValues = new Set(
    ignoreDefaults || !Array.isArray(config.defaultValue)
      ? []
      : config.defaultValue.map((entry) => String(entry)),
  );
  const targetValues = new Set(
    Array.isArray(value) ? value.map((entry) => String(entry)) : [],
  );
  let activeIndex = 0;
  let currentSelections = new Set(defaultValues);

  yield { type: "prompt_preview", key, label, promptType, lines: buildMultiselectPreviewLines(config, activeIndex, currentSelections) };
  await wait(humanizePause(Math.max(timing.promptDelay, timing.typeDelay * 2.2, 200)));

  const toggles = choices
    .map((choice, index) => ({ label: String(choice), index }))
    .filter(({ label: choiceLabel }) => currentSelections.has(choiceLabel) !== targetValues.has(choiceLabel));

  for (const toggle of toggles) {
    for (const index of moveIndexToward(activeIndex, toggle.index)) {
      activeIndex = index;
      yield { type: "prompt_preview", key, label, promptType, lines: buildMultiselectPreviewLines(config, activeIndex, currentSelections) };
      await wait(humanizePause(Math.max(timing.typeDelay * 2.2, 200)));
    }

    if (currentSelections.has(toggle.label)) {
      currentSelections.delete(toggle.label);
    } else {
      currentSelections.add(toggle.label);
    }

    yield { type: "prompt_preview", key, label, promptType, lines: buildMultiselectPreviewLines(config, activeIndex, currentSelections) };
    await wait(humanizePause(Math.max(timing.typeDelay * 2.2, 240)));
  }
}

async function* animateConfirmTogglePreview(
  key: string,
  label: string,
  config: RuntimePromptConfig,
  value: unknown,
  timing: ResolvedAnimateTiming,
): AsyncGenerator<AnimateEvent> {
  const promptType = animatePromptType(config);
  const startValue = true;
  const targetValue = Boolean(value);

  yield { type: "prompt_preview", key, label, promptType, lines: buildConfirmPreviewLines(startValue) };
  await wait(humanizePause(Math.max(timing.promptDelay, timing.typeDelay * 3, 340)));

  if (startValue !== targetValue) {
    yield { type: "prompt_preview", key, label, promptType, lines: buildConfirmPreviewLines(targetValue) };
  }
  await wait(humanizePause(Math.max(timing.typeDelay * 3, 340)));
}

async function* animateTypeCharacters(
  key: string,
  sequence: string,
  timing: ResolvedAnimateTiming,
): AsyncGenerator<AnimateEvent> {
  let typed = "";
  for (const [index, char] of Array.from(sequence).entries()) {
    typed += char;
    yield { type: "char", key, value: char, full: typed };
    await wait(humanizeTypeDelay(timing.typeDelay, sequence, index));
  }
}

function resolveSubmitDisplayValue(
  config: RuntimePromptConfig,
  finalValue: unknown,
): string {
  if (config.type === "select" || config.type === "search") {
    return resolveAnimateChoiceLabel(config, finalValue);
  }
  if (config.type === "multiselect") {
    return Array.isArray(finalValue)
      ? finalValue.map((item) => resolveAnimateChoiceLabel(config, item)).join(", ")
      : String(finalValue ?? "");
  }
  return formatPromptSummaryValue(config, finalValue);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function* animatePromptSequence(
  key: string,
  label: string,
  config: RuntimePromptConfig,
  rawValue: unknown,
  timing: ResolvedAnimateTiming,
  options?: { ignoreDefaults?: boolean },
): AsyncGenerator<AnimateEvent, unknown> {
  const value = coerceAnimateValue(config, rawValue);
  const resolved = await resolvePromptValue(config, value);
  if (!resolved.ok) {
    throw new Error(`cli.animate(): invalid value for prompt "${key}": ${resolved.error}`);
  }
  const finalValue = resolved.value;
  const promptType = animatePromptType(config);

  // List prompts emit one prompt_start → char → prompt_submit per item.
  if (config.type === "list") {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      yield { type: "prompt_start", key, label, promptType };
      await wait(humanizePause(timing.promptDelay));

      const sequence = String(item ?? "");
      yield* animateTypeCharacters(key, sequence, timing);

      yield { type: "prompt_submit", key, label, displayValue: sequence };
      await wait(humanizePause(timing.completionDelay));
    }
    return finalValue;
  }

  yield { type: "prompt_start", key, label, promptType };

  if (config.type === "select" || config.type === "search") {
    yield* animateSelectPreview(key, label, config, value, timing);
  } else if (config.type === "multiselect") {
    yield* animateMultiselectPreview(key, label, config, value, timing, options?.ignoreDefaults ?? false);
  } else if (config.type === "confirm" && config.confirmMode === "toggle") {
    yield* animateConfirmTogglePreview(key, label, config, value, timing);
  } else {
    await wait(humanizePause(timing.promptDelay));
  }

  const sequence = animateCharSequence(config, value);
  if (sequence !== null) {
    yield* animateTypeCharacters(key, sequence, timing);
  }

  yield {
    type: "prompt_submit",
    key,
    label,
    displayValue: resolveSubmitDisplayValue(config, finalValue),
  };

  await wait(humanizePause(timing.completionDelay));
  return finalValue;
}
