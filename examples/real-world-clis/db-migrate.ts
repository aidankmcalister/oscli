import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const pendingMigrations = [
  ["20260317_create_accounts.sql", "Create accounts table"],
  ["20260317_add_session_index.sql", "Add sessions index"],
  ["20260317_backfill_profiles.sql", "Backfill profile records"],
] as const;

const cli = createCLI((b) => ({
  title: "Apply database migrations.",
  theme: "minimal",
  flags: {
    env: b
      .flag()
      .string()
      .choices(["local", "staging", "production"] as const)
      .label("Environment")
      .default("local"),
    "dry-run": b.flag().boolean().label("Preview changes only").default(false),
  },
  prompts: {
    connection: b
      .text()
      .label("Connection string")
      .default("postgres://localhost:5432/oscli"),
    backup: b.confirm().label("Create a backup first?").default(true),
    confirmApply: b.confirm().label("Apply pending migrations?").default(false),
  },
}));

await cli.run(async () => {
  cli.intro("db-migrate");

  await cli.prompt.connection();
  await cli.prompt.backup();

  if (cli.flags.env === "production") {
    cli
      .log("warn", "Production migrations require a maintenance window review.")
      .flush();
  }

  cli.box({
    title: "Migration plan",
    content: cli.table(
      ["Migration", "Summary"],
      pendingMigrations.map((migration) => [...migration]),
    ),
  });

  if (cli.flags["dry-run"]) {
    cli.log("info", "Dry run enabled. No migrations will be applied.").flush();
    cli.outro("Preview complete.");
    return;
  }

  await cli.prompt.confirmApply();

  if (!cli.storage.confirmApply) {
    cli.log("warn", "Migration run aborted before changes were made.").flush();
    cli.outro("Database unchanged.");
    return;
  }

  if (cli.storage.backup) {
    await cli.spin("Creating backup", async () => {
      await sleep(420);
    });
  }

  await cli.progress(
    "Applying migrations",
    pendingMigrations.map(([name]) => name),
    async () => {
      await sleep(1000);
    },
  );

  cli.success(
    `Applied ${pendingMigrations.length} migrations to ${cli.flags.env}.`,
  );
  cli.outro("Schema is up to date.");
});
