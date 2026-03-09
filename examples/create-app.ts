import { createCLI } from "../src/index.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  description: "Scaffold a new project.",
  theme: "basic",
  prompts: {
    project: b.text().label("Project").default("my-app"),
    framework: b
      .select({ choices: ["next", "remix", "astro", "vite"] as const })
      .label("Framework")
      .default("next"),
    typescript: b.confirm().label("Use TypeScript?").default(true),
    packageManager: b
      .select({ choices: ["npm", "bun", "pnpm", "yarn"] as const })
      .label("Package manager")
      .default("bun"),
    gitInit: b.confirm().label("Initialize git?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("create-app");

  await cli.prompt.project();
  await cli.prompt.framework();
  await cli.prompt.typescript();
  await cli.prompt.packageManager();
  await cli.prompt.gitInit();

  const extension = cli.storage.typescript ? "ts" : "js";
  const framework = cli.storage.framework ?? "next";
  const project = cli.storage.project ?? "my-app";
  const packageManager = cli.storage.packageManager ?? "bun";

  await cli.spin("Scaffolding project", async () => {
    await sleep(650);
  });

  await cli.spin("Installing dependencies", async () => {
    await sleep(900);
  });

  const structure = {
    [project]: {
      src: {
        [`main.${extension}`]: null,
        [`app.${extension}`]: null,
        [`routes.${extension}`]: null,
      },
      public: {
        "favicon.ico": null,
      },
      [framework === "vite" ? `vite.config.${extension}` : `${framework}.config.${extension}`]: null,
      [cli.storage.typescript ? "tsconfig.json" : "jsconfig.json"]: null,
      "package.json": null,
      ".gitignore": null,
      "README.md": null,
    },
  };

  cli.box({
    title: "Generated files",
    content: cli.tree(structure),
  });

  if (cli.storage.gitInit) {
    cli.log("info", "Initialized a fresh git repository.").flush();
  }

  cli.success(`Created ${project} with ${framework} and ${packageManager}.`);
  cli.outro(`Project ready in ./${project}`);
});
