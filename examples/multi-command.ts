import { createCLI } from "../src/index.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const installedPackages = [
  ["@oscli-dev/oscli", "0.1.1", "prod"],
  ["typescript", "5.9.3", "dev"],
  ["vitest", "4.0.18", "dev"],
] as const;

const cli = createCLI((b) => ({
  description: "Manage a project with multiple commands.",
  theme: "basic",
  prompts: {
    project: b.text().label("Project").default("workspace-app"),
    framework: b
      .select({ choices: ["next", "astro", "vite"] as const })
      .label("Framework")
      .default("next"),
    packageName: b.text().label("Package name").default("zod"),
    devDependency: b.confirm().label("Install as a dev dependency?").default(true),
  },
}));

cli.command("init", async () => {
  cli.intro("init");

  await cli.prompt.project();
  await cli.prompt.framework();

  await cli.spin("Scaffolding project", async () => {
    await sleep(600);
  });

  cli.box({
    title: "Generated files",
    content: cli.tree({
      [cli.storage.project ?? "workspace-app"]: {
        src: {
          "main.ts": null,
          "routes.ts": null,
        },
        "package.json": null,
        [cli.storage.framework === "next" ? "next.config.ts" : `${cli.storage.framework}.config.ts`]: null,
      },
    }),
  });

  cli.success(`Initialized ${cli.storage.project} with ${cli.storage.framework}.`);
  cli.outro("Project scaffolded.");
});

cli.command("add", async () => {
  cli.intro("add");

  await cli.prompt.packageName();
  await cli.prompt.devDependency();

  await cli.spin("Installing dependency", async () => {
    await sleep(500);
  });

  cli.log(
    "info",
    `Added ${cli.storage.packageName} as a ${cli.storage.devDependency ? "dev" : "runtime"} dependency.`,
  ).flush();
  cli.success(`Installed ${cli.storage.packageName}.`);
  cli.outro("Dependency added.");
});

cli.command("remove", async () => {
  cli.intro("remove");

  await cli.prompt.packageName();

  await cli.spin("Removing dependency", async () => {
    await sleep(420);
  });

  cli.success(`Removed ${cli.storage.packageName}.`);
  cli.outro("Dependency removed.");
});

cli.command("list", async () => {
  cli.intro("list");

  cli.box({
    title: "Installed packages",
    content: cli.table(
      ["Package", "Version", "Type"],
      installedPackages.map((pkg) => [...pkg]),
    ),
  });

  cli.success(`Listed ${installedPackages.length} packages.`);
  cli.outro("Package list complete.");
});

await cli.run();
