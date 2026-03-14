import { describe, expect, it } from "vitest";
import { table } from "../src/primitives/table";
import { box } from "../src/primitives/box";
import { renderDivider } from "../src/primitives/divider";

function withStdoutTTY<T>(isTTY: boolean, fn: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: isTTY,
  });

  try {
    return fn();
  } finally {
    if (descriptor) {
      Object.defineProperty(process.stdout, "isTTY", descriptor);
    }
  }
}

function withBrowserLikeProcess<T>(fn: () => T): T {
  const originalProcess = globalThis.process;

  Object.defineProperty(globalThis, "process", {
    configurable: true,
    value: {
      ...originalProcess,
      stdout: undefined,
      stderr: undefined,
    } as unknown as NodeJS.Process,
  });

  try {
    return fn();
  } finally {
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      value: originalProcess,
    });
  }
}

describe("table primitive", () => {
  it("renders bordered columns", () => {
    const output = withStdoutTTY(false, () =>
      table(
        ["Field", "Value"],
        [
          ["project", "oscli"],
          ["teamSize", 3],
          ["approved", true],
        ],
      ),
    );

    expect(output).toBe(
      [
        "┌──────────┬───────┐",
        "│ Field    │ Value │",
        "├──────────┼───────┤",
        "│ project  │ oscli │",
        "│ teamSize │ 3     │",
        "│ approved │ true  │",
        "└──────────┴───────┘",
      ].join("\n"),
    );
  });
});

describe("box primitive", () => {
  it("wraps multiline content with title", () => {
    const output = withStdoutTTY(false, () =>
      box({
        title: "Summary",
        content: ["project: oscli", "teamSize: 3", "approved: true"].join("\n"),
      }),
    );

    expect(output).toContain("┌ Summary ");
    expect(output).toContain("│ project: oscli │");
    expect(output).toContain("│ teamSize: 3    │");
    expect(output).toContain("│ approved: true │");
    expect(output).toContain("└────────────────┘");
  });
});

describe("browser-safe output primitives", () => {
  it("renders table, box, and divider without process.stdout", () => {
    const output = withBrowserLikeProcess(() => ({
      table: table(["Field", "Value"], [["project", "oscli"]]),
      box: box({
        title: "Summary",
        content: "project: oscli",
      }),
      divider: renderDivider("Results"),
    }));

    expect(output.table).toContain("project");
    expect(output.box).toContain("Summary");
    expect(output.divider).toContain("Results");
  });
});
