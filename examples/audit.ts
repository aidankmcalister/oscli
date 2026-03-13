import { createCLI } from "../packages/oscli/src/index";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const findings = [
  ["lodash", "4.17.19", "Prototype pollution vulnerability", "critical"],
  ["debug", "4.3.3", "Outdated transitive dependency", "medium"],
  ["left-pad", "1.3.0", "Deprecated package", "low"],
] as const;

const cli = createCLI((b) => ({
  title: "Audit a project.",
  theme: "basic",
  flags: {
    path: b.flag().string().label("Project path").default("."),
    fix: b.flag().boolean().label("Apply automatic fixes").default(false),
  },
}));

await cli.run(async () => {
  cli.intro("project audit");

  await cli.spin("Scanning dependencies", async () => {
    await sleep(500);
  });

  await cli.spin("Checking licenses", async () => {
    await sleep(450);
  });

  await cli.spin("Running security audit", async () => {
    await sleep(700);
  });

  cli.box({
    title: "Audit results",
    content: cli.table(
      ["Package", "Version", "Issue", "Severity"],
      findings.map((row) => [...row]),
    ),
  });

  cli.log("warn", "left-pad is deprecated and should be removed.").flush();
  cli.log("warn", "debug is pinned below the current safe minor release.").flush();
  cli.log("error", "lodash must be upgraded before the next deploy.").flush();

  if (cli.flags.fix) {
    await cli.spin("Applying fixes", async () => {
      await sleep(600);
    });
  }

  cli.success(`Audit complete for ${cli.flags.path}.`);
  cli.outro("Review the findings above.");
});
