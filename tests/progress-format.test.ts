import { describe, expect, it } from "vitest";
import { createProgressGroup, renderProgressLine } from "../src/primitives/progress";

describe("progress formatting", () => {
  it("keeps timer and percent columns aligned across a group", () => {
    const context = createProgressGroup(
      [
        { label: "download deps" },
        { label: "compile" },
        { label: "run tests" },
      ],
      { style: "hash", width: 20 },
    );

    const doneLine = renderProgressLine({
      icon: "✓",
      label: "compile",
      elapsedMs: 3000,
      percent: 100,
      context,
    });

    const runningLine = renderProgressLine({
      icon: "⠸",
      label: "run tests",
      elapsedMs: 4000,
      percent: 60,
      context,
    });

    expect(doneLine).toContain("[00:03]");
    expect(runningLine).toContain("[00:04]");
    expect(doneLine.endsWith("100%")).toBe(true);
    expect(runningLine.endsWith(" 60%")).toBe(true);

    expect(doneLine.indexOf("[00:03]")).toBe(runningLine.indexOf("[00:04]"));
    expect(doneLine.lastIndexOf("100%")).toBe(runningLine.lastIndexOf(" 60%"));
  });

  it("renders named step style", () => {
    const steps = ["validate", "prepare", "write", "finalize"] as const;
    const context = createProgressGroup([{ label: "installing", steps }], {
      style: "steps",
    });

    const line = renderProgressLine({
      icon: "⠼",
      label: "installing",
      elapsedMs: 4000,
      steps,
      currentStepIndex: 2,
      context,
    });

    expect(line).toContain("validate ▶ prepare ▶ [write] ▷ finalize");
    expect(line).toContain("[00:04]");
    expect(line.includes("%")).toBe(false);
  });
});
