import { createCLI } from "../packages/oscli/src/index.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type GenerateType = "component" | "hook" | "util" | "api-route";

const cli = createCLI((b) => ({
  description: "Generate project boilerplate.",
  theme: "basic",
  prompts: {
    generateType: b
      .select({ choices: ["component", "hook", "util", "api-route"] as const })
      .label("Generate")
      .default("component"),
    name: b.text().label("Name").default("Button"),
    outputDirectory: b.text().label("Output directory").default("src/"),
    overwrite: b.confirm().label("Overwrite if file exists?").default(false),
  },
}));

function toFilePath(type: GenerateType, name: string, outputDirectory: string): string {
  const safeDir = outputDirectory.endsWith("/") ? outputDirectory : `${outputDirectory}/`;

  if (type === "component") return `${safeDir}${name}.tsx`;
  if (type === "hook") return `${safeDir}use${name}.ts`;
  if (type === "util") return `${safeDir}${name}.ts`;
  return `${safeDir}${name}.ts`;
}

function buildFileContent(type: GenerateType, name: string): string {
  if (type === "component") {
    return [
      `export function ${name}() {`,
      "  return (",
      `    <div>${name}</div>`,
      "  );",
      "}",
    ].join("\n");
  }

  if (type === "hook") {
    return [
      `export function use${name}() {`,
      "  return { ready: true };",
      "}",
    ].join("\n");
  }

  if (type === "util") {
    return [
      `export function ${name}(value: string) {`,
      "  return value.trim();",
      "}",
    ].join("\n");
  }

  return [
    `export async function ${name}Route() {`,
    "  return Response.json({ ok: true });",
    "}",
  ].join("\n");
}

await cli.run(async () => {
  cli.intro("codegen");

  await cli.prompt.generateType();
  await cli.prompt.name();
  await cli.prompt.outputDirectory();
  await cli.prompt.overwrite();

  const generateType = (cli.storage.generateType ?? "component") as GenerateType;
  const name = cli.storage.name ?? "Button";
  const outputDirectory = cli.storage.outputDirectory ?? "src/";
  const filePath = toFilePath(generateType, name, outputDirectory);
  const generatedContent = buildFileContent(generateType, name);

  await cli.spin("Generating", async () => {
    await sleep(550);
  });

  if (!cli.storage.overwrite) {
    cli.log("info", "Overwrite is disabled. Existing files would be preserved.").flush();
  }

  cli.box({
    title: "Output",
    content: `File: ${filePath}`,
  });
  cli.diff("", generatedContent);

  cli.success(`Generated ${generateType} at ${filePath}.`);
  cli.outro("Code generation complete.");
});
