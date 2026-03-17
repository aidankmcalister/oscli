import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSelectPrompt } from "../src/primitives/prompt";

async function withInteractivePrompt<T>(run: () => Promise<T>): Promise<T> {
  const stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
  const setRawMode = Object.getOwnPropertyDescriptor(process.stdin, "setRawMode");

  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(process.stdin, "setRawMode", {
    configurable: true,
    value: vi.fn(),
  });

  const resume = vi.spyOn(process.stdin, "resume").mockImplementation(() => process.stdin);
  const pause = vi.spyOn(process.stdin, "pause").mockImplementation(() => process.stdin);
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

  try {
    return await run();
  } finally {
    resume.mockRestore();
    pause.mockRestore();
    write.mockRestore();

    if (setRawMode) {
      Object.defineProperty(process.stdin, "setRawMode", setRawMode);
    } else {
      delete (process.stdin as { setRawMode?: unknown }).setRawMode;
    }
    if (stdinTTY) {
      Object.defineProperty(process.stdin, "isTTY", stdinTTY);
    }
    if (stdoutTTY) {
      Object.defineProperty(process.stdout, "isTTY", stdoutTTY);
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("renderSelectPrompt", () => {
  it("submits the configured default choice when enter is pressed immediately", async () => {
    const pending = withInteractivePrompt(() =>
      renderSelectPrompt({
        label: "Framework",
        choices: ["next", "remix", "astro"] as const,
        defaultValue: "remix",
      }),
    );

    process.stdin.emit("data", "\r");

    await expect(pending).resolves.toBe("remix");
  });

  it("rejects empty choice lists instead of resolving undefined", () => {
    expect(() =>
      renderSelectPrompt({
        label: "Framework",
        choices: [] as string[],
      }),
    ).toThrowError('Select prompt "Framework" requires at least one choice.');
  });
});
