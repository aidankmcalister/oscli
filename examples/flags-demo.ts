import { createCLI } from "../src/index";

const cli = createCLI((b) => ({
  description: "flags demo",
  flags: {
    env: b
      .flag()
      .string()
      .choices(["dev", "staging", "prod"] as const)
      .default("dev"),
    json: b.flag().boolean().default(false),
    ttl: b.flag().string().default("1h"),
  },
  prompts: {
    name: b.text().label("Database name").default("mydb"),
  },
}));

await cli.run(async () => {
  cli.log("info", `env: ${cli.flags.env}`);
  cli.log("info", `json: ${cli.flags.json}`);
  cli.log("info", `ttl: ${cli.flags.ttl}`);
  await cli.prompt.name();
  cli.success(`name: ${cli.storage.name}`);
});
