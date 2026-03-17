import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  title: "Deploy a service.",
  theme: "basic",
  flags: {
    env: b
      .flag()
      .string()
      .choices(["dev", "staging", "prod"] as const)
      .label("Environment")
      .default("dev"),
    region: b
      .flag()
      .string()
      .choices(["us-east-1", "eu-west-1", "ap-southeast-1"] as const)
      .label("Region")
      .default("us-east-1"),
    "dry-run": b.flag().boolean().label("Preview only").default(false),
  },
  prompts: {
    service: b.text().label("Service").default("api-gateway"),
    imageTag: b.text().label("Image tag").default("2026.03.17"),
    confirmDeploy: b.confirm().label("Deploy now?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("deploy");

  await cli.prompt.service();
  await cli.prompt.imageTag();

  cli.box({
    title: "Deploy plan",
    content: cli.table(
      ["Field", "Value"],
      [
        ["service", cli.storage.service ?? "api-gateway"],
        ["environment", cli.flags.env],
        ["region", cli.flags.region],
        ["image", cli.storage.imageTag ?? "2026.03.17"],
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
    cli.log("info", "Dry run enabled. Skipping the actual rollout.").flush();
    cli.outro("Preview complete.");
    return;
  }

  await cli.spin("Building container image", async () => {
    await sleep(600);
  });

  await cli.spin("Pushing image", async () => {
    await sleep(700);
  });

  await cli.progress(
    "Rolling deploy",
    ["Verify", "Build", "Push", "Deploy", "Health check"] as const,
    async () => {
      await sleep(280);
    },
  );

  cli.success(`Deployed ${cli.storage.service} to ${cli.flags.env}.`);
  cli.outro("Deployment finished.");
});
