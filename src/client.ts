import { createBuilder } from "./builder";
import { createStorage } from "./storage";
import {
  type PromptSubmitResult,
  renderConfirmPrompt,
  renderMultiselectPrompt,
  renderNumberPrompt,
  renderPasswordPrompt,
  renderSelectPrompt,
  renderTextPrompt,
  writePromptSummary,
} from "./primitives/prompt";
import { table as renderTable } from "./primitives/table";
import { box as renderBox } from "./primitives/box";
import { spin as runSpinner } from "./primitives/spinner";
import { progress as runProgress } from "./primitives/progress";
import { Command, CommanderError, Option } from "commander";
import {
  isRailEnabled,
  setRailEnabled,
  writeLine,
  writeSectionLine,
  writeSectionLines,
  writeSectionGap,
} from "./output";
import {
  activeTheme as theme,
  applyTheme,
  type ThemeOverride,
} from "./theme";
import { suggest as suggestValue } from "./suggest";

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
  theme?: ThemeOverride;
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
  choices?: readonly string[];
  rules?: Partial<Record<string, string>>;
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

export type ExitCode = "usage" | "auth" | "not_found" | "network" | "error";

export interface ExitOptions {
  hint?: string;
  code?: number | ExitCode;
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

  if (config.type === "multiselect") {
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
      return new Option(`--${promptName} <value...>`, "");
    case "number":
    case "text":
    case "password":
    case "select":
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
        summaryWidth,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "string"
            ? config.defaultValue
            : undefined,
        resolve,
      });

    case "password":
      return renderPasswordPrompt({
        label,
        describe: config.describe,
        summaryWidth,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "string"
            ? config.defaultValue
            : undefined,
        resolve,
      });

    case "number":
      return renderNumberPrompt({
        label,
        describe: config.describe,
        summaryWidth,
        min: config.min,
        max: config.max,
        prefix: config.prefix,
        placeholder: config.placeholder,
        defaultValue:
          typeof config.defaultValue === "number"
            ? config.defaultValue
            : undefined,
        resolve,
      });

    case "select":
      if (!config.choices)
        throw new Error(`Select prompt "${label}" missing choices.`);
      return renderSelectPrompt({
        label,
        describe: config.describe,
        summaryWidth,
        choices: config.choices,
        rules: config.rules,
        resolve,
      });

    case "multiselect":
      if (!config.choices) {
        throw new Error(`Multiselect prompt "${label}" missing choices.`);
      }
      return renderMultiselectPrompt({
        label,
        describe: config.describe,
        summaryWidth,
        choices: config.choices,
        min: config.min,
        max: config.max,
        resolve,
      });

    case "confirm":
      return renderConfirmPrompt({
        label,
        describe: config.describe,
        summaryWidth,
        defaultValue:
          typeof config.defaultValue === "boolean"
            ? config.defaultValue
            : undefined,
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
      return Array.isArray(value) ? value.join(", ") : String(value ?? "");
    case "confirm":
      return value ? "yes" : "no";
    default:
      return String(value ?? "");
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
  let isTTY = process.stdout.isTTY === true;
  let noColor =
    process.env.NO_COLOR !== undefined ||
    process.env.TERM === "dumb" ||
    process.argv.includes("--no-color");
  let resolvedTheme = applyTheme(config.theme ?? {}, noColor);

  if (Object.prototype.hasOwnProperty.call(flagDefs, "yes")) {
    throw new Error("Flag name 'yes' is reserved by oscli. Use a different name.");
  }

  if (Object.prototype.hasOwnProperty.call(flagDefs, "no-color")) {
    throw new Error("Flag 'no-color' is reserved by oscli.");
  }

  const storage = createStorage<StorageShape<TPrompts>>();
  const prompt = {} as PromptFns<TPrompts>;
  const flags = {} as FlagsShape<TFlags>;
  const promptBypassValues = new Map<keyof TPrompts, unknown>();
  const runtimePromptConfigs = new Map<keyof TPrompts, RuntimePromptConfig>();
  const runtimeFlagConfigs = new Map<keyof TFlags, RuntimeFlagConfig>();
  const summaryWidth = Math.max(
    0,
    ...Object.keys(promptDefs).map((key) => {
      const runtimeConfig = promptDefs[key].config() as RuntimePromptConfig;
      return (runtimeConfig.label ?? key).length;
    }),
  );
  let autoYes = false;

  for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
    runtimePromptConfigs.set(key, promptDefs[key].config() as RuntimePromptConfig);
  }

  for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
    const runtimeConfig = flagDefs[key].config() as RuntimeFlagConfig;
    runtimeFlagConfigs.set(key, runtimeConfig);

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

  const _writeLine = (
    line: string,
    stream: "stdout" | "stderr" = "stdout",
  ) => {
    writeSectionLine(line, stream);
  };

  const exitWithMessage = (message: string, options: ExitOptions = {}): never => {
    const shouldCloseRail = isRailEnabled() && theme.symbols.outro.length > 0;
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

    if (shouldCloseRail) {
      setRailEnabled(false);
      writeLine(theme.color.border(theme.symbols.outro), "stderr");
    }

    process.exit(resolveExitCode(options.code));
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

  const cli = {
    storage: storage.data as Partial<StorageShape<TPrompts>>,
    flags,
    prompt,
    _theme: resolvedTheme,
    _isTTY: isTTY,
    _noColor: noColor,
    _writeLine,
    suggest: suggestValue,
    run: async (fn?: () => Promise<void> | void) => {
      const program = new Command();
      const registeredCommandNames: string[] = [];

      isTTY = process.stdout.isTTY === true;
      noColor =
        process.env.NO_COLOR !== undefined ||
        process.env.TERM === "dumb" ||
        process.argv.includes("--no-color");
      resolvedTheme = applyTheme(config.theme ?? {}, noColor);
      cli._theme = resolvedTheme;
      cli._isTTY = isTTY;
      cli._noColor = noColor;

      program.name("oscli");
      if (config.description) {
        program.description(config.description);
      }

      program.showSuggestionAfterError(false);
      program.configureOutput({
        outputError: () => {},
      });
      program.exitOverride();

      for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
        const runtimeConfig = runtimeFlagConfigs.get(key);
        if (!runtimeConfig) continue;

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
        const runtimeConfig = runtimePromptConfigs.get(key);
        if (!runtimeConfig) continue;

        if (Object.prototype.hasOwnProperty.call(flagDefs, String(key))) {
          continue;
        }

        if (String(key) === "yes" || String(key) === "no-color") {
          continue;
        }

        const option = createPromptBypassOption(String(key), runtimeConfig);
        if (!option) continue;
        if (runtimeConfig.type === "password") {
          option.hideHelp();
        }
        if (
          (runtimeConfig.type === "select" || runtimeConfig.type === "multiselect") &&
          runtimeConfig.choices
        ) {
          option.choices(runtimeConfig.choices.map((choice) => String(choice)));
        }
        program.addOption(option);
      }

      program.option("-y, --yes", "Answer yes to all confirmation prompts");
      program.option("--no-color", "Disable ANSI colors");
      registeredCommandNames.push(...program.commands.map((command) => command.name()));

      program.action(async () => {
        const opts = program.opts() as Record<string, unknown>;

        autoYes = opts.yes === true;

        for (const key of Object.keys(flagDefs) as Array<keyof TFlags>) {
          const runtimeConfig = runtimeFlagConfigs.get(key);
          if (!runtimeConfig) continue;

          const name = String(key);
          let resolved: unknown;

          try {
            resolved = resolveFlagValue(
              name,
              runtimeConfig,
              opts[name],
              program.getOptionValueSource(name),
            );
          } catch (error) {
            if (error instanceof Error) {
              exitWithMessage(error.message, { code: "usage" });
            }
            throw error;
          }

          (flags as Record<string, unknown>)[name] = resolved;
        }

        promptBypassValues.clear();

        for (const key of Object.keys(promptDefs) as Array<keyof TPrompts>) {
          const name = String(key);
          const source = program.getOptionValueSource(name);
          if (source !== "cli") continue;

          const runtimeConfig = runtimePromptConfigs.get(key);
          if (!runtimeConfig) continue;

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

          const finalValue = (resolved as { ok: true; value: unknown })
            .value as StorageShape<TPrompts>[typeof key];
          storage.set(key, finalValue);
          promptBypassValues.set(key, finalValue);
        }

        if (fn) {
          await fn();
          return;
        }

        throw new Error("run() requires a handler in single-command mode.");
      });

      try {
        await program.parseAsync(process.argv);
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
              hint ? { hint: `Did you mean: ${hint}?`, code: "usage" } : { code: "usage" },
            );
          }

          exitWithMessage(normalizeCommanderMessage(error.message), {
            code: "usage",
          });
        }

        throw error;
      }
    },
    intro: (message: string) => {
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
      setRailEnabled(false);
      writeLine(
        `${theme.color.border(theme.symbols.outro)}  ${theme.color.title(message)}`,
      );
      if (resolvedTheme.layout.spacing > 0) {
        process.stdout.write("\n".repeat(resolvedTheme.layout.spacing));
      }
    },
    log: (level: "info" | "warn" | "error" | "success", message: string) => {
      const symbol =
        level === "info"
          ? theme.color.info(theme.symbols.info)
          : level === "warn"
            ? theme.color.warning(theme.symbols.warning)
            : level === "error"
              ? theme.color.error(theme.symbols.error)
              : theme.color.success(theme.symbols.success);

      const text =
        level === "info"
          ? theme.color.info(message)
          : level === "warn"
            ? theme.color.warning(message)
            : level === "error"
              ? theme.color.error(message)
              : theme.color.success(message);

      _writeLine(
        `${theme.layout.indent}${symbol} ${text}`,
        level === "error" ? "stderr" : "stdout",
      );
    },
    table: (
      headers: string[],
      rows: Array<Array<string | number | boolean | null | undefined>>,
    ) => {
      return renderTable(headers, rows);
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
        defaultValue,
      });
    },
    success: (message: string) => {
      _writeLine(
        `${theme.color.success(theme.symbols.success)} ${theme.color.success(message)}`,
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

      if (promptBypassValues.has(key)) {
        const bypassValue = promptBypassValues.get(
          key,
        ) as StorageShape<TPrompts>[typeof key];
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

          const finalValue = (resolved as { ok: true; value: unknown })
            .value as StorageShape<TPrompts>[typeof key];
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

          const finalValue = (resolved as { ok: true; value: unknown })
            .value as StorageShape<TPrompts>[typeof key];
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
