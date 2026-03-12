import { createCLI } from "@oscli-dev/oscli";

export const createAppDemoCli = createCLI((b) => ({
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
    typescript: b.confirm().label("Use TypeScript?"),
    packageManager: b
      .select({ choices: ["npm", "bun", "pnpm", "yarn"] as const })
      .label("Package manager"),
    gitInit: b.confirm().label("Initialize git?"),
  },
}));
