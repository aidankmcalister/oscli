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
import { Command } from "commander";
import pc from "picocolors";

type PromptLike<TValue = unknown> = {
  readonly __valueType: TValue;
  config(): unknown;
};

type PromptDefinitions = Record<string, PromptLike>;

type InferPromptValue<TBuilder> =
  TBuilder extends PromptLike<infer TValue> ? TValue : never;

type StorageShape<TPrompts extends PromptDefinitions> = {
  [K in keyof TPrompts]: InferPromptValue<TPrompts[K]>;
};

type PromptFns<TPrompts extends PromptDefinitions> = {
  [K in keyof TPrompts]: () => Promise<StorageShape<TPrompts>[K]>;
};

type CLIConfig<TPrompts extends PromptDefinitions> = {
  description?: string;
  prompts: TPrompts;
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

export function createCLI<TPrompts extends PromptDefinitions>(
  configFn: (b: ReturnType<typeof createBuilder>) => CLIConfig<TPrompts>,
) {
  const config = configFn(createBuilder());
  const storage = createStorage<StorageShape<TPrompts>>();
  const prompt = {} as PromptFns<TPrompts>;

  for (const key of Object.keys(config.prompts) as Array<keyof TPrompts>) {
    const builder = config.prompts[key];

    prompt[key] = (async () => {
      while (true) {
        const runtimeConfig = builder.config() as RuntimePromptConfig;
        const rawValue = await renderByType(runtimeConfig, String(key));

        const maybeOptional =
          runtimeConfig.optional && rawValue === "" ? undefined : rawValue;

        const transformed = runtimeConfig.transform
          ? runtimeConfig.transform(maybeOptional)
          : maybeOptional;

        if (runtimeConfig.validate) {
          const validation = await runtimeConfig.validate(transformed);
          if (validation !== true) {
            process.stdout.write(`${validation}\n`);
            continue;
          }
        }

        const finalValue = transformed as StorageShape<TPrompts>[typeof key];
        storage.set(key, finalValue);
        return finalValue;
      }
    }) as PromptFns<TPrompts>[typeof key];
  }

  return {
    storage: storage.data as Partial<StorageShape<TPrompts>>,
    prompt,
    run: async (fn?: () => Promise<void> | void) => {
      const program = new Command();

      program.name("oscli");
      if (config.description) {
        program.description(config.description);
      }

      if (fn) {
        program.action(async () => {
          await fn();
        });
      } else {
        program.action(() => {
          throw new Error("run() requires a handler in single-command mode.");
        });
      }

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
    success: (message: string) => {
      process.stdout.write(`${pc.green("success")} ${message}\n`);
    },
    exit: (message: string): never => {
      process.stderr.write(`${pc.red("error")} ${message}\n`);
      process.exit(1);
    },
  };
}
