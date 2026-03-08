import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "Spinner primitive demo",
  prompts: {},
}));

await cli.run(async () => {
  await cli.spin("Generating files", async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  });

  cli.success("Spinner finished");
});
