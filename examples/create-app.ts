import { createCLI } from "../packages/oscli/src/index";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
      .label("Features"),
    typescript: b.confirm().label("Use TypeScript?").default(true),
    packageManager: b
      .select({ choices: ["npm", "bun", "pnpm", "yarn"] as const })
      .label("Package manager")
      .default("bun"),
    gitInit: b.confirm().label("Initialize git?").default(true),
  },
}));

export async function runCreateApp() {
  await cli.run(async () => {
    cli.intro("create-app");

    await cli.prompt.project();
    await cli.prompt.framework();
    await cli.prompt.features();
    await cli.prompt.typescript();
    await cli.prompt.packageManager();
    await cli.prompt.gitInit();

    const extension = cli.storage.typescript ? "ts" : "js";
    const framework = cli.storage.framework ?? "next";
    const project = cli.storage.project ?? "my-app";
    const packageManager = cli.storage.packageManager ?? "bun";
    const features = cli.storage.features ?? [];

    await cli.spin("Scaffolding project", async () => {
      await sleep(650);
    });

    await cli.spin("Installing dependencies", async () => {
      await sleep(900);
    });

    const src: Parameters<typeof cli.tree>[0] = {
      [`main.${extension}`]: null,
      [`app.${extension}`]: null,
      [`routes.${extension}`]: null,
    };

    if (features.includes("auth")) {
      src.lib = {
        [`auth.${extension}`]: null,
      };
    }

    const structure: Parameters<typeof cli.tree>[0] = {
      [project]: {
        src,
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
    };

    cli.box({
      title: "Generated files",
      content: cli.tree(structure),
    });

    if (features.length > 0) {
      cli.log("info", `Enabled features: ${features.join(", ")}.`).flush();
    }

    if (cli.storage.gitInit) {
      cli.log("info", "Initialized a fresh git repository.").flush();
    }

    cli.success(`Created ${project} with ${framework} and ${packageManager}.`);
    cli.outro(`Project ready in ./${project}`);
  });
}

if (import.meta.main) {
  await runCreateApp();
}
