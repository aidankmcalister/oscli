import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "CLI logging demo",
  prompts: {},
}));

await cli.run(async () => {
  cli.intro("Starting setup");
  cli.log("info", "Reading config");
  cli.log("warn", "Using defaults");
  cli.success("Setup complete");
  cli.outro("Done");
});
