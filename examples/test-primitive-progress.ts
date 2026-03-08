import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "Progress primitive demo",
  prompts: {},
}));

await cli.run(async () => {
  const steps = ["Scaffold", "Install", "Finalize"] as const;

  await cli.progress("Project setup", steps, async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });

  cli.success("Progress finished");
});
