import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "Box primitive demo",
  prompts: {},
}));

await cli.run(async () => {
  const summary = ["project: oscli", "teamSize: 3", "approved: true"].join(
    "\n",
  );

  cli.box({
    title: "Summary",
    content: summary,
  });
});
