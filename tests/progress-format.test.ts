import { describe, expect, it } from "vitest";
import { createProgressGroup, renderProgressLine } from "../packages/oscli/src/primitives/progress";
import { decorateLine, setRailEnabled } from "../packages/oscli/src/output";
import { stripAnsi, visibleLength } from "../packages/oscli/src/theme";

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

    const strippedDoneLine = stripAnsi(doneLine);
    const strippedRunningLine = stripAnsi(runningLine);

    expect(strippedDoneLine).toContain("[00:03]");
    expect(strippedRunningLine).toContain("[00:04]");
    expect(strippedDoneLine.endsWith("100%")).toBe(true);
    expect(strippedRunningLine.endsWith(" 60%")).toBe(true);

    expect(strippedDoneLine.indexOf("[00:03]")).toBe(
      strippedRunningLine.indexOf("[00:04]"),
    );
    expect(strippedDoneLine.lastIndexOf("100%")).toBe(
      strippedRunningLine.lastIndexOf(" 60%"),
    );
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

    const strippedLine = stripAnsi(line);

    expect(strippedLine).toContain("validate ▶ prepare ▶ [write] ▷ finalize");
    expect(strippedLine).toContain("[00:04]");
    expect(strippedLine.includes("%")).toBe(false);
  });

  it("keeps a rail-decorated progress line inside terminal width", () => {
    const originalColumns = process.stdout.columns;

    Object.defineProperty(process.stdout, "columns", {
      configurable: true,
      value: 80,
    });

    setRailEnabled(true);

    try {
      const context = createProgressGroup([{ label: "Running steps" }], {
        style: "hash",
        width: 20,
      });

      const line = renderProgressLine({
        icon: "✓",
        label: "Running steps",
        elapsedMs: 0,
        percent: 100,
        context,
      });

      expect(visibleLength(decorateLine(line))).toBeLessThan(80);
    } finally {
      setRailEnabled(false);

      Object.defineProperty(process.stdout, "columns", {
        configurable: true,
        value: originalColumns,
      });
    }
  });
});
