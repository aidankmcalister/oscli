import { createBuilder } from "./builder";
import { createStorage } from "./storage";
import {
  renderConfirmPrompt,
  renderMultiselectPrompt,
  renderNumberPrompt,
  renderPasswordPrompt,
  renderSelectPrompt,
  renderTextPrompt,
} from "./primitives/prompt";
import { table as renderTable } from "./primitives/table";
import { box as renderBox } from "./primitives/box";
import { spin as runSpinner } from "./primitives/spinner";
import { progress as runProgress } from "./primitives/progress";
import { Command, Option } from "commander";
import pc from "picocolors";

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
  theme?: { spacing?: number };
  emojis?: boolean;
};

type RuntimePromptConfig = {
  type?: string;
  label?: string;
  describe?: string;
  placeholder?: string;
  defaultValue?: unknown;
  optional?: boolean;
  validate?: (value: unknown) => true | string | Promise<true | string>;
  transform?: (value: unknown) => unknown;
  theme?: string;
  choices?: readonly string[];
  min?: number;
  max?: number;
  prefix?: string;
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

function createPromptBypassOption(
  promptName: string,
  config: RuntimePromptConfig,
): Option | null {
  switch (config.type) {
    case "confirm":
      return new Option(`--${promptName}`, "");
    case "number":
    case "text":
    case "password":
    case "select":
    case "multiselect":
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
      if (typeof rawValue === "boolean") return rawValue;
      if (typeof rawValue === "string") {
        const normalized = rawValue.trim().toLowerCase();
        if (["1", "true", "t", "y", "yes"].includes(normalized)) return true;
        if (["0", "false", "f", "n", "no"].includes(normalized)) return false;
      }
      throw new Error(`Invalid value for --${promptName}: expected y/n.`);

    case "multiselect": {
      const source =
        Array.isArray(rawValue) ? rawValue.join(",") : String(rawValue ?? "");
      const values = source
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (config.choices && values.some((value) => !config.choices?.includes(value))) {
        throw new Error(
          `Invalid value for --${promptName}. Expected comma-separated values from: ${config.choices.join(", ")}.`,
        );
      }

      return values;
    }

    case "select":
      if (typeof rawValue !== "string") {
        throw new Error(`Invalid value for --${promptName}: expected a string.`);
      }
      if (config.choices && !config.choices.includes(rawValue)) {
        throw new Error(
          `Invalid value for --${promptName}. Expected one of: ${config.choices.join(", ")}.`,
        );
      }
      return rawValue;

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

  if (source === "cli") {
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
): Promise<unknown> {
  const label = config.label ?? fallbackLabel;

  switch (config.type) {
    case "text":
      return renderTextPrompt({
        label,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "string"
            ? config.defaultValue
            : undefined,
      });

    case "password":
      return renderPasswordPrompt({
        label,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "string"
            ? config.defaultValue
            : undefined,
      });

    case "number":
      return renderNumberPrompt({
        label,
        min: config.min,
        max: config.max,
        prefix: config.prefix,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "number"
            ? config.defaultValue
            : undefined,
      });

    case "select":
      if (!config.choices)
        throw new Error(`Select prompt "${label}" missing choices.`);
      return renderSelectPrompt({
        label,
        choices: config.choices,
      });

    case "multiselect":
      if (!config.choices) {
        throw new Error(`Multiselect prompt "${label}" missing choices.`);
      }
      return renderMultiselectPrompt({
        label,
        choices: config.choices,
        min: config.min,
        max: config.max,
      });

    case "confirm":
      return renderConfirmPrompt({
        label,
        defaultValue:
          typeof config.defaultValue === "boolean"
            ? config.defaultValue
            : undefined,
      });

    default:
      throw new Error(`Unknown prompt type for "${label}".`);
  }
}

export function createCLI<
  TPrompts extends PromptDefinitions = {},
  TFlags extends FlagDefinitions = {},
>(
  configFn: (b: ReturnType<typeof createBuilder>) => CLIConfig<TPrompts, TFlags>,
) {
  const config = configFn(createBuilder());
  const promptDefs = (config.prompts ?? {}) as TPrompts;
  const flagDefs = (config.flags ?? {}) as TFlags;

  if (Object.prototype.hasOwnProperty.call(flagDefs, "yes")) {
    throw new Error("Flag name 'yes' is reserved by oscli. Use a different name.");
  }

  const storage = createStorage<StorageShape<TPrompts>>();
  const prompt = {} as PromptFns<TPrompts>;
  const flags = {} as FlagsShape<TFlags>;
  const promptBypassValues = new Map<keyof TPrompts, unknown>();
  let autoYes = false;

  for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
    const runtimeConfig = flagDefs[key].config() as RuntimeFlagConfig;

    if (runtimeConfig.hasDefault) {
      (flags as Record<string, unknown>)[String(key)] = runtimeConfig.defaultValue;
      continue;
    }

    if (runtimeConfig.type === "boolean" && !runtimeConfig.optional) {
      (flags as Record<string, unknown>)[String(key)] = false;
      continue;
    }

    (flags as Record<string, unknown>)[String(key)] = undefined;
  }

  for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
    const builder = promptDefs[key];

    prompt[key] = (async () => {
      if (promptBypassValues.has(key)) {
        const bypassValue = promptBypassValues.get(
          key,
        ) as StorageShape<TPrompts>[typeof key];
        storage.set(key, bypassValue);
        return bypassValue;
      }

      while (true) {
        const runtimeConfig = builder.config() as RuntimePromptConfig;

        if (runtimeConfig.type === "confirm" && autoYes) {
          const value = true as StorageShape<TPrompts>[typeof key];
          storage.set(key, value);
          process.stdout.write(`✓ ${String(key)}  (--yes)\n`);
          return value;
        }

        const rawValue = await renderByType(runtimeConfig, String(key));
        const resolved = await resolvePromptValue(runtimeConfig, rawValue);

        if (!resolved.ok) {
          process.stdout.write(`${resolved.error}\n`);
          continue;
        }

        const finalValue = resolved.value as StorageShape<TPrompts>[typeof key];
        storage.set(key, finalValue);
        return finalValue;
      }
    }) as PromptFns<TPrompts>[typeof key];
  }

  return {
    storage: storage.data as Partial<StorageShape<TPrompts>>,
    flags,
    prompt,
    run: async (fn?: () => Promise<void> | void) => {
      const program = new Command();
      const runtimeFlagConfigs = new Map<keyof TFlags, RuntimeFlagConfig>();
      const runtimePromptConfigs = new Map<keyof TPrompts, RuntimePromptConfig>();

      program.name("oscli");
      if (config.description) {
        program.description(config.description);
      }

      for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
        const runtimeConfig = flagDefs[key].config() as RuntimeFlagConfig;
        runtimeFlagConfigs.set(key, runtimeConfig);

        const option =
          runtimeConfig.type === "boolean"
            ? new Option(`--${String(key)}`, runtimeConfig.label ?? "")
            : new Option(`--${String(key)} <value>`, runtimeConfig.label ?? "");

        if (runtimeConfig.choices) {
          option.choices(runtimeConfig.choices.map((choice) => String(choice)));
        }

        program.addOption(option);
      }

      for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
        const runtimeConfig = promptDefs[key].config() as RuntimePromptConfig;
        runtimePromptConfigs.set(key, runtimeConfig);

        if (Object.prototype.hasOwnProperty.call(flagDefs, String(key))) {
          continue;
        }

        if (String(key) === "yes") {
          continue;
        }

        const option = createPromptBypassOption(String(key), runtimeConfig);
        if (!option) continue;
        option.hideHelp();
        program.addOption(option);
      }

      program.option("-y, --yes", "Answer yes to all confirmation prompts");

      program.action(async () => {
        const opts = program.opts() as Record<string, unknown>;

        autoYes = opts.yes === true;

        for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
          const runtimeConfig = runtimeFlagConfigs.get(key);
          if (!runtimeConfig) continue;

          const name = String(key);
          const rawValue = opts[name];
          const source = program.getOptionValueSource(name);
          const resolved = resolveFlagValue(name, runtimeConfig, rawValue, source);

          (flags as Record<string, unknown>)[name] = resolved;
        }

        promptBypassValues.clear();

        for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
          const name = String(key);
          const source = program.getOptionValueSource(name);
          if (source !== "cli") continue;

          const runtimeConfig = runtimePromptConfigs.get(key);
          if (!runtimeConfig) continue;

          const rawValue = opts[name];
          const bypassRaw = Object.prototype.hasOwnProperty.call(flagDefs, name)
            ? (flags as Record<string, unknown>)[name]
            : coercePromptBypassValue(name, runtimeConfig, rawValue);

          const resolved = await resolvePromptValue(runtimeConfig, bypassRaw);
          if (!resolved.ok) {
            throw new Error(`Invalid value for --${name}: ${resolved.error}`);
          }

          const finalValue = resolved.value as StorageShape<TPrompts>[typeof key];
          storage.set(key, finalValue);
          promptBypassValues.set(key, finalValue);
        }

        if (fn) {
          await fn();
          return;
        }

        throw new Error("run() requires a handler in single-command mode.");
      });

      await program.parseAsync(process.argv);
    },
    intro: (message: string) => {
      process.stdout.write(`${pc.cyan("○")} ${message}\n`);
    },
    outro: (message: string) => {
      process.stdout.write(`${pc.cyan("●")} ${message}\n`);
    },
    log: (level: "info" | "warn" | "error" | "success", message: string) => {
      const prefix =
        level === "info"
          ? pc.blue("info")
          : level === "warn"
            ? pc.yellow("warn")
            : level === "error"
              ? pc.red("error")
              : pc.green("success");

      process.stdout.write(`${prefix} ${message}\n`);
    },
    table: (
      headers: string[],
      rows: Array<Array<string | number | boolean | null | undefined>>,
    ) => {
      return renderTable(headers, rows);
    },
    box: (options: { title?: string; content: string }) => {
      process.stdout.write(`${renderBox(options)}\n`);
    },
    spin: async <T>(label: string, fn: () => Promise<T>) => {
      return runSpinner(label, fn);
    },
    progress: async <TStep extends string>(
      label: string,
      steps: readonly TStep[],
      fn: (step: TStep, index: number) => Promise<void>,
    ) => {
      await runProgress(label, steps, fn);
    },
    confirm: async (label: string, defaultValue?: boolean) => {
      if (autoYes) {
        process.stdout.write(`✓ ${label}  (--yes)\n`);
        return true;
      }

      return renderConfirmPrompt({
        label,
        defaultValue,
      });
    },
    success: (message: string) => {
      process.stdout.write(`${pc.green("success")} ${message}\n`);
    },
    exit: (message: string): never => {
      process.stderr.write(`${pc.red("error")} ${message}\n`);
      process.exit(1);
    },
  };
}
