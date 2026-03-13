import { describe, expect, it, vi } from "vitest";
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
      title: "create-app",
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
      title: "auth",
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
      title: "showcase",
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
      title: "dynamic-showcase",
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

  it("can ignore prompt defaults during demo playback", async () => {
    const cli = createCLI((b) => ({
      title: "default-free-demo",
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
        skipped: b.text().label("Skipped").default("fallback"),
      },
    }));

    const events = await collectEvents(
      cli.animate({
        inputs: {
          framework: "astro",
          features: ["auth"],
          install: false,
        },
        ignoreDefaults: true,
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
        },
      }),
    );

    expect(events).toContainEqual({
      type: "prompt_preview",
      key: "features",
      label: "Features",
      promptType: "multiselect",
      lines: [
        "› ○ tailwind",
        "  ○ testing",
        "  ○ auth",
        "↑↓ navigate   space toggle   enter confirm",
      ],
    });
    expect(events).not.toContainEqual(
      expect.objectContaining({ key: "skipped" }),
    );
  });

  it("emits loop_restart before starting the next cycle when looping is enabled", async () => {
    const cli = createCLI((b) => ({
      title: "loop-demo",
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

  it("replays output from a registered main handler after the prompt flow", async () => {
    const cli = createCLI((b) => ({
      title: "create-app",
      prompts: {
        project: b.text().label("Project").default("my-app"),
        framework: b
          .select({ choices: ["next", "remix", "astro"] as const })
          .label("Framework")
          .default("next"),
        features: b
          .multiselect({ choices: ["tailwind", "testing", "auth"] as const })
          .label("Features")
          .default(["tailwind"]),
      },
    }));

    cli.main(async () => {
      await cli.prompt.project();
      await cli.prompt.framework();
      await cli.spin("Scaffolding project", async () => {});
      cli.box({
        title: "Generated files",
        content: cli.tree({
          [cli.storage.project ?? "my-app"]: {
            src: {
              "app.ts": null,
            },
          },
        }),
      });
      cli.log("info", `Framework: ${cli.storage.framework}`).flush();
      cli.success(`Created ${cli.storage.project}`);
      cli.outro(`Project ready in ./${cli.storage.project}`);
    });

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    try {
      const startedAt = Date.now();
      const events = await collectEvents(
        cli.animate({
          inputs: {
            project: "demo-app",
            framework: "astro",
            features: ["tailwind", "auth"],
          },
          ignoreDefaults: true,
          timing: {
            typeDelay: 0,
            promptDelay: 0,
            completionDelay: 0,
          },
        }),
      );
      const elapsed = Date.now() - startedAt;

      expect(events).toContainEqual({
        type: "spin_start",
        label: "Scaffolding project",
      });
      expect(events).toContainEqual({
        type: "spin_complete",
        label: "Scaffolding project",
      });
      expect(events).toContainEqual({
        type: "box_render",
        title: "Generated files",
        content: expect.stringContaining("demo-app"),
      });
      expect(events).toContainEqual({
        type: "log_line",
        level: "info",
        message: "Framework: astro",
      });
      expect(events).toContainEqual({
        type: "success_line",
        message: "Created demo-app",
      });
      expect(events).toContainEqual({
        type: "outro",
        message: "Project ready in ./demo-app",
      });
      expect(events).not.toContainEqual(
        expect.objectContaining({ key: "features" }),
      );
      expect(stdout).not.toHaveBeenCalled();
      expect(elapsed).toBeGreaterThanOrEqual(950);
    } finally {
      stdout.mockRestore();
    }
  });

  it("replays progress output from a registered main handler", async () => {
    const cli = createCLI((b) => ({
      title: "deploy",
      prompts: {
        service: b.text().label("Service").default("api"),
      },
    }));

    cli.main(async () => {
      await cli.prompt.service();
      await cli.progress(
        "Deploy pipeline",
        ["Validate", "Build", "Deploy"] as const,
        async () => {},
      );
      cli.outro(`Deployment finished for ${cli.storage.service}.`);
    });

    const startedAt = Date.now();
    const events = await collectEvents(
      cli.animate({
        inputs: {
          service: "gateway",
        },
        ignoreDefaults: true,
        timing: {
          typeDelay: 0,
          promptDelay: 0,
          completionDelay: 0,
        },
      }),
    );
    const elapsed = Date.now() - startedAt;

    expect(events).toContainEqual({
      type: "progress_start",
      label: "Deploy pipeline",
      steps: ["Validate", "Build", "Deploy"],
      currentStepIndex: 0,
      percent: 0,
    });
    expect(events).toContainEqual({
      type: "progress_update",
      label: "Deploy pipeline",
      steps: ["Validate", "Build", "Deploy"],
      currentStepIndex: 1,
      percent: 33,
    });
    expect(events).toContainEqual({
      type: "progress_update",
      label: "Deploy pipeline",
      steps: ["Validate", "Build", "Deploy"],
      currentStepIndex: 2,
      percent: 67,
    });
    expect(events).toContainEqual({
      type: "progress_complete",
      label: "Deploy pipeline",
      steps: ["Validate", "Build", "Deploy"],
      currentStepIndex: 2,
      percent: 100,
    });
    expect(events).toContainEqual({
      type: "outro",
      message: "Deployment finished for gateway.",
    });
    expect(elapsed).toBeGreaterThanOrEqual(2000);
  });
});
