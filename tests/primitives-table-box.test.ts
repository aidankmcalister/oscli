import { describe, expect, it } from "vitest";
import { table } from "../packages/oscli/src/primitives/table";
import { box } from "../packages/oscli/src/primitives/box";

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
