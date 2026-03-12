import { createCLI } from "../packages/oscli/src/index";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  description: "Deploy a service.",
  theme: "basic",
  flags: {
    env: b
      .flag()
      .string()
      .label("Target environment")
      .choices(["dev", "staging", "prod"] as const)
      .default("dev"),
    "dry-run": b.flag().boolean().label("Preview the deploy plan only").default(false),
  },
  prompts: {
    serviceName: b.text().label("Service name").default("api-gateway"),
    region: b
      .select({ choices: ["us-east-1", "eu-west-1", "ap-southeast-1"] as const })
      .label("Region")
      .default("us-east-1"),
    confirmDeploy: b.confirm().label("Deploy now?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("deploy");

  await cli.prompt.serviceName();
  await cli.prompt.region();

  cli.box({
    title: "Deploy plan",
    content: cli.table(
      ["Field", "Value"],
      [
        ["service", cli.storage.serviceName ?? "api-gateway"],
        ["environment", cli.flags.env],
        ["region", cli.storage.region ?? "us-east-1"],
        ["dry run", cli.flags["dry-run"] ? "yes" : "no"],
      ],
    ),
  });

  await cli.prompt.confirmDeploy();

  if (!cli.storage.confirmDeploy) {
    cli.log("warn", "Deployment cancelled before build started.").flush();
    cli.outro("No changes applied.");
    return;
  }

  if (cli.flags["dry-run"]) {
    cli.log("info", "Dry run enabled. Skipping image push and deployment.").flush();
    cli.outro("Dry run complete.");
    return;
  }

  await cli.spin("Building", async () => {
    await sleep(700);
  });

  await cli.spin("Pushing image", async () => {
    await sleep(800);
  });

  await cli.progress(
    "Deploy pipeline",
    ["Validate", "Build", "Push", "Deploy", "Health check"] as const,
    async () => {
      await sleep(350);
    },
  );

  cli.success(`Deployed ${cli.storage.serviceName} to ${cli.flags.env}.`);
  cli.outro("Deployment finished.");
});
