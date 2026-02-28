import { createCLI } from "./src/index.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined) return "<undefined>";
  return String(value);
}

const cli = createCLI((b) => ({
  description: "oscli kitchen sink",
  prompts: {
    project: b
      .text()
      .label("Project")
      .describe("Project codename")
      .transform((value) => value.trim())
      .validate((value) =>
        value.length >= 2 ? true : "Project must be at least 2 characters.",
      ),
    owner: b
      .text()
      .label("Owner")
      .optional()
      .transform((value) => value.trim()),
    age: b.number().label("Age").min(0).max(130),
    budget: b.number().label("Budget").min(0),
    password: b.password().label("Password"),
    mode: b.select({ choices: ["dry-run", "live"] }).label("Mode"),
    tags: b
      .multiselect({ choices: ["core", "api", "ui", "docs"] })
      .label("Tags")
      .min(1)
      .max(3),
    approved: b.confirm().label("Approved"),
    notes: b.text().label("Notes").optional(),
  },
}));

await cli.run(async () => {
  cli.intro("Kitchen sink run starting");

  await cli.prompt.project();
  await cli.prompt.owner();
  await cli.prompt.age();
  await cli.prompt.budget();
  await cli.prompt.password();
  await cli.prompt.mode();
  await cli.prompt.tags();
  await cli.prompt.approved();
  await cli.prompt.notes();

  if (cli.storage.mode === "live" && !cli.storage.approved) {
    cli.exit("Live mode requires approval.");
  }

  cli.log("info", `Project: ${cli.storage.project}`);
  cli.log("info", `Mode: ${cli.storage.mode}`);

  if (cli.storage.tags.includes("docs")) {
    cli.warn("Docs tag selected: this may generate extra files.");
  }

  await cli.spin("Simulating setup", async () => {
    await delay(80);
  });

  const steps = ["validate", "prepare", "write", "finalize"] as const;
  await cli.progress("Running steps", steps, async (_step, _index, _total) => {
    await delay(20);
  });

  cli.table(
    "Kitchen Sink Summary",
    ["Field", "Value"],
    [
      ["project", formatValue(cli.storage.project)],
      ["owner", formatValue(cli.storage.owner)],
      ["age", formatValue(cli.storage.age)],
      ["budget", formatValue(cli.storage.budget)],
      ["password", cli.storage.password ? "<provided>" : "<empty>"],
      ["mode", formatValue(cli.storage.mode)],
      ["tags", formatValue(cli.storage.tags)],
      ["approved", formatValue(cli.storage.approved)],
      ["notes", formatValue(cli.storage.notes)],
    ],
  );

  const inlineConfirm = await cli.confirm("Finalize this run?");
  cli.log("info", `Inline confirm result: ${inlineConfirm}`);

  cli.success("Kitchen sink completed.");
  cli.outro("All done.");
});
