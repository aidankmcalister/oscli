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

  it("builds search list and date configs with prompt colors", () => {
    const b = createBuilder();

    const searchConfig = b
      .search({ choices: ["react", "vue"] as const })
      .label("Framework")
      .color("cyan")
      .rule("react", "component model")
      .config();

    const listConfig = b.list().label("Tags").min(1).max(5).config();
    const dateConfig = b.date().label("Deadline").format("YYYY-MM-DD").config();

    expect(searchConfig).toMatchObject({
      type: "search",
      label: "Framework",
      promptColor: "cyan",
      choices: ["react", "vue"],
      rules: { react: "component model" },
    });

    expect(listConfig).toMatchObject({
      type: "list",
      label: "Tags",
      min: 1,
      max: 5,
    });

    expect(dateConfig).toMatchObject({
      type: "date",
      label: "Deadline",
      format: "YYYY-MM-DD",
    });
  });

  it("builds flag configs with choices and defaults", () => {
    const b = createBuilder();

    const envFlag = b
      .flag()
      .string()
      .choices(["dev", "staging", "prod"] as const)
      .label("Environment")
      .default("dev")
      .config();

    const jsonFlag = b.flag().boolean().default(false).config();
    const ttlFlag = b.flag().number().optional().config();

    expect(envFlag).toMatchObject({
      type: "string",
      label: "Environment",
      defaultValue: "dev",
      hasDefault: true,
      choices: ["dev", "staging", "prod"],
    });

    expect(jsonFlag).toMatchObject({
      type: "boolean",
      defaultValue: false,
      hasDefault: true,
    });

    expect(ttlFlag).toMatchObject({
      type: "number",
      optional: true,
    });
  });

  it("builds confirm configs with toggle default and simple override", () => {
    const b = createBuilder();

    const toggleConfig = b.confirm().label("Continue?").default(true).config();
    const simpleConfig = b
      .confirm("simple")
      .label("Continue?")
      .default(false)
      .config();

    expect(toggleConfig).toMatchObject({
      type: "confirm",
      confirmMode: "toggle",
      defaultValue: true,
    });

    expect(simpleConfig).toMatchObject({
      type: "confirm",
      confirmMode: "simple",
      defaultValue: false,
    });
  });
});
