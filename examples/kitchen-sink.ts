import { createCLI } from "../src";

const cli = createCLI((b) => ({
  description: "oscli kitchen sink",
  prompts: {
    project: b
      .text()
      .label("Project")
      .placeholder("my-app")
      .default("my-app")
      .describe("Name for the new workspace"),
    mode: b
      .select({ choices: ["personal", "work"] as const })
      .label("Mode")
      .rule("personal", "solo build")
      .rule("work", "shared team project"),
    tags: b
      .multiselect({ choices: ["api", "ui", "docs", "tests"] as const })
      .label("Tags")
      .min(1)
      .max(3),
    approved: b.confirm().label("Continue?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("oscli kitchen sink");

  await cli.prompt.project();
  await cli.prompt.mode();
  await cli.prompt.tags();
  await cli.prompt.approved();

  if (!cli.storage.approved) {
    cli.exit("Run cancelled.");
  }

  cli.log("info", `Project: ${cli.storage.project}`);

  const summary = cli.table(
    ["Field", "Value"],
    [
      ["project", cli.storage.project],
      ["mode", cli.storage.mode],
      ["tags", cli.storage.tags?.join(", ") ?? ""],
    ],
  );

  cli.box({
    title: "Summary",
    content: summary,
  });

  await cli.spin(
    "Generating files",
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    },
    { doneLabel: "Generated files" },
  );

  await cli.progress(
    "Running steps",
    ["Scaffold", "Install", "Finalize"],
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    },
  );

  cli.success("Workspace ready");
  cli.outro("All done.");
});
