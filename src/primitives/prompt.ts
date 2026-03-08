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
