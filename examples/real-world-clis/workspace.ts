import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  title: "Set up a workspace package.",
  theme: {
    sidebarIcons: "inside",
    active: "green",
    cursor: "green",
    info: "cyan",
  },
  json: true,
  flags: {
    name: b.flag().string().label("Package name").default("packages/ui"),
    template: b
      .flag()
      .string()
      .choices(["library", "cli", "worker"] as const)
      .label("Template")
      .default("library"),
    manager: b
      .flag()
      .string()
      .choices(["bun", "pnpm", "npm"] as const)
      .label("Package manager")
      .default("bun"),
    visibility: b
      .flag()
      .string()
      .choices(["private", "public"] as const)
      .label("Visibility")
      .default("private"),
    summary: b
      .flag()
      .string()
      .label("Summary")
      .default("Shared internal package"),
    install: b.flag().boolean().label("Install dependencies").default(true),
    git: b.flag().boolean().label("Initialize git").default(true),
    "dry-run": b.flag().boolean().label("Preview without writing").default(false),
  },
}));

await cli.run(async () => {
  cli.intro("workspace");

  cli.box({
    title: "Package plan",
    content: cli.table(
      ["Field", "Value"],
      [
        ["name", cli.flags.name],
        ["template", cli.flags.template],
        ["manager", cli.flags.manager],
        ["visibility", cli.flags.visibility],
        ["summary", cli.flags.summary],
        ["install", cli.flags.install ? "yes" : "no"],
        ["git", cli.flags.git ? "yes" : "no"],
        ["dry run", cli.flags["dry-run"] ? "yes" : "no"],
      ],
    ),
  });

  if (cli.flags["dry-run"]) {
    cli.log("info", "Dry run enabled. No files will be written.").flush();
    cli.setResult({
      name: cli.flags.name,
      template: cli.flags.template,
      manager: cli.flags.manager,
      visibility: cli.flags.visibility,
      summary: cli.flags.summary,
      install: cli.flags.install,
      git: cli.flags.git,
      dryRun: true,
    });
    cli.outro("Preview complete.");
    return;
  }

  await cli.spin("Writing package files", async () => {
    await sleep(450);
  });

  if (cli.flags.install) {
    await cli.spin("Installing dependencies", async () => {
      await sleep(650);
    });
  }

  const entryFile =
    cli.flags.template === "cli"
      ? "cli.ts"
      : cli.flags.template === "worker"
        ? "worker.ts"
        : "index.ts";

  cli.box({
    title: "Generated files",
    content: cli.tree({
      [cli.flags.name]: {
        src: {
          [entryFile]: null,
        },
        "package.json": null,
        "tsconfig.json": null,
        "README.md": null,
        ...(cli.flags.git ? { ".gitignore": null } : {}),
      },
    }),
  });

  cli.setResult({
    name: cli.flags.name,
    template: cli.flags.template,
    manager: cli.flags.manager,
    visibility: cli.flags.visibility,
    summary: cli.flags.summary,
    install: cli.flags.install,
    git: cli.flags.git,
    dryRun: false,
  });

  cli.success(`Created ${cli.flags.name}.`);
  cli.outro("Workspace package ready.");
});
