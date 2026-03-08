import { createCLI } from "../src";

const cli = createCLI((b) => ({
  description: "Simple setup",
  prompts: {
    project: b.text().label("Project name").default("my-app"),
    teamSize: b.number().label("Team size").min(1).max(20),
    startNow: b.confirm().label("Start setup now?").default(true),
  },
}));

await cli.run(async () => {
  await cli.prompt.project();
  await cli.prompt.teamSize();
  await cli.prompt.startNow();

  console.log(cli.storage);
});
