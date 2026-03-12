import { describe, expect, it } from "vitest";
import { createCLI, type AnimateEvent } from "../src/client";

async function collectEvents(
  iterator: AsyncGenerator<AnimateEvent>,
  stopAt: AnimateEvent["type"] = "run_complete",
): Promise<AnimateEvent[]> {
  const events: AnimateEvent[] = [];

  for await (const event of iterator) {
    events.push(event);
    if (event.type === stopAt) {
      break;
    }
  }

  return events;
}

describe("cli.animate", () => {
  it("emits prompt events from registered definitions without mutating storage", async () => {
    const cli = createCLI((b) => ({
      description: "create-app",
      prompts: {
        project: b.text().label("Project").default("my-app"),
        template: b
          .select({ choices: ["next", "remix", "astro"] as const })
          .label("Template")
          .default("next"),
        install: b.confirm().label("Install dependencies?").default(true),
        skipped: b.text().label("Skipped"),
      },
    }));

    const events = await collectEvents(
      cli.animate({
        inputs: {
          project: "demo-app",
          template: "remix",
          install: true,
        },
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
        },
      }),
    );

    expect(events[0]).toEqual({ type: "intro", message: "create-app" });
    expect(events).toContainEqual({
      type: "prompt_start",
      key: "project",
      label: "Project",
      promptType: "text",
    });
    expect(events).toContainEqual({
      type: "char",
      key: "project",
      value: "d",
      full: "d",
    });
    expect(events).toContainEqual({
      type: "prompt_submit",
      key: "template",
      label: "Template",
      displayValue: "remix",
    });
    expect(events).toContainEqual({
      type: "prompt_submit",
      key: "install",
      label: "Install dependencies?",
      displayValue: "yes",
    });
    expect(events).not.toContainEqual(
      expect.objectContaining({ key: "skipped" }),
    );
    expect(events.at(-2)).toEqual({
      type: "outro",
      message: "Created demo-app",
    });
    expect(events.at(-1)).toEqual({ type: "run_complete" });
    expect(cli.storage.project).toBeUndefined();
  });

  it("masks password prompts and types simple confirms as y or n", async () => {
    const cli = createCLI((b) => ({
      description: "auth",
      prompts: {
        token: b.password().label("API token").default("secret-key"),
        approved: b.confirm("simple").label("Continue?").default(false),
      },
    }));

    const events = await collectEvents(
      cli.animate({
        inputs: {
          token: "hunter2",
          approved: false,
        },
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
        },
      }),
    );

    expect(events).toContainEqual({
      type: "char",
      key: "token",
      value: "*",
      full: "*",
    });
    expect(events).toContainEqual({
      type: "prompt_submit",
      key: "token",
      label: "API token",
      displayValue: "*******",
    });
    expect(events).toContainEqual({
      type: "char",
      key: "approved",
      value: "n",
      full: "n",
    });
    expect(events).toContainEqual({
      type: "prompt_submit",
      key: "approved",
      label: "Continue?",
      displayValue: "no",
    });
  });

  it("emits preview frames for select, multiselect, and toggle confirms", async () => {
    const cli = createCLI((b) => ({
      description: "showcase",
      prompts: {
        framework: b
          .select({ choices: ["next", "remix", "astro"] as const })
          .label("Framework")
          .default("next"),
        features: b
          .multiselect({ choices: ["tailwind", "testing", "auth"] as const })
          .label("Features")
          .default(["tailwind", "testing"]),
        install: b.confirm().label("Install dependencies?").default(true),
      },
    }));

    const events = await collectEvents(
      cli.animate({
        inputs: {
          framework: "next",
          features: ["tailwind", "testing"],
          install: true,
        },
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
        },
      }),
    );

    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "framework",
      label: "Framework",
      promptType: "select",
      lines: [
        "› ● next",
        "  ○ remix",
        "  ○ astro",
        "↑↓ navigate   enter select",
      ],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "features",
      label: "Features",
      promptType: "multiselect",
      lines: [
        "› ◉ tailwind",
        "  ◉ testing",
        "  ○ auth",
        "↑↓ navigate   space toggle   enter confirm",
      ],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "install",
      label: "Install dependencies?",
      promptType: "confirm-toggle",
      lines: ["● Yes  /  ○ No"],
    });
  });

  it("animates cursor movement and toggle state changes for interactive prompts", async () => {
    const cli = createCLI((b) => ({
      description: "dynamic-showcase",
      prompts: {
        framework: b
          .select({ choices: ["next", "remix", "astro"] as const })
          .label("Framework")
          .default("next"),
        features: b
          .multiselect({ choices: ["tailwind", "testing", "auth"] as const })
          .label("Features")
          .default(["tailwind"]),
        install: b.confirm().label("Install dependencies?").default(true),
      },
    }));

    const events = await collectEvents(
      cli.animate({
        inputs: {
          framework: "astro",
          features: ["tailwind", "auth"],
          install: false,
        },
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
        },
      }),
    );

    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "framework",
      label: "Framework",
      promptType: "select",
      lines: [
        "› ● next",
        "  ○ remix",
        "  ○ astro",
        "↑↓ navigate   enter select",
      ],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "framework",
      label: "Framework",
      promptType: "select",
      lines: [
        "  ○ next",
        "  ○ remix",
        "› ● astro",
        "↑↓ navigate   enter select",
      ],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "features",
      label: "Features",
      promptType: "multiselect",
      lines: [
        "› ◉ tailwind",
        "  ○ testing",
        "  ○ auth",
        "↑↓ navigate   space toggle   enter confirm",
      ],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "features",
      label: "Features",
      promptType: "multiselect",
      lines: [
        "  ◉ tailwind",
        "  ○ testing",
        "› ◉ auth",
        "↑↓ navigate   space toggle   enter confirm",
      ],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "install",
      label: "Install dependencies?",
      promptType: "confirm-toggle",
      lines: ["● Yes  /  ○ No"],
    });
    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "install",
      label: "Install dependencies?",
      promptType: "confirm-toggle",
      lines: ["○ Yes  /  ● No"],
    });
  });

  it("emits loop_restart before starting the next cycle when looping is enabled", async () => {
    const cli = createCLI((b) => ({
      description: "loop-demo",
      prompts: {
        name: b.text().label("Name").default("oscli"),
      },
    }));

    const events = await collectEvents(
      cli.animate({
        inputs: { name: "loop" },
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
          loop: true,
          loopDelay: 0,
        },
      }),
      "loop_restart",
    );

    expect(events.at(-1)).toEqual({ type: "loop_restart" });
    expect(events).toContainEqual({ type: "run_complete" });
  });
});
