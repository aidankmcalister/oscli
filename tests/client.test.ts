import { describe, expect, it, vi } from "vitest";
import { createCLI } from "../src/client";

describe("createCLI", () => {
  it("runs single-command action through commander", async () => {
    const cli = createCLI(() => ({
      description: "Test CLI",
      prompts: {},
    }));

    const originalArgv = process.argv;
    process.argv = ["node", "oscli"];

    let called = false;
    try {
      await cli.run(async () => {
        called = true;
      });
    } finally {
      process.argv = originalArgv;
    }

    expect(called).toBe(true);
  });

  it("exposes helpers for table and box output", () => {
    const cli = createCLI(() => ({
      description: "Helpers",
      prompts: {},
    }));

    const t = cli.table(
      ["Field", "Value"],
      [["project", "oscli"]],
    );

    expect(t).toContain("┌");
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
});
