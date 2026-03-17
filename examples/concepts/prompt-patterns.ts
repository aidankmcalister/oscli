import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  title: "Prompt patterns.",
  theme: "basic",
  prompts: {
    project: b
      .text()
      .label("Project")
      .describe("The package or application name.")
      .placeholder("my-app")
      .default("my-app")
      .validate((value) =>
        value.trim().length >= 3 ? true : "Use at least 3 characters"
      ),
    framework: b
      .search({ choices: ["next", "remix", "astro", "vite"] as const })
      .label("Framework")
      .color("cyan")
      .rule("next", "full-stack React")
      .rule("astro", "content-heavy sites")
      .default("next"),
    runtime: b
      .select({ choices: ["bun", "pnpm", "npm"] as const })
      .label("Runtime")
      .rule("bun", "fast local installs")
      .rule("pnpm", "strict workspace layout")
      .default("bun"),
    teamSize: b
      .number()
      .label("Team size")
      .prefix("~")
      .min(1)
      .max(50)
      .default(4),
    features: b
      .multiselect({
        choices: ["tailwind", "eslint", "vitest", "auth"] as const,
      })
      .label("Features")
      .min(1)
      .max(3)
      .default(["eslint", "vitest"]),
    envVars: b
      .list()
      .label("Environment variables")
      .min(1)
      .max(4)
      .default(["DATABASE_URL", "API_URL"]),
    releaseDate: b
      .date()
      .label("Release date")
      .format("YYYY-MM-DD")
      .default(new Date("2026-04-15")),
    token: b
      .password()
      .label("Registry token")
      .placeholder("sk_live_...")
      .default("sk_local_123456"),
    install: b.confirm().label("Install dependencies?").default(true),
    telemetry: b
      .confirm("simple")
      .label("Enable anonymous telemetry?")
      .default(false),
  },
}));

await cli.run(async () => {
  cli.intro("prompt patterns");

  await cli.prompt.project();
  await cli.prompt.framework();
  await cli.prompt.runtime();
  await cli.prompt.teamSize();
  await cli.prompt.features();
  await cli.prompt.envVars();
  await cli.prompt.releaseDate();
  await cli.prompt.token();
  await cli.prompt.install();
  await cli.prompt.telemetry();

  if (cli.storage.install) {
    await cli.spin("Installing dependencies", async () => {
      await sleep(450);
    });
  }

  const releaseDate =
    cli.storage.releaseDate instanceof Date
      ? cli.storage.releaseDate.toISOString().slice(0, 10)
      : "n/a";

  cli.box({
    title: "Prompt summary",
    content: cli.table(
      ["Prompt", "Value"],
      [
        ["project", cli.storage.project ?? "my-app"],
        ["framework", cli.storage.framework ?? "next"],
        ["runtime", cli.storage.runtime ?? "bun"],
        ["team size", String(cli.storage.teamSize ?? 4)],
        ["features", (cli.storage.features ?? []).join(", ") || "none"],
        ["env vars", (cli.storage.envVars ?? []).join(", ")],
        ["release date", releaseDate],
        ["token", "**************"],
        ["install", cli.storage.install ? "yes" : "no"],
        ["telemetry", cli.storage.telemetry ? "yes" : "no"],
      ],
    ),
  });

  cli.success("Prompt showcase complete.");
  cli.outro("Use this file to compare prompt types and builder options.");
});
