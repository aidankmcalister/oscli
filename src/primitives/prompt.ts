import readline from "node:readline";

export type TextPromptOptions = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
};

export function enableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
}

export function disableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

export function clearLine(): void {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

export function moveCursorUp(lines: number): void {
  process.stdout.moveCursor(0, -lines);
}

export function renderTextPrompt(options: TextPromptOptions): Promise<string> {
  const { label, placeholder, defaultValue } = options;
  let value = "";
  const render = () => {
    const preview =
      value.length > 0 ? value : (placeholder ?? defaultValue ?? "");
    clearLine();
    process.stdout.write(`${label}: ${preview}`);
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off("data", onData);
      disableRawMode();
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\r" || key === "\n") {
        const result = value.length > 0 ? value : (defaultValue ?? "");
        cleanup();
        clearLine();
        process.stdout.write(`${label}: ${result}\n`);
        resolve(result);
        return;
      }

      if (key === "\u007f" || key === "\b" || key === "\x08") {
        value = value.slice(0, -1);
        render();
        return;
      }

      if (key >= " " && key <= "~") {
        value += key;
        render();
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

export type PasswordPromptOptions = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
};

export function renderPasswordPrompt(
  options: PasswordPromptOptions,
): Promise<string> {
  const { label, placeholder, defaultValue } = options;
  let value = "";

  const render = () => {
    const preview =
      value.length > 0
        ? "*".repeat(value.length)
        : (placeholder ??
          (defaultValue ? "*".repeat(defaultValue.length) : ""));
    clearLine();
    process.stdout.write(`${label}: ${preview}`);
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off("data", onData);
      disableRawMode();
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\r" || key === "\n") {
        const result = value.length > 0 ? value : (defaultValue ?? "");
        cleanup();
        clearLine();
        process.stdout.write(`${label}: ${"*".repeat(result.length)}\n`);
        resolve(result);
        return;
      }

      if (key === "\u007f" || key === "\b" || key === "\x08") {
        value = value.slice(0, -1);
        render();
        return;
      }

      if (key >= " " && key <= "~") {
        value += key;
        render();
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    render();
  });
}

export type NumberPromptOptions = {
  label: string;
  min?: number;
  max?: number;
  prefix?: string;
  placeholder?: string;
  defaultValue?: number;
};

export async function renderNumberPrompt(
  options: NumberPromptOptions,
): Promise<number> {
  const { label, min, max, prefix, placeholder, defaultValue } = options;

  while (true) {
    const raw = await renderTextPrompt({
      label,
      placeholder,
      defaultValue:
        defaultValue === undefined ? undefined : String(defaultValue),
    });

    const normalized =
      prefix && raw.startsWith(prefix) ? raw.slice(prefix.length).trim() : raw;

    const parsed = Number(normalized);

    if (Number.isNaN(parsed)) {
      process.stdout.write("Invalid number. Please enter a numeric value.\n");
      continue;
    }

    if (min !== undefined && parsed < min) {
      process.stdout.write(`Value must be at least ${min}.\n`);
      continue;
    }

    if (max !== undefined && parsed > max) {
      process.stdout.write(`Value must be at most ${max}.\n`);
      continue;
    }

    return parsed;
  }
}

export type SelectPromptOptions<T extends string> = {
  label: string;
  choices: readonly T[];
};

export function renderSelectPrompt<T extends string>(
  options: SelectPromptOptions<T>,
): Promise<T> {
  const { label, choices } = options;
  let selectedIndex = 0;
  let renderedLines = 0;

  const clearMenu = () => {
    if (renderedLines === 0) return;
    readline.moveCursor(process.stdout, 0, -renderedLines);
    readline.cursorTo(process.stdout, 0);
    readline.clearScreenDown(process.stdout);
    renderedLines = 0;
  };

  const renderMenu = () => {
    clearMenu();
    const lines = [
      `${label}:`,
      ...choices.map(
        (choice, index) => `${index === selectedIndex ? "❯" : " "} ${choice}`,
      ),
      "Use ↑/↓ and press Enter",
    ];

    for (const line of lines) {
      process.stdout.write(`${line}\n`);
    }

    renderedLines = lines.length;
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off("data", onData);
      disableRawMode();
      clearMenu();
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\u001b[A") {
        selectedIndex =
          selectedIndex === 0 ? choices.length - 1 : selectedIndex - 1;
        renderMenu();
        return;
      }

      if (key === "\u001b[B") {
        selectedIndex =
          selectedIndex === choices.length - 1 ? 0 : selectedIndex + 1;
        renderMenu();
        return;
      }

      if (key === "\r" || key === "\n") {
        const selected = choices[selectedIndex];
        cleanup();
        process.stdout.write(`${label}: ${selected}\n`);
        resolve(selected);
      }
    };

    enableRawMode();
    process.stdin.on("data", onData);
    renderMenu();
  });
}
