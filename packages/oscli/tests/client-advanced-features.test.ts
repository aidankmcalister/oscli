import { afterEach, describe, expect, it, vi } from "vitest";
import { createCLI } from "../src/client";
import { stripAnsi } from "../src/theme";

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

async function withEnv(
  values: Partial<Record<string, string | undefined>>,
  fn: () => Promise<void>,
) {
  const original = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    original.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("phase 3", () => {
  it("supports log chaining and reusable style builders", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "styles",
      prompts: {},
    }));

    await withEnv({ TERM: "xterm-256color", NO_COLOR: undefined }, async () => {
      await withTTY(true, true, async () => {
        await withArgv(["node", "oscli"], async () => {
          await cli.run(async () => {
            const highlight = cli.style().color("cyan").bold();
            expect(highlight.render("styled output")).toContain("styled output");
            cli.log("warn", highlight.render("styled output")).underline().flush();
          });
        });
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("styled output");
  });

  it("renders links as plain label + url in non-tty mode", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "links",
      prompts: {},
    }));

    await withTTY(false, false, async () => {
      await withArgv(["node", "oscli"], async () => {
        await cli.run(async () => {
          cli.link("Docs", "https://oscli.dev");
        });
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("Docs (https://oscli.dev)");
  });

  it("provides divider tree and diff primitives", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "primitives",
      prompts: {},
    }));

    const tree = cli.tree({
      src: {
        "index.ts": null,
        "client.ts": null,
      },
      "package.json": null,
    });

    expect(tree).toContain("src");
    expect(tree).toContain("index.ts");

    await withArgv(["node", "oscli"], async () => {
      await cli.run(async () => {
        cli.divider("Results");
        cli.diff("hello\nworld", "hello\noscli");
      });
    });

    const rendered = stripAnsi(
      stdout.mock.calls.map((call) => String(call[0])).join(""),
    );
    expect(rendered).toContain("Results");
    expect(rendered).toContain("- world");
    expect(rendered).toContain("+ oscli");
  });

  it("supports search list and date prompt bypasses via cli.test", async () => {
    const cli = createCLI((b) => ({
      description: "new prompts",
      prompts: {
        framework: b
          .search({ choices: ["react", "vue", "svelte"] as const })
          .label("Framework")
          .color("cyan"),
        tags: b.list().label("Tags").min(1).max(3),
        deadline: b.date().label("Deadline").format("YYYY-MM-DD"),
      },
    }));

    cli.command("init", async () => {
      await cli.prompt.framework();
      await cli.prompt.tags();
      await cli.prompt.deadline();
      cli.success("ready");
    });

    const result = await cli.test({
      argv: ["init", "--framework", "react", "--tags", "api", "ui", "--deadline", "2026-03-10"],
    });

    expect(result.storage.framework).toBe("react");
    expect(result.storage.tags).toEqual(["api", "ui"]);
    expect(result.storage.deadline).toBeInstanceOf(Date);
    expect(result.output).toContain("Framework:");
    expect(result.output).toContain("Deadline:");
    expect(result.exitCode).toBe(0);
  });

  it("routes subcommands and clears storage between runs", async () => {
    const seen: Array<string | undefined> = [];
    const cli = createCLI((b) => ({
      description: "commands",
      prompts: {
        name: b.text().label("Name"),
      },
    }));

    cli.command("init", async () => {
      await cli.prompt.name();
      seen.push(cli.storage.name);
    });

    cli.command("deploy", async () => {
      seen.push(cli.storage.name);
      cli.success("deploy");
    });

    await cli.test({ argv: ["init", "--name", "my-app"] });
    await cli.test({ argv: ["deploy"] });

    expect(seen).toEqual(["my-app", undefined]);
  });

  it("captures output and exit codes in cli.test", async () => {
    const cli = createCLI(() => ({
      description: "test harness",
      prompts: {},
    }));

    cli.command("auth", async () => {
      cli.exit("Not authenticated.", { code: "auth" });
    });

    const result = await cli.test({ argv: ["auth"] });

    expect(result.exitCode).toBe(3);
    expect(result.output).toContain("Not authenticated.");
  });

  it("shows autocomplete hints for unknown commands", async () => {
    const cli = createCLI(() => ({
      description: "autocomplete",
      autocompleteHint: "Run `oscli completion` to enable tab completion",
      prompts: {},
    }));

    cli.command("deploy", async () => {});

    const result = await cli.test({
      argv: ["depoy"],
    });

    expect(result.exitCode).toBe(2);
    expect(result.output).toContain('Unknown command: "depoy"');
    expect(result.output).toContain("Did you mean: deploy?");
    expect(result.output).toContain("Run `oscli completion` to enable tab completion");
  });

  it("suppresses decorative output and emits only json when --json is active", async () => {
    const cli = createCLI((b) => ({
      description: "json mode",
      json: true,
      prompts: {
        name: b.text().label("Name").default("my-app"),
      },
    }));

    cli.command("init", async () => {
      cli.intro("json mode");
      await cli.prompt.name();
      cli.success("done");
      cli.setResult({ name: cli.storage.name, created: true });
      cli.outro("finished");
    });

    const result = await cli.test({
      argv: ["init", "--json"],
    });

    expect(result.exitCode).toBe(0);
    expect(result.output.trim()).toBe(
      JSON.stringify({ name: "my-app", created: true }, null, 2),
    );
    expect(result.output).not.toContain("json mode");
    expect(result.output).not.toContain("Name:");
    expect(result.output).not.toContain("done");
  });
});
