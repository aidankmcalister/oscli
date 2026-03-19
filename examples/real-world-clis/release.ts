import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type BumpType = "patch" | "minor" | "major";

const cli = createCLI((b) => ({
  title: "Publish a new release.",
  theme: "rounded",
  prompts: {
    bumpType: b
      .select({ choices: ["patch", "minor", "major"] as const })
      .label("Bump type")
      .default("patch"),
    changelogEntry: b
      .text()
      .label("Changelog entry")
      .default("Refresh the example suite and docs."),
    confirmPublish: b.confirm().label("Publish this release?").default(true),
  },
}));

function bumpVersion(version: string, bumpType: BumpType): string {
  const [major, minor, patch] = version.split(".").map((value) => Number(value));

  if (bumpType === "major") {
    return `${major + 1}.0.0`;
  }

  if (bumpType === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

await cli.run(async () => {
  cli.intro("release");

  const packageJson = (await Bun.file(
    new URL("../../packages/oscli/package.json", import.meta.url),
  ).json()) as { version: string };

  await cli.prompt.bumpType();
  await cli.prompt.changelogEntry();
  await cli.prompt.confirmPublish();

  const currentVersion = packageJson.version;
  const nextVersion = bumpVersion(
    currentVersion,
    (cli.storage.bumpType ?? "patch") as BumpType,
  );

  cli.box({
    title: "Release plan",
    content: `Current: ${currentVersion}\nNext:    ${nextVersion}`,
  });

  cli.log("info", `Changelog: ${cli.storage.changelogEntry}`).flush();

  if (!cli.storage.confirmPublish) {
    cli.log("warn", "Release cancelled before publish.").flush();
    cli.outro("No package was published.");
    return;
  }

  await cli.spin("Running tests", async () => {
    await sleep(500);
  });

  await cli.spin("Building packages", async () => {
    await sleep(650);
  });

  await cli.spin("Publishing to npm", async () => {
    await sleep(700);
  });

  cli.success(`Published v${nextVersion}.`);
  cli.outro("Release complete.");
});
