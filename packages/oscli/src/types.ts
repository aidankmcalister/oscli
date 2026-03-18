import type { ColorName } from "./theme";

export type RuntimePromptConfig = {
  type?: string;
  label?: string;
  describe?: string;
  placeholder?: string;
  defaultValue?: unknown;
  hasDefault?: boolean;
  optional?: boolean;
  validate?: (value: unknown) => true | string | Promise<true | string>;
  transform?: (value: unknown) => unknown;
  promptColor?: ColorName;
  choices?: readonly string[];
  rules?: Partial<Record<string, string>>;
  min?: number;
  max?: number;
  prefix?: string;
  format?: string;
  confirmMode?: "toggle" | "simple";
};

export type RuntimeFlagConfig = {
  type?: "string" | "boolean" | "number";
  label?: string;
  defaultValue?: unknown;
  hasDefault?: boolean;
  optional?: boolean;
  choices?: readonly unknown[];
};

export type PromptResolution =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type PromptLike<TValue = unknown> = {
  readonly __valueType: TValue;
  config(): unknown;
};

export type FlagLike<TValue = unknown> = {
  readonly __valueType: TValue;
  config(): unknown;
};

export type PromptDefinitions = Record<string, PromptLike>;
export type FlagDefinitions = Record<string, FlagLike>;

export type InferPromptValue<TBuilder> =
  TBuilder extends PromptLike<infer TValue> ? TValue : never;

export type InferFlagValue<TBuilder> = TBuilder extends FlagLike<infer TValue>
  ? TValue
  : never;

export type StorageShape<TPrompts extends PromptDefinitions> = {
  [K in keyof TPrompts]: InferPromptValue<TPrompts[K]>;
};

export type FlagsShape<TFlags extends FlagDefinitions> = {
  [K in keyof TFlags]: InferFlagValue<TFlags[K]>;
};

export type PromptFns<TPrompts extends PromptDefinitions> = {
  [K in keyof TPrompts]: () => Promise<StorageShape<TPrompts>[K]>;
};

export type TitleStyle = {
  color?: ColorName;
  uppercase?: boolean;
  bold?: boolean;
};

export type TitleConfig = string | { text: string; style?: TitleStyle };

export type ExitCode = "usage" | "auth" | "not_found" | "network" | "error";

export interface ExitOptions {
  hint?: string;
  code?: number | ExitCode;
}

export type CommandHandler = () => Promise<void> | void;

export type StreamName = "stdout" | "stderr";

export interface TestOptions<
  TPrompts extends PromptDefinitions,
  TFlags extends FlagDefinitions,
> {
  inputs?: Partial<Record<keyof TPrompts, unknown>>;
  flags?: Partial<FlagsShape<TFlags>>;
  argv?: string[];
  binName?: string;
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
