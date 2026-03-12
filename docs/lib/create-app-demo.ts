import { createCLI } from "@oscli-dev/oscli";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const cli = createCLI((b) => ({
  description: "create-app",
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
      .default(["tailwind", "eslint"]),
    typescript: b.confirm().label("Use TypeScript?").default(true),
    packageManager: b
      .select({ choices: ["npm", "bun", "pnpm", "yarn"] as const })
      .label("Package manager")
      .default("bun"),
    gitInit: b.confirm().label("Initialize git?").default(true),
  },
}));

cli.main(async () => {
  await cli.prompt.project();
  await cli.prompt.framework();

  const project = cli.storage.project ?? "my-app";
  const framework = cli.storage.framework ?? "next";

  await cli.spin("Scaffolding project", async () => {
    await sleep(400);
  });

  if (framework === "next") {
    cli.log("info", "Using the App Router.").flush();
  }

  cli.success(`Created ${project} with ${framework}.`);
  cli.outro(`Project ready in ./${project}`);
});

export async function runCreateApp() {
  await cli.run();
}
