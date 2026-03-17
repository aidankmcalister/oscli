import { createCLI } from "../../packages/oscli/src/index";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const cli = createCLI((b) => ({
  title: "Output Patterns - every CLI output style in one file.",
  theme: "default",
  prompts: {
    projectName: b.text().label("What is your project name?").default("my-app"),
    framework: b
      .select({ choices: ["Next.js", "Remix", "Astro"] as const })
      .label("Pick a framework")
      .default("Next.js"),
    typescript: b.confirm().label("Add TypeScript?").default(true),
    plugins: b
      .multiselect({
        choices: ["prettier", "eslint", "vitest", "husky"] as const,
      })
      .label("Which plugins do you want to enable?")
      .default(["eslint", "vitest"]),
  },
}));

await cli.run(async () => {
  cli.intro("Output Patterns");

  cli.divider("1. Minimal Step List");
  cli.step("Creating project...", "active");
  cli.step("Installing dependencies...", "active");
  cli.step("Build complete", "done");
  cli.raw("Project ready at ./my-app");

  cli.divider("2. Spinner");
  await cli.spin("Installing packages", async () => {
    await sleep(600);
  });

  cli.divider("3. Boxed Summary");
  cli.box({
    title: "Build Summary",
    content: cli.table(
      ["Metric", "Value"],
      [
        ["Files", "42"],
        ["Errors", "0"],
        ["Warnings", "3"],
        ["Time", "1.24s"],
      ],
    ),
  });

  cli.divider("4. Badge / Log Style");
  cli.badge("info", "Pulling image node:20-alpine");
  cli.badge("warn", "Layer cache expired, rebuilding");
  cli.badge("info", "Installing packages (312)");
  cli.badge("ok", "Build finished in 4.2s");

  cli.divider("5. Tree / Hierarchy");
  cli.write(
    cli.tree({
      "my-app": {
        src: {
          "index.ts": null,
          "cli.ts": null,
        },
        "package.json": null,
        "tsconfig.json": null,
      },
    }),
  );

  cli.divider("6. Interactive Prompt");
  await cli.prompt.projectName();
  await cli.prompt.framework();

  cli.divider("7. Init Wizard Flow");
  await cli.prompt.typescript();
  await cli.prompt.plugins();

  await cli.spin("Creating project", async () => {
    await sleep(400);
  });
  await cli.spin("Installing packages", async () => {
    await sleep(500);
  });
  await cli.spin("Initializing git", async () => {
    await sleep(200);
  });
  cli.lines([
    "Done. Run:",
    `  cd ${cli.storage.projectName ?? "my-app"}`,
    "  npm run dev",
  ]);

  cli.divider("8. Deploy Flow");
  cli.step("Building", "active");
  cli.lines([
    "  Detected Next.js 14",
    "  Running npm run build...",
    "  Build output: 42 routes",
  ]);
  cli.step("Uploading", "active");
  cli.lines([
    "  Compressing assets... 1.2mb -> 340kb",
    "  Uploading 42 files...",
  ]);
  cli.step("Activating", "active");
  cli.raw("  Switching traffic to new deployment");
  cli.success("Live at https://my-app.vercel.app");
  cli.raw("  Deployed in 18s");

  cli.divider("9. Test Runner Output");
  cli.raw("RUN  src/");
  cli.success("auth.test.ts (4 tests) 12ms");
  cli.success("db.test.ts (7 tests) 34ms");
  cli.log("error", "api.test.ts (3 tests) 8ms").flush();
  cli.lines([
    "  POST /users should return 201",
    "    Expected: 201",
    "    Received: 400",
  ]);
  cli.divider();
  cli.lines(["Tests  14 passed  1 failed", "Files  3 total", "Time   54ms"]);

  cli.divider("10. Migration / Diff");
  cli.step("Connecting to database... ok", "done");
  cli.step("Checking schema drift...", "done");
  cli.lines([
    "  ~ users         added column: last_login",
    "  + sessions      new table",
    "  - legacy_tokens dropped table",
  ]);
  cli.success("Migration applied");

  cli.divider("11. Package Install Summary");
  cli.step("Resolving packages...", "done");
  cli.keyValue({
    "+ express": "4.18.2",
    "+ zod": "3.22.4",
    "+ @prisma/client": "5.7.0",
    "~ typescript": "4.9.0 -> 5.3.0",
  });
  cli.lines(["3 added, 1 updated, 0 removed", "Done in 1.1s"]);

  cli.divider("12. Auth / Login Flow");
  cli.step("Logging in to my-app...", "active");
  cli.raw("  Opening browser for authentication...");
  await cli.spin("Waiting for token", async () => {
    await sleep(500);
  });
  cli.success("Authenticated as aidan@hey.com");
  cli.success("Default workspace set to personal");
  cli.raw("Run `my-app whoami` to confirm.");

  cli.divider("13. Error with Code Frame");
  cli.codeFrame({
    file: "src/index.ts",
    line: 12,
    column: 5,
    message: "Type 'string' is not assignable to type 'number'",
    source: [
      "const port: number = process.env.PORT",
      "                     ^^^^^^^^^^^^^^^^",
    ],
    hint: "wrap with Number() or use parseInt()",
  });

  cli.divider("14. Watch Mode / Dev Server");
  cli.lines([
    "my-app dev server running",
    "Local:   http://localhost:3000",
    "Network: http://192.168.1.5:3000",
    "watching src/...",
    "",
    "src/index.ts changed",
    "Rebuilding...",
  ]);
  cli.success("Done in 84ms");

  cli.divider("15. Rail - icons inside");
  cli.step("Resolving dependencies", "active");
  cli.step("Fetching packages", "active");
  cli.step("Writing lockfile", "done");
  cli.step("Linking node_modules", "done");
  cli.raw("Done in 2.1s");

  cli.divider("16. Rail - icons outside left");
  cli.success("Connected to database");
  cli.success("Ran 4 migrations");
  cli.log("warn", "2 indexes missing - performance may degrade").flush();
  cli.log("error", "Seed failed: duplicate key on users").flush();

  cli.divider("17. Rail - icons outside right");
  cli.leaders("Compiling TypeScript...", "ok", 50);
  cli.leaders("Bundling assets...", "ok", 50);
  cli.leaders("Tree shaking...", "ok", 50);
  cli.leaders("Running unit tests...", "ok", 50);
  cli.leaders("Running integration tests...", "warn", 50);
});
