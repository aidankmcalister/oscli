import { createCLI } from "../packages/oscli/src/index.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const teamRepos: Record<string, string[]> = {
  frontend: ["web", "design-system"],
  backend: ["api", "jobs"],
  platform: ["infra", "observability"],
  design: ["brand-site", "tokens"],
};

const cli = createCLI((b) => ({
  description: "Provision a teammate.",
  theme: "basic",
  prompts: {
    developerName: b.text().label("Developer name").default("Avery Lee"),
    team: b
      .select({ choices: ["frontend", "backend", "platform", "design"] as const })
      .label("Team")
      .default("frontend"),
    githubUsername: b.text().label("GitHub username").default("averylee"),
    confirmAccessRequest: b.confirm().label("Submit access request?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("team onboarding");

  await cli.prompt.developerName();
  await cli.prompt.team();
  await cli.prompt.githubUsername();
  await cli.prompt.confirmAccessRequest();

  if (!cli.storage.confirmAccessRequest) {
    cli.log("warn", "Access request was not submitted.").flush();
    cli.outro("Onboarding paused.");
    return;
  }

  await cli.progress(
    "Provisioning access",
    ["Create account", "Assign repos", "Send invite", "Notify manager"] as const,
    async () => {
      await sleep(360);
    },
  );

  const repos = teamRepos[cli.storage.team ?? "frontend"];
  cli.box({
    title: "Provisioned access",
    content: [
      `Developer: ${cli.storage.developerName}`,
      `GitHub:   @${cli.storage.githubUsername}`,
      `Team:     ${cli.storage.team}`,
      `Repos:    ${repos.join(", ")}`,
    ].join("\n"),
  });

  cli.success(`Provisioned access for ${cli.storage.developerName}.`);
  cli.outro("Onboarding complete.");
});
