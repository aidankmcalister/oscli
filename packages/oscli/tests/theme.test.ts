import { afterEach, describe, expect, it } from "vitest";
import { createCLI } from "../src/client";
import { activeTheme, applyTheme, theme, themePresets } from "../src/theme";

afterEach(() => {
  applyTheme({});
});

describe("theme overrides", () => {
  it("deep merges symbols and spacing without mutating defaults", () => {
    const resolved = applyTheme({
      symbols: {
        cursor: "❯",
        success: "✔",
      },
      spacing: 2,
    });

    expect(resolved).not.toBe(theme);
    expect(resolved.symbols.cursor).toBe("❯");
    expect(resolved.symbols.success).toBe("✔");
    expect(resolved.symbols.error).toBe(theme.symbols.error);
    expect(resolved.layout.spacing).toBe(2);

    expect(theme.symbols.cursor).toBe("›");
    expect(theme.symbols.success).toBe("✓");
    expect(theme.layout.spacing).toBe(1);
  });

  it("overrides only requested color handlers", () => {
    const resolved = applyTheme({
      cursor: "cyan",
      success: "blue",
      border: "yellow",
    });

    expect(resolved.color.cursor).not.toBe(theme.color.cursor);
    expect(resolved.color.success).not.toBe(theme.color.success);
    expect(resolved.color.border).not.toBe(theme.color.border);
    expect(resolved.color.error).toBe(theme.color.error);
    expect(activeTheme).toBe(resolved);
  });

  it("supports rounded sidebar symbols", () => {
    const resolved = applyTheme({
      sidebar: "rounded",
    });

    expect(resolved.symbols.intro).toBe("╭");
    expect(resolved.symbols.outro).toBe("╰");
    expect(resolved.symbols.pipe).toBe("│");
  });

  it("supports disabling the sidebar", () => {
    const resolved = applyTheme({
      sidebar: false,
    });

    expect(resolved.symbols.intro).toBe("");
    expect(resolved.symbols.outro).toBe("");
    expect(resolved.symbols.pipe).toBe("");
  });

  it("exports named theme presets", () => {
    expect(themePresets.default).toEqual({});
    expect(themePresets.basic).toMatchObject({
      spacing: 0,
      cursor: "cyan",
      active: "cyan",
    });
    expect(themePresets.rounded).toMatchObject({
      sidebar: "rounded",
      spacing: 1,
    });
  });

  it("applies the basic preset with square corners and zero spacing", () => {
    const resolved = applyTheme(themePresets.basic);

    expect(resolved.symbols.intro).toBe("┌");
    expect(resolved.symbols.outro).toBe("└");
    expect(resolved.symbols.pipe).toBe("│");
    expect(resolved.layout.spacing).toBe(0);
  });

  it("stores the resolved theme on the cli instance", () => {
    const cli = createCLI(() => ({
      title: "Theme test",
      theme: {
        active: "cyan",
        symbols: {
          success: "✔",
        },
        spacing: 0,
      },
    }));

    expect(cli._theme.symbols.success).toBe("✔");
    expect(cli._theme.layout.spacing).toBe(0);
    expect(cli._theme.color.active).not.toBe(theme.color.active);
  });

  it("stores sidebar overrides on the cli instance", () => {
    const cli = createCLI(() => ({
      title: "Sidebar test",
      theme: {
        sidebar: false,
      },
    }));

    expect(cli._theme.symbols.intro).toBe("");
    expect(cli._theme.symbols.outro).toBe("");
    expect(cli._theme.symbols.pipe).toBe("");
  });

  it("accepts theme preset names on the cli config", () => {
    const cli = createCLI(() => ({
      title: "Preset test",
      theme: "rounded",
    }));

    expect(cli._theme.symbols.intro).toBe("╭");
    expect(cli._theme.symbols.outro).toBe("╰");
  });
});
