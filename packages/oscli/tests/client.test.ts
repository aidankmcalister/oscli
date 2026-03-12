import { describe, expect, it, vi } from "vitest";
import { createCLI } from "../src/client";

async function withArgv(args: string[], fn: () => Promise<void>) {
  const originalArgv = process.argv;
  process.argv = args;

  try {
    await fn();
  } finally {
    process.argv = originalArgv;
  }
}

describe("createCLI", () => {
  it("runs single-command action through commander", async () => {
    const cli = createCLI(() => ({
      description: "Test CLI",
    }));

    let called = false;
    await withArgv(["node", "oscli"], async () => {
      await cli.run(async () => {
        called = true;
      });
    });

    expect(called).toBe(true);
  });

  it("exposes helpers for table and box output", () => {
    const cli = createCLI(() => ({
      description: "Helpers",
      prompts: {},
    }));

    const t = cli.table(["Field", "Value"], [["project", "oscli"]]);

    expect(t).toContain("Field");
    expect(t).toContain("project");

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    try {
      cli.box({
        title: "Summary",
        content: "project: oscli",
      });

      expect(stdout).toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
    }
  });

  it("parses custom flags with inferred values", async () => {
    const cli = createCLI((b) => ({
      description: "Flags",
      flags: {
        env: b
          .flag()
          .string()
          .choices(["dev", "staging", "prod"] as const)
          .default("dev"),
        json: b.flag().boolean().default(false),
        ttl: b.flag().string().default("1h"),
      },
      prompts: {},
    }));

    await withArgv(
      ["node", "oscli", "--env", "staging", "--json"],
      async () => {
        await cli.run(async () => {
          expect(cli.flags.env).toBe("staging");
          expect(cli.flags.json).toBe(true);
          expect(cli.flags.ttl).toBe("1h");
        });
      },
    );
  });

  it("bypasses matching prompts when a same-name flag is passed", async () => {
    const cli = createCLI((b) => ({
      description: "Prompt bypass",
      prompts: {
        name: b.text().label("Database name").default("mydb"),
      },
    }));

    await withArgv(["node", "oscli", "--name", "from-flag"], async () => {
      await cli.run(async () => {
        const name = await cli.prompt.name();

        expect(name).toBe("from-flag");
        expect(cli.storage.name).toBe("from-flag");
      });
    });
  });

  it("auto-answers confirm prompts when --yes is used", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    try {
      const cli = createCLI((b) => ({
        description: "Auto yes",
        prompts: {
          approved: b.confirm().label("Approved"),
        },
      }));

      await withArgv(["node", "oscli", "--yes"], async () => {
        await cli.run(async () => {
          expect(await cli.prompt.approved()).toBe(true);
          expect(await cli.confirm("Continue?")).toBe(true);
        });
      });

      expect(
        stdout.mock.calls.some((call) => String(call[0]).includes("(--yes)")),
      ).toBe(true);
    } finally {
      stdout.mockRestore();
    }
  });

  it("throws when user defines reserved yes flag", () => {
    expect(() =>
      createCLI((b) => ({
        description: "Reserved",
        flags: {
          yes: b.flag().boolean(),
        },
        prompts: {},
      })),
    ).toThrowError(
      "Flag name 'yes' is reserved by oscli. Use a different name.",
    );
  });

  it("prints a plain log line with no icon or severity prefix", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const cli = createCLI(() => ({
      description: "Plain log",
      prompts: {},
    }));

    await withArgv(["node", "oscli"], async () => {
      await cli.run(async () => {
        cli.log("Working directory ready");
      });
    });

    const rendered = stdout.mock.calls.map((call) => String(call[0])).join("");
    expect(rendered).toContain("Working directory ready");
    expect(rendered).not.toContain("ℹ");
    expect(rendered).not.toContain("✓");
    expect(rendered).not.toContain("✗");
    expect(rendered).not.toContain("⚠");
  });
});
