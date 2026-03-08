import { describe, expect, it } from "vitest";
import { createProgressGroup, renderProgressLine } from "../src/primitives/progress";
import { decorateLine, setRailEnabled } from "../src/output";
import { visibleLength } from "../src/theme";

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
