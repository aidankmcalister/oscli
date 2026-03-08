import { describe, expect, it } from "vitest";
import { createBuilder } from "../src/builder";

describe("createBuilder", () => {
  it("builds text prompt config with shared options", () => {
    const b = createBuilder();

    const config = b
      .text()
      .label("Project")
      .describe("Project name")
      .placeholder("my-app")
      .default("my-app")
      .theme("block")
      .config();

    expect(config).toMatchObject({
      type: "text",
      label: "Project",
      describe: "Project name",
      placeholder: "my-app",
      defaultValue: "my-app",
      optional: false,
      theme: "block",
    });
  });

  it("supports optional + transform + validate", () => {
    const b = createBuilder();

    const config = b
      .text()
      .optional()
      .transform((value) => value?.trim() ?? "")
      .validate((value) => (value.length > 0 ? true : "Required"))
      .config();

    expect(config.optional).toBe(true);
    expect(typeof config.transform).toBe("function");
    expect(typeof config.validate).toBe("function");
  });

  it("builds select and multiselect configs", () => {
    const b = createBuilder();

    const selectConfig = b
      .select({ choices: ["personal", "work"] as const })
      .label("Mode")
      .rule("work", "team project")
      .config();

    const multiselectConfig = b
      .multiselect({ choices: ["api", "ui", "docs"] as const })
      .min(1)
      .max(2)
      .config();

    expect(selectConfig).toMatchObject({
      type: "select",
      label: "Mode",
      choices: ["personal", "work"],
    });
    expect(selectConfig.rules).toEqual({ work: "team project" });

    expect(multiselectConfig).toMatchObject({
      type: "multiselect",
      choices: ["api", "ui", "docs"],
      min: 1,
      max: 2,
    });
  });
});
