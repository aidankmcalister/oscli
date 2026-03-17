import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  title: "Create an application.",
  theme: "basic",
  prompts: {
    project: b.text().label("Project").default("my-app"),
    framework: b
      .select({ choices: ["next", "remix", "astro", "vite"] as const })
      .label("Framework")
      .default("next"),
    features: b
      .multiselect({
        choices: ["tailwind", "eslint", "testing", "auth"] as const,
      })
      .label("Features")
      .default(["eslint", "testing"]),
    typescript: b.confirm().label("Use TypeScript?").default(true),
    packageManager: b
      .select({ choices: ["bun", "pnpm", "npm"] as const })
      .label("Package manager")
      .default("bun"),
    gitInit: b.confirm().label("Initialize git?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("create-app");

  await cli.prompt.project();
  await cli.prompt.framework();
  await cli.prompt.features();
  await cli.prompt.typescript();
  await cli.prompt.packageManager();
  await cli.prompt.gitInit();

  const extension = cli.storage.typescript ? "ts" : "js";
  const project = cli.storage.project ?? "my-app";
  const framework = cli.storage.framework ?? "next";
  const features = cli.storage.features ?? [];

  await cli.spin("Scaffolding project", async () => {
    await sleep(600);
  });

  await cli.spin("Installing dependencies", async () => {
    await sleep(800);
  });

  cli.box({
    title: "Generated files",
    content: cli.tree({
      [project]: {
        src: {
          [`main.${extension}`]: null,
          [`app.${extension}`]: null,
          ...(features.includes("auth")
            ? {
                lib: {
                  [`auth.${extension}`]: null,
                },
              }
            : {}),
        },
        public: {
          "favicon.ico": null,
        },
        [framework === "vite"
          ? `vite.config.${extension}`
          : `${framework}.config.${extension}`]: null,
        [cli.storage.typescript ? "tsconfig.json" : "jsconfig.json"]: null,
        ...(features.includes("tailwind")
          ? { "tailwind.config.ts": null, "postcss.config.js": null }
          : {}),
        ...(features.includes("eslint") ? { "eslint.config.js": null } : {}),
        ...(features.includes("testing") ? { "vitest.config.ts": null } : {}),
        "package.json": null,
        ".gitignore": null,
        "README.md": null,
      },
    }),
  });

  cli.success(
    `Created ${project} with ${framework} and ${cli.storage.packageManager}.`,
  );
  cli.outro(`Project ready in ./${project}`);
});
