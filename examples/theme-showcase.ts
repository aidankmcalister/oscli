import { createCLI } from "../src/index.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const themes = ["default", "basic", "rounded"] as const;

type ThemeName = (typeof themes)[number];

function createShowcaseCLI(themeName: ThemeName) {
  return createCLI((b) => ({
    description: `Theme showcase (${themeName}).`,
    theme: themeName,
    prompts: {
      project: b.text().label("Project").default("showcase-app"),
      runtime: b
        .select({ choices: ["bun", "npm", "pnpm"] as const })
        .label("Runtime")
        .default("bun"),
      install: b.confirm().label("Install dependencies?").default(true),
    },
  }));
}

for (let index = 0; index < themes.length; index += 1) {
  const themeName = themes[index];
  const cli = createShowcaseCLI(themeName);

  await cli.run(async () => {
    cli.intro(`theme showcase: ${themeName}`);

    await cli.prompt.project();
    await cli.prompt.runtime();
    await cli.prompt.install();

    cli.log(`Plain log line for ${themeName}.`).flush();
    cli.log("info", "Info log with contextual guidance.").flush();
    cli.log("warn", "Warning log for attention-required output.").flush();
    cli.log("error", "Error log styling sample.").flush();
    cli.success(`Captured prompt state for ${cli.storage.project}.`);

    cli.divider("Layout");
    cli.box({
      title: "Summary",
      content: cli.table(
        ["Field", "Value"],
        [
          ["project", cli.storage.project ?? "showcase-app"],
          ["runtime", cli.storage.runtime ?? "bun"],
          ["install", cli.storage.install ? "yes" : "no"],
        ],
      ),
    });

    cli.box({
      title: "Project tree",
      content: cli.tree({
        [cli.storage.project ?? "showcase-app"]: {
          src: {
            "index.ts": null,
            "client.ts": null,
          },
          "package.json": null,
          "README.md": null,
        },
      }),
    });

    await cli.spin("Rendering spinner preview", async () => {
      await sleep(450);
    });

    await cli.progress(
      "Rendering progress preview",
      ["Collect", "Format", "Write"] as const,
      async () => {
        await sleep(260);
      },
    );

    cli.diff(
      "theme: \"default\"\nruntime: \"npm\"",
      `theme: \"${themeName}\"\nruntime: \"${cli.storage.runtime}\"`,
    );

    cli.link("GitHub repository", "https://github.com/aidankmcalister/oscli");
    cli.outro(`Finished ${themeName}.`);
  });

  if (index < themes.length - 1) {
    cli.divider(`Next theme: ${themes[index + 1]}`);
    await sleep(350);
  }
}
