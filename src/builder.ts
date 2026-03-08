export type Validator<T> = (value: T) => true | string | Promise<true | string>;

export class PromptBuilder<T> {
  private _label?: string;
  private _describe?: string;
  private _placeholder?: string;
  private _default?: T;
  private _optional = false;
  private _validate?: Validator<T>;
  private _transform?: (value: unknown) => unknown;
  private _theme?: string;

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

  config() {
    return {
      label: this._label,
      describe: this._describe,
      placeholder: this._placeholder,
      defaultValue: this._default,
      optional: this._optional,
      validate: this._validate,
      transform: this._transform,
      theme: this._theme,
    };
  }
}

export class TextBuilder extends PromptBuilder<string> {}

export class PasswordBuilder extends PromptBuilder<string> {}

export class ConfirmBuilder extends PromptBuilder<boolean> {}

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
      ...super.config(),
      min: this._min,
      max: this._max,
      prefix: this._prefix,
    };
  }
}

export function createBuilder() {
  return {
    text: () => new TextBuilder(),
    number: () => new NumberBuilder(),
    password: () => new PasswordBuilder(),
    confirm: () => new ConfirmBuilder(),
  };
}
