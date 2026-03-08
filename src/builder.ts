import type { ColorName } from "./theme";

export type Validator<T> = (value: T) => true | string | Promise<true | string>;
export type FlagType = "string" | "boolean" | "number";

export class PromptBuilder<T> {
  declare readonly __valueType: T;

  private _label?: string;
  private _describe?: string;
  private _placeholder?: string;
  private _default?: T;
  private _hasDefault = false;
  private _optional = false;
  private _validate?: Validator<T>;
  private _transform?: (value: unknown) => unknown;
  private _theme?: string;
  private _promptColor?: ColorName;

  label(value: string): this {
    this._label = value;
    return this;
  }

  describe(value: string): this {
    this._describe = value;
    return this;
  }

  placeholder(value: string): this {
    this._placeholder = value;
    return this;
  }

  default(value: T): this {
    this._default = value;
    this._hasDefault = true;
    return this;
  }

  optional(): PromptBuilder<T | undefined> {
    this._optional = true;
    return this as unknown as PromptBuilder<T | undefined>;
  }

  validate(fn: Validator<T>): this {
    this._validate = fn;
    return this;
  }

  transform<U>(fn: (value: T) => U): PromptBuilder<U> {
    this._transform = fn as (value: unknown) => unknown;
    return this as unknown as PromptBuilder<U>;
  }

  theme(value: string): this {
    this._theme = value;
    return this;
  }

  color(value: ColorName): this {
    this._promptColor = value;
    return this;
  }

  config() {
    return {
      label: this._label,
      describe: this._describe,
      placeholder: this._placeholder,
      defaultValue: this._default,
      hasDefault: this._hasDefault,
      optional: this._optional,
      validate: this._validate,
      transform: this._transform,
      theme: this._theme,
      promptColor: this._promptColor,
    };
  }
}

export class TextBuilder extends PromptBuilder<string> {
  config() {
    return {
      type: "text" as const,
      ...super.config(),
    };
  }
}

export class PasswordBuilder extends PromptBuilder<string> {
  config() {
    return {
      type: "password" as const,
      ...super.config(),
    };
  }
}

export class ConfirmBuilder extends PromptBuilder<boolean> {
  config() {
    return {
      type: "confirm" as const,
      ...super.config(),
    };
  }
}

export class NumberBuilder extends PromptBuilder<number> {
  private _min?: number;
  private _max?: number;
  private _prefix?: string;

  min(value: number): this {
    this._min = value;
    return this;
  }

  max(value: number): this {
    this._max = value;
    return this;
  }

  prefix(value: string): this {
    this._prefix = value;
    return this;
  }

  config() {
    return {
      type: "number" as const,
      ...super.config(),
      min: this._min,
      max: this._max,
      prefix: this._prefix,
    };
  }
}

export class SelectBuilder<T extends string> extends PromptBuilder<T> {
  private readonly _choices: readonly T[];
  private readonly _rules = new Map<T, string>();

  constructor(options: { choices: readonly T[] }) {
    super();
    this._choices = options.choices;
  }

  rule(choice: T, description: string): this {
    this._rules.set(choice, description);
    return this;
  }

  config() {
    return {
      type: "select" as const,
      ...super.config(),
      choices: this._choices,
      rules: Object.fromEntries(this._rules) as Partial<Record<T, string>>,
    };
  }
}

export class SearchBuilder<T extends string> extends PromptBuilder<T> {
  private readonly _choices: readonly T[];
  private readonly _rules = new Map<T, string>();

  constructor(options: { choices: readonly T[] }) {
    super();
    this._choices = options.choices;
  }

  rule(choice: T, description: string): this {
    this._rules.set(choice, description);
    return this;
  }

  config() {
    return {
      type: "search" as const,
      ...super.config(),
      choices: this._choices,
      rules: Object.fromEntries(this._rules) as Partial<Record<T, string>>,
    };
  }
}

export class MultiselectBuilder<T extends string> extends PromptBuilder<T[]> {
  private readonly _choices: readonly T[];
  private _min?: number;
  private _max?: number;

  constructor(options: { choices: readonly T[] }) {
    super();
    this._choices = options.choices;
  }

  min(value: number): this {
    this._min = value;
    return this;
  }

  max(value: number): this {
    this._max = value;
    return this;
  }

  config() {
    return {
      type: "multiselect" as const,
      ...super.config(),
      choices: this._choices,
      min: this._min,
      max: this._max,
    };
  }
}

export class ListBuilder extends PromptBuilder<string[]> {
  private _min?: number;
  private _max?: number;

  min(value: number): this {
    this._min = value;
    return this;
  }

  max(value: number): this {
    this._max = value;
    return this;
  }

  config() {
    return {
      type: "list" as const,
      ...super.config(),
      min: this._min,
      max: this._max,
    };
  }
}

export class DateBuilder extends PromptBuilder<Date> {
  private _format = "YYYY-MM-DD";

  format(value: string): this {
    this._format = value;
    return this;
  }

  config() {
    return {
      type: "date" as const,
      ...super.config(),
      format: this._format,
    };
  }
}

export class FlagDefinitionBuilder<T> {
  declare readonly __valueType: T;

  private readonly _type: FlagType;
  private _label?: string;
  private _defaultValue?: T;
  private _hasDefault = false;
  private _optional = false;
  private _choices?: readonly T[];

  constructor(type: FlagType) {
    this._type = type;
  }

  label(value: string): this {
    this._label = value;
    return this;
  }

  default(value: T): this {
    this._defaultValue = value;
    this._hasDefault = true;
    return this;
  }

  optional(): FlagDefinitionBuilder<T | undefined> {
    this._optional = true;
    return this as unknown as FlagDefinitionBuilder<T | undefined>;
  }

  choices<const C extends readonly T[]>(
    values: C,
  ): FlagDefinitionBuilder<C[number]> {
    this._choices = values as unknown as readonly T[];
    return this as unknown as FlagDefinitionBuilder<C[number]>;
  }

  config() {
    return {
      type: this._type,
      label: this._label,
      defaultValue: this._defaultValue,
      hasDefault: this._hasDefault,
      optional: this._optional,
      choices: this._choices,
    };
  }
}

export class FlagBuilder {
  string(): FlagDefinitionBuilder<string> {
    return new FlagDefinitionBuilder<string>("string");
  }

  boolean(): FlagDefinitionBuilder<boolean> {
    return new FlagDefinitionBuilder<boolean>("boolean");
  }

  number(): FlagDefinitionBuilder<number> {
    return new FlagDefinitionBuilder<number>("number");
  }
}

export function createBuilder() {
  return {
    flag: () => new FlagBuilder(),
    text: () => new TextBuilder(),
    number: () => new NumberBuilder(),
    password: () => new PasswordBuilder(),
    select: <T extends string>(options: { choices: readonly T[] }) =>
      new SelectBuilder(options),
    search: <T extends string>(options: { choices: readonly T[] }) =>
      new SearchBuilder(options),
    multiselect: <T extends string>(options: { choices: readonly T[] }) =>
      new MultiselectBuilder(options),
    list: () => new ListBuilder(),
    date: () => new DateBuilder(),
    confirm: () => new ConfirmBuilder(),
  };
}
