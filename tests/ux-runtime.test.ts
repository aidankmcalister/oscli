import { afterEach, describe, expect, it, vi } from "vitest";
import { createCLI } from "../src/client";
import { suggest } from "../src/suggest";

async function withArgv(args: string[], fn: () => Promise<void>) {
  const originalArgv = process.argv;
  process.argv = args;

  try {
    await fn();
  } finally {
    process.argv = originalArgv;
  }
}

async function withTTY(
  stdoutTTY: boolean,
  stderrTTY: boolean,
  fn: () => Promise<void>,
) {
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
  const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");

  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: stdoutTTY,
  });
  Object.defineProperty(process.stderr, "isTTY", {
    configurable: true,
    value: stderrTTY,
  });

  try {
    await fn();
  } finally {
    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
    }
    if (stderrDescriptor) {
      Object.defineProperty(process.stderr, "isTTY", stderrDescriptor);
    }
  }
}

function mockExit() {
  return vi
    .spyOn(process, "exit")
    .mockImplementation((code?: string | number | null) => {
      throw new Error(`EXIT:${code ?? ""}`) as never;
    });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("phase 2 runtime ux", () => {
  it("routes error logs to stderr and success logs to stdout", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "streams",
      prompts: {},
    }));

    await withArgv(["node", "clios"], async () => {
      await cli.run(async () => {
        cli.log("error", "problem");
        cli.success("done");
      });
    });

    expect(stderr.mock.calls.some((call) => String(call[0]).includes("problem"))).toBe(
      true,
    );
    expect(stdout.mock.calls.some((call) => String(call[0]).includes("done"))).toBe(
      true,
    );
  });

  it("renders exit hints and resolves semantic exit codes", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const exit = mockExit();

    const cli = createCLI(() => ({
      description: "exit",
      prompts: {},
    }));

    expect(() =>
      cli.exit("Not authenticated.", {
        hint: "Sign in first.",
        code: "auth",
      }),
    ).toThrow("EXIT:3");

    expect(exit).toHaveBeenCalledWith(3);
    const rendered = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("Not authenticated.");
    expect(rendered).toContain("→ Sign in first.");
  });

  it("closes the sidebar on exit instead of leaving a trailing rail line", () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    mockExit();

    const cli = createCLI(() => ({
      description: "exit rail",
      prompts: {},
    }));

    cli.intro("session");

    expect(() => cli.exit("Run cancelled.")).toThrow("EXIT:1");

    const stderrText = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(stderrText).toContain("✗ Run cancelled.");
    expect(stderrText.endsWith("└\n")).toBe(true);

    stdout.mockRestore();
  });

  it("uses prompt defaults automatically in non-tty mode", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI((b) => ({
      description: "defaults",
      prompts: {
        project: b.text().label("Project").default("my-app"),
      },
    }));

    await withArgv(["node", "clios"], async () => {
      await cli.run(async () => {
        expect(await cli.prompt.project()).toBe("my-app");
        expect(cli.storage.project).toBe("my-app");
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("Project:");
    expect(rendered).toContain("my-app");
  });

  it("exits with code 2 when a non-tty prompt has no default or flag", async () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const exit = mockExit();

    const cli = createCLI((b) => ({
      description: "required prompt",
      prompts: {
        project: b.text().label("Project"),
      },
    }));

    await expect(
      withArgv(["node", "clios"], async () => {
        await cli.run(async () => {
          await cli.prompt.project();
        });
      }),
    ).rejects.toThrow("EXIT:2");

    expect(exit).toHaveBeenCalledWith(2);
    const rendered = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain('Prompt "project" requires input');
    expect(rendered).toContain("--project <value>");
  });

  it("exits with code 2 when a prompt bypass flag fails validation", async () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const exit = mockExit();

    const cli = createCLI((b) => ({
      description: "validated prompt",
      prompts: {
        project: b
          .text()
          .label("Project")
          .validate((value) =>
            value.length >= 3 ? true : "Must be at least 3 characters.",
          ),
      },
    }));

    await expect(
      withArgv(["node", "clios", "--project", "ab"], async () => {
        await cli.run(async () => {
          await cli.prompt.project();
        });
      }),
    ).rejects.toThrow("EXIT:2");

    expect(exit).toHaveBeenCalledWith(2);
    expect(
      stderr.mock.calls.some((call) =>
        String(call[0]).includes("Must be at least 3 characters."),
      ),
    ).toBe(true);
  });

  it("tracks --no-color on the cli instance and strips ansi output", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "no color",
      prompts: {},
    }));

    await withTTY(true, true, async () => {
      await withArgv(["node", "clios", "--no-color"], async () => {
        await cli.run(async () => {
          expect(cli._noColor).toBe(true);
          cli.log("info", "plain");
        });
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("plain");
    expect(rendered.includes("\u001b[")).toBe(false);
  });

  it("uses ascii spinner frames when no-color is active", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "ascii spinner",
      prompts: {},
    }));

    await withArgv(["node", "clios", "--no-color"], async () => {
      await cli.run(async () => {
        await cli.spin("Installing packages", async () => {
          await Promise.resolve();
        });
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("- Installing packages...");
    expect(rendered).toContain("Installed packages");
  });

  it("auto-switches spinner labels to past tense and respects explicit done labels", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "spinner labels",
      prompts: {},
    }));

    await withArgv(["node", "clios"], async () => {
      await cli.run(async () => {
        await cli.spin("Installing packages", async () => {
          await Promise.resolve();
        });
        await cli.spin(
          "Generating files",
          async () => {
            await Promise.resolve();
          },
          { doneLabel: "Files ready" },
        );
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("Installed packages");
    expect(rendered).toContain("Files ready");
  });

  it("formats unknown commands as usage errors", async () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const exit = mockExit();

    const cli = createCLI(() => ({
      description: "unknown command",
      prompts: {},
    }));

    await expect(
      withArgv(["node", "clios", "depoy"], async () => {
        await cli.run(async () => {});
      }),
    ).rejects.toThrow("EXIT:2");

    expect(exit).toHaveBeenCalledWith(2);
    expect(
      stderr.mock.calls.some((call) =>
        String(call[0]).includes('Unknown command: "depoy"'),
      ),
    ).toBe(true);
  });

  it("rejects reserved no-color flags", () => {
    expect(() =>
      createCLI((b) => ({
        description: "reserved no-color",
        flags: {
          "no-color": b.flag().boolean(),
        },
        prompts: {},
      })),
    ).toThrowError("Flag 'no-color' is reserved by clios.");
  });

  it("exposes the suggestion helper on the cli instance", () => {
    const cli = createCLI(() => ({
      description: "suggest",
      prompts: {},
    }));

    expect(suggest("depoy", ["deploy", "init"])).toBe("deploy");
    expect(cli.suggest("depoy", ["deploy", "init"])).toBe("deploy");
    expect(cli.suggest("zzz", ["deploy", "init"])).toBeNull();
  });
});
