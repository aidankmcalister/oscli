import type {
  Command as CommanderCommand,
  Option as CommanderOption,
} from "commander";
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
  resetPromptSummaryWidth,
  writePromptSummary,
} from "./primitives/prompt";

import { box as renderBox } from "./primitives/box";
import { diff as renderDiff } from "./primitives/diff";
import { renderDivider } from "./primitives/divider";
import type { ProgressRenderOptions, ProgressStyle } from "./primitives/progress";
import type { SpinnerOptions } from "./primitives/spinner";
import { table as renderTable } from "./primitives/table";
import { tree as renderTree, type TreeNode } from "./primitives/tree";
import { createStorage } from "./storage";
import { suggest as suggestValue } from "./suggest";
import {
  activeTheme as theme,
  applyTheme,
  type ThemePreset,
  type ThemeOverride,
  themePresets,
} from "./theme";
import type {
  PromptDefinitions,
  FlagDefinitions,
  StorageShape,
  FlagsShape,
  PromptFns,
  CommandHandler,
  StreamName,
  RuntimePromptConfig,
  RuntimeFlagConfig,
} from "./types";
export type {
  AnimateEvent,
  AnimateOptions,
  ExitCode,
  ExitOptions,
  TestOptions,
  TestResult,
  TitleConfig,
  TitleStyle,
} from "./types";
import type {
  AnimateEvent,
  AnimateOptions,
  ExitCode,
  ExitOptions,
  TestOptions,
  TestResult,
  TitleConfig,
  TitleStyle,
} from "./types";
import {
  animatePromptSequence,
  deriveAnimateIntroMessage,
  deriveAnimateOutroMessage,
  hasOwnKey,
  humanizePause,
  MIN_ANIMATE_PROGRESS_STEP_DURATION,
  MIN_ANIMATE_SPIN_DURATION,
  resolveAnimateTiming,
  resolveTitleStyle,
  resolveTitleText,
  renderStyledTitle,
  wait,
  type ResolvedAnimateTiming,
} from "./animate";
import {
  clearStorage,
  coercePromptBypassValue,
  createPromptBypassOption,
  extractUnknownCommand,
  formatPromptSummaryValue,
  hasPromptDefault,
  normalizeCommanderMessage,
  promptFlagUsage,
  renderByType,
  resolveExitCode,
  resolveFlagValue,
  resolvePromptValue,
} from "./coerce";

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
      resetPromptSummaryWidth();
      clearPersistentCorner();
      resolvedTheme = applyTheme(resolvedThemeOverride, noColor);
      cli._theme = resolvedTheme;
      cli._isTTY = isTTY;
      cli._noColor = noColor;
      cli._jsonMode = jsonMode;

      const titleText = resolveTitleText(config);
      const inferredName = process.argv[1]
        ? (process.argv[1].replace(/\.[cm]?[jt]s$/, "").split("/").pop() ?? "oscli")
        : "oscli";
      program.name(inferredName);
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
        resetPromptSummaryWidth();
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
      const introPrefix = theme.symbols.intro.length > 0
        ? `${theme.color.border(theme.symbols.intro)}  `
        : "";
      writeLine(
        `${introPrefix}${renderStyledTitle(message, titleStyle, theme.color.title)}`,
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
      const outroPrefix = theme.symbols.outro.length > 0
        ? `${theme.color.border(theme.symbols.outro)}  `
        : "";
      writeLine(
        `${outroPrefix}${theme.color.title(message)}`,
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
      options?: { style?: ProgressStyle },
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
        style: options?.style,
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
