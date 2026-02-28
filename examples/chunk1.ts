import { createCLI } from "../src/index.js";

const cli = createCLI((b) => ({
  description: "Collect a few things",

  prompts: {
    name: b.text().label("Name").placeholder("Ada"),
    age: b.number().label("Age").min(0).max(120),
    weight: b.number().label("Weight (kg)").default(70),
    service: b.select({ choices: ["standard", "express"] }).default("standard"),
    tags: b.multi({ choices: ["js", "ts", "rust"] }).label("Tags"),
    ok: b.confirm().label("All good?").default(true),
    notes: b.text().label("Notes").optional(),
  },
}));

await cli.run(async () => {
  cli.intro("Starting profile flow");

  await cli.prompt.name();
  await cli.prompt.age();

  if (cli.storage.age < 13) {
    cli.exit("You need a parent to continue.");
  }

  await cli.prompt.weight();
  await cli.prompt.service();

  switch (cli.storage.service) {
    case "express":
      cli.log("info", "Express adds 5.");
      break;
    default:
      cli.log("info", "Standard shipping is free.");
      break;
  }

  let tags: string[] = [];
  do {
    await cli.prompt.tags();
    tags = cli.storage.tags;
    if (tags.length === 0) {
      cli.warn("Pick at least one tag.");
    }
  } while (tags.length === 0);

  await cli.prompt.ok();
  cli.log("info", cli.storage.ok ? "User confirmed" : "User declined");

  await cli.prompt.notes();

  const extra = cli.storage.notes ? `Notes: ${cli.storage.notes}` : "No notes";
  cli.success(`Saved profile for ${cli.storage.name} (${cli.storage.age} y/o) - ${extra}`);
  cli.outro("Done");
});
