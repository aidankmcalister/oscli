import { createCLI } from "../packages/oscli/src/index.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const pendingMigrations = [
  { file: "20260308_add_accounts_table.sql", summary: "Create accounts table" },
  { file: "20260308_add_sessions_index.sql", summary: "Add sessions index" },
  { file: "20260308_backfill_profiles.sql", summary: "Backfill user profiles" },
] as const;

const cli = createCLI((b) => ({
  description: "Apply database migrations.",
  theme: "basic",
  flags: {
    connection: b
      .flag()
      .string()
      .label("Database connection string")
      .default("postgres://localhost:5432/oscli"),
    "dry-run": b.flag().boolean().label("Preview without applying migrations").default(false),
  },
  prompts: {
    environment: b
      .select({ choices: ["local", "staging", "production"] as const })
      .label("Environment")
      .default("local"),
    confirmApply: b.confirm().label("Apply pending migrations?").default(false),
  },
}));

await cli.run(async () => {
  cli.intro("db-migrate");

  await cli.prompt.environment();

  if (cli.storage.environment === "production") {
    cli.log("warn", "Production migrations require extra care. Review the plan closely.").flush();
  }

  await cli.spin("Connecting", async () => {
    await sleep(550);
  });

  cli.box({
    title: "Pending migrations",
    content: cli.table(
      ["Migration", "Summary"],
      pendingMigrations.map((migration) => [migration.file, migration.summary]),
    ),
  });

  if (cli.flags["dry-run"]) {
    cli.log("info", "Dry run enabled. No migrations were applied.").flush();
    cli.outro("Migration preview complete.");
    return;
  }

  await cli.prompt.confirmApply();

  if (!cli.storage.confirmApply) {
    cli.log("warn", "Migration run aborted by user.").flush();
    cli.outro("Database unchanged.");
    return;
  }

  await cli.progress(
    "Applying migrations",
    pendingMigrations.map((migration) => migration.file),
    async () => {
      await sleep(320);
    },
  );

  cli.success(
    `Applied ${pendingMigrations.length} migrations to ${cli.storage.environment}.`,
  );
  cli.outro("Schema is up to date.");
});
