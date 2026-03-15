import type { Option as CommanderOption } from "commander";
import { formatDateValue, parseDateByFormat } from "./date";
import type { ExitCode, RuntimePromptConfig, RuntimeFlagConfig, PromptResolution } from "./types";
import type {
  PromptSubmitResult,
} from "./primitives/prompt";
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
} from "./primitives/prompt";

export const EXIT_CODE_MAP: Record<ExitCode, number> = {
  usage: 2,
  auth: 3,
  not_found: 4,
  network: 5,
  error: 1,
};

export async function resolvePromptValue(
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

export function hasPromptDefault(config: RuntimePromptConfig): boolean {
  return config.hasDefault === true;
}

export function promptFlagUsage(
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

export function normalizeCommanderMessage(message: string): string {
  return message.replace(/^error:\s*/i, "");
}

export function extractUnknownCommand(message: string): string | null {
  const match = message.match(/unknown command '([^']+)'/i);
  return match?.[1] ?? null;
}

export function createPromptBypassOption(
  promptName: string,
  config: RuntimePromptConfig,
  OptionCtor: typeof CommanderOption,
): CommanderOption | null {
  switch (config.type) {
    case "confirm":
      return new OptionCtor(`--${promptName} [value]`, "")
        .default(false)
        .argParser((v: string) => v !== "false" && v !== "0" && v !== "no" && v !== "n");
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

export function coercePromptBypassValue(
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

export function resolveFlagValue(
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

export function formatPromptSummaryValue(
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

export function clearStorage<T extends Record<string, unknown>>(storage: Partial<T>): void {
  for (const key of Object.keys(storage) as Array<keyof T>) {
    delete storage[key];
  }
}

export async function renderByType(
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
      if (!config.choices || config.choices.length === 0) {
        throw new Error(`Select prompt "${label}" requires at least one choice.`);
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
