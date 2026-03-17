import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const pullRequests = [
  ["#142", "Improve release output", "open"],
  ["#139", "Refactor prompt renderer", "open"],
  ["#134", "Fix JSON test harness", "closed"],
] as const;

const workflowRuns = [
  ["release", "success", "6m 12s"],
  ["docs", "success", "2m 48s"],
  ["test", "running", "1m 05s"],
] as const;

const cli = createCLI((b) => ({
  title: "GitHub-style CLI.",
  theme: "basic",
  json: true,
  flags: {
    owner: b.flag().string().label("Owner").default("oscli-dev"),
    repo: b.flag().string().label("Repository").default("oscli"),
    title: b
      .flag()
      .string()
      .label("Pull request title")
      .default("Improve CLI examples"),
    body: b
      .flag()
      .string()
      .label("Pull request body")
      .default("Tighten the example suite and refresh docs."),
    branch: b
      .flag()
      .string()
      .label("Head branch")
      .default("feature/example-suite"),
    base: b.flag().string().label("Base branch").default("main"),
    state: b
      .flag()
      .string()
      .choices(["open", "closed", "all"] as const)
      .label("Pull request state")
      .default("open"),
    limit: b.flag().number().label("Result limit").default(5),
    draft: b.flag().boolean().label("Create as draft").default(false),
    web: b.flag().boolean().label("Open in browser").default(false),
  },
}));

cli.command("repo-view", async () => {
  cli.intro("gh repo view");

  const slug = `${cli.flags.owner}/${cli.flags.repo}`;

  cli.box({
    title: "Repository",
    content: [
      `name:        ${slug}`,
      "visibility:  public",
      "default:     main",
      "issues:      17 open",
      "pulls:       2 open",
      "checks:      1 running",
    ].join("\n"),
  });

  if (cli.flags.web) {
    cli.link("Open repository", `https://github.com/${slug}`);
  }

  cli.setResult({
    owner: cli.flags.owner,
    repo: cli.flags.repo,
    visibility: "public",
    defaultBranch: "main",
  });

  cli.success(`Loaded ${slug}.`);
  cli.outro("Repository summary complete.");
});

cli.command("pr-list", async () => {
  cli.intro("gh pr list");

  const rows = pullRequests
    .filter((row) => cli.flags.state === "all" || row[2] === cli.flags.state)
    .slice(0, cli.flags.limit);

  cli.box({
    title: "Pull requests",
    content: cli.table(
      ["PR", "Title", "State"],
      rows.map((row) => [...row]),
    ),
  });

  cli.setResult(rows.map(([id, title, state]) => ({ id, title, state })));

  cli.success(`Listed ${rows.length} pull requests.`);
  cli.outro("Pull request query complete.");
});

cli.command("pr-create", async () => {
  cli.intro("gh pr create");

  cli.box({
    title: "Pull request plan",
    content: cli.table(
      ["Field", "Value"],
      [
        ["title", cli.flags.title],
        ["body", cli.flags.body],
        ["base", cli.flags.base],
        ["head", cli.flags.branch],
        ["draft", cli.flags.draft ? "yes" : "no"],
      ],
    ),
  });

  await cli.spin("Creating pull request", async () => {
    await sleep(550);
  });

  const pr = {
    id: "#143",
    title: cli.flags.title,
    body: cli.flags.body,
    base: cli.flags.base,
    head: cli.flags.branch,
    draft: cli.flags.draft,
  };

  cli.setResult(pr);

  if (cli.flags.web) {
    cli.link(
      "Open pull request",
      `https://github.com/${cli.flags.owner}/${cli.flags.repo}/pull/143`,
    );
  }

  cli.success(`Created ${pr.id}.`);
  cli.outro("Pull request ready for review.");
});

cli.command("run-list", async () => {
  cli.intro("gh run list");

  await cli.spin("Fetching workflow runs", async () => {
    await sleep(320);
  });

  const rows = workflowRuns.slice(0, cli.flags.limit);

  cli.box({
    title: "Workflow runs",
    content: cli.table(
      ["Workflow", "Status", "Duration"],
      rows.map((row) => [...row]),
    ),
  });

  cli.setResult(
    rows.map(([workflow, status, duration]) => ({
      workflow,
      status,
      duration,
    })),
  );

  cli.success(`Listed ${rows.length} workflow runs.`);
  cli.outro("Run query complete.");
});

await cli.run();
