import { createCLI } from "../src";

const cli = createCLI(() => ({
  description: "Table primitive demo",
  prompts: {},
}));

await cli.run(async () => {
  const output = cli.table(
    ["Field", "Value"],
    [
      ["project", "oscli"],
      ["teamSize", 3],
      ["approved", true],
    ],
  );

  console.log(output);
});
