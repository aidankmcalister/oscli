import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "Inline confirm demo",
  prompts: {},
}));

await cli.run(async () => {
  const approved = await cli.confirm("Continue setup?", true);

  if (!approved) {
    cli.exit("Cancelled.");
  }

  cli.success("Continuing...");
});
