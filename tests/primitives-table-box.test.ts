import { describe, expect, it } from "vitest";
import { table } from "../src/primitives/table";
import { box } from "../src/primitives/box";

describe("table primitive", () => {
  it("renders bordered columns", () => {
    const output = table(
      ["Field", "Value"],
      [
        ["project", "clios"],
        ["teamSize", 3],
        ["approved", true],
      ],
    );

    expect(output).toBe(
      [
        "┌──────────┬───────┐",
        "│ Field    │ Value │",
        "├──────────┼───────┤",
        "│ project  │ clios │",
        "│ teamSize │ 3     │",
        "│ approved │ true  │",
        "└──────────┴───────┘",
      ].join("\n"),
    );
  });
});

describe("box primitive", () => {
  it("wraps multiline content with title", () => {
    const output = box({
      title: "Summary",
      content: ["project: clios", "teamSize: 3", "approved: true"].join("\n"),
    });

    expect(output).toContain("┌ Summary ");
    expect(output).toContain("│ project: clios │");
    expect(output).toContain("│ teamSize: 3    │");
    expect(output).toContain("│ approved: true │");
    expect(output).toContain("└────────────────┘");
  });
});
