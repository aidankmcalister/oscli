import { describe, expect, it } from "vitest";
import { diff } from "../src/primitives/diff";
import { ascii } from "../src/primitives/ascii";
import { renderDivider } from "../src/primitives/divider";
import { tree } from "../src/primitives/tree";
import { stripAnsi, visibleLength } from "../src/theme";

describe("diff rendering", () => {
  it("marks added and removed lines", () => {
    const output = diff("hello\nworld", "hello\nearth");
    const stripped = stripAnsi(output);

    expect(stripped).toContain("  hello");
    expect(stripped).toContain("- world");
    expect(stripped).toContain("+ earth");
  });

  it("handles identical strings with no diff markers", () => {
    const output = diff("same\nlines", "same\nlines");
    const stripped = stripAnsi(output);

    expect(stripped).not.toContain("+");
    expect(stripped).not.toContain("-");
    expect(stripped).toContain("same");
    expect(stripped).toContain("lines");
  });

  it("handles empty-to-content diff", () => {
    const output = diff("", "new content");
    const stripped = stripAnsi(output);

    expect(stripped).toContain("+ new content");
  });
});

describe("ascii rendering", () => {
  it("produces consistent-width lines for a word", () => {
    const lines = ascii("HI");
    expect(lines.length).toBeGreaterThan(0);

    const widths = lines.map((line) => line.length);
    const firstWidth = widths[0];
    for (const width of widths) {
      expect(width).toBe(firstWidth);
    }
  });

  it("renders uppercase regardless of input case", () => {
    const lower = ascii("ab");
    const upper = ascii("AB");
    expect(lower).toEqual(upper);
  });

  it("returns empty array for empty string", () => {
    const lines = ascii("");
    expect(lines).toEqual([]);
  });
});

describe("divider rendering", () => {
  it("renders a plain divider without label", () => {
    const output = renderDivider();
    const stripped = stripAnsi(output);

    expect(stripped).toMatch(/─{4,}/);
  });

  it("renders a labeled divider with label centered", () => {
    const output = renderDivider("Results");
    const stripped = stripAnsi(output);

    expect(stripped).toContain("Results");
    expect(stripped).toMatch(/─.*Results.*─/);
  });

  it("produces consistent visible width with and without label", () => {
    const plain = renderDivider();
    const labeled = renderDivider("Test");

    expect(visibleLength(plain)).toBe(visibleLength(labeled));
  });
});

describe("tree rendering", () => {
  it("renders a flat tree with connectors", () => {
    const output = tree({
      child1: null,
      child2: null,
    });
    const stripped = stripAnsi(output);

    expect(stripped).toContain("├─ child1");
    expect(stripped).toContain("└─ child2");
  });

  it("renders nested children with proper indentation", () => {
    const output = tree({
      parent: {
        leaf: null,
      },
    });
    const stripped = stripAnsi(output);

    expect(stripped).toContain("└─ parent");
    expect(stripped).toContain("   └─ leaf");
  });

  it("renders mixed nested and leaf nodes", () => {
    const output = tree({
      src: {
        "index.ts": null,
        utils: {
          "date.ts": null,
        },
      },
      "README.md": null,
    });
    const stripped = stripAnsi(output);

    expect(stripped).toContain("├─ src");
    expect(stripped).toContain("└─ README.md");
    expect(stripped).toContain("index.ts");
    expect(stripped).toContain("date.ts");
  });
});
