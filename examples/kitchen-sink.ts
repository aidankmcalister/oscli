import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "oscli kitchen sink",
  prompts: {},
}));

await cli.run(async () => {
  cli.intro("oscli demo");

  const summary = cli.table(
    ["Field", "Value"],
    [
      ["framework", "oscli"],
      ["runtime", "bun"],
      ["status", "ready"],
    ],
  );

  cli.box({
    title: "Summary",
    content: summary,
  });

  await cli.spin("Running quick check", async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  await cli.progress("Pipeline", ["Validate", "Build", "Finalize"], async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
  });

  cli.outro("Done");
});
