import { createCLI } from "../packages/oscli/src/index";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  title: "Create an environment file.",
  theme: "basic",
  prompts: {
    environmentName: b.text().label("Environment name").default("local"),
    requiredVars: b
      .list()
      .label("Required vars")
      .min(1)
      .default(["API_URL", "DATABASE_URL", "SESSION_SECRET"]),
    databaseUrl: b
      .text()
      .label("Database URL")
      .default("postgres://localhost:5432/oscli"),
    secretKey: b
      .password()
      .label("Secret key")
      .default("sk_local_1234567890"),
  },
}));

await cli.run(async () => {
  cli.intro("env setup");

  await cli.prompt.environmentName();
  await cli.prompt.requiredVars();
  await cli.prompt.databaseUrl();
  await cli.prompt.secretKey();

  const envContent = [
    `NODE_ENV=${cli.storage.environmentName}`,
    ...((cli.storage.requiredVars ?? ["API_URL"]).map((variable) => `${variable}=`)),
    `DATABASE_URL=${cli.storage.databaseUrl}`,
    `SECRET_KEY=${cli.storage.secretKey}`,
  ].join("\n");

  cli.box({
    title: ".env",
    content: envContent,
  });

  await cli.spin("Writing .env file", async () => {
    await sleep(500);
  });

  cli.success(`Prepared ${cli.storage.environmentName}.env with ${(cli.storage.requiredVars ?? []).length} required vars.`);
  cli.outro("Environment file ready.");
});
