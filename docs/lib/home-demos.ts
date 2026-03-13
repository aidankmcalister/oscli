import { createCLI } from "@oscli-dev/oscli";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type HomeDemo = {
  id: string;
  title: string;
  cli: ReturnType<typeof createCLI>;
  answers?: Record<string, unknown>;
};

const createAppCli = createCLI((b) => ({
  description: "create-app",
  theme: "basic",
  prompts: {
    project: b.text().label("Project").default("my-app"),
    framework: b
      .select({ choices: ["next", "remix", "astro", "vite"] as const })
      .label("Framework")
      .default("next"),
    features: b
      .multiselect({
        choices: ["tailwind", "eslint", "testing", "auth"] as const,
      })
      .label("Features")
      .default(["tailwind", "eslint"]),
    typescript: b.confirm().label("Use TypeScript?").default(true),
    packageManager: b
      .select({ choices: ["npm", "bun", "pnpm", "yarn"] as const })
      .label("Package manager")
      .default("bun"),
    gitInit: b.confirm().label("Initialize git?").default(true),
  },
}));

createAppCli.main(async () => {
  await createAppCli.prompt.project();
  await createAppCli.prompt.framework();
  await createAppCli.prompt.features();
  await createAppCli.prompt.typescript();
  await createAppCli.prompt.packageManager();
  await createAppCli.prompt.gitInit();

  const extension = createAppCli.storage.typescript ? "ts" : "js";
  const framework = createAppCli.storage.framework ?? "next";
  const project = createAppCli.storage.project ?? "my-app";
  const packageManager = createAppCli.storage.packageManager ?? "bun";
  const features = createAppCli.storage.features ?? [];

  await createAppCli.spin("Scaffolding project", async () => {
    await sleep(320);
  });

  await createAppCli.spin("Installing dependencies", async () => {
    await sleep(360);
  });

  const src: Parameters<typeof createAppCli.tree>[0] = {
    [`main.${extension}`]: null,
    [`app.${extension}`]: null,
    [`routes.${extension}`]: null,
  };

  if (features.includes("auth")) {
    src.lib = {
      [`auth.${extension}`]: null,
    };
  }

  createAppCli.box({
    title: "Generated files",
    content: createAppCli.tree({
      [project]: {
        src,
        public: {
          "favicon.ico": null,
        },
        [framework === "vite"
          ? `vite.config.${extension}`
          : `${framework}.config.${extension}`]: null,
        [createAppCli.storage.typescript ? "tsconfig.json" : "jsconfig.json"]:
          null,
        ...(features.includes("tailwind")
          ? { "tailwind.config.ts": null, "postcss.config.js": null }
          : {}),
        ...(features.includes("eslint") ? { "eslint.config.js": null } : {}),
        ...(features.includes("testing") ? { "vitest.config.ts": null } : {}),
        "package.json": null,
        ".gitignore": null,
        "README.md": null,
      },
    }),
  });

  createAppCli.log(
    "info",
    `Created ${project} with ${framework} and ${packageManager}.`,
  ).flush();
  createAppCli.success(`Ready in ./${project}`);
  createAppCli.outro("Scaffold complete.");
});

const dbMigrateCli = createCLI((b) => ({
  description: "db-migrate",
  theme: "basic",
  prompts: {
    environment: b
      .select({ choices: ["local", "staging", "production"] as const })
      .label("Environment")
      .default("local"),
    confirmApply: b.confirm().label("Apply pending migrations?").default(false),
  },
}));

const pendingMigrations = [
  { file: "20260308_add_accounts_table.sql", summary: "Create accounts table" },
  { file: "20260308_add_sessions_index.sql", summary: "Add sessions index" },
  { file: "20260308_backfill_profiles.sql", summary: "Backfill user profiles" },
] as const;

dbMigrateCli.main(async () => {
  await dbMigrateCli.prompt.environment();

  if (dbMigrateCli.storage.environment === "production") {
    dbMigrateCli.log(
      "warn",
      "Production migrations require extra care.",
    ).flush();
  }

  await dbMigrateCli.spin("Connecting", async () => {
    await sleep(280);
  });

  dbMigrateCli.box({
    title: "Pending migrations",
    content: dbMigrateCli.table(
      ["Migration", "Summary"],
      pendingMigrations.map((migration) => [migration.file, migration.summary]),
    ),
  });

  await dbMigrateCli.prompt.confirmApply();

  if (!dbMigrateCli.storage.confirmApply) {
    dbMigrateCli.outro("Database unchanged.");
    return;
  }

  await dbMigrateCli.progress(
    "Applying migrations",
    pendingMigrations.map((migration) => migration.file),
    async () => {
      await sleep(220);
    },
  );

  dbMigrateCli.success(
    `Applied ${pendingMigrations.length} migrations to ${dbMigrateCli.storage.environment}.`,
  );
  dbMigrateCli.outro("Schema is up to date.");
});

const envSetupCli = createCLI((b) => ({
  description: "env-setup",
  theme: "basic",
  prompts: {
    environmentName: b.text().label("Environment name").default("local"),
    requiredVars: b
      .list()
      .label("Required vars")
      .min(1)
      .default(["API_URL", "DATABASE_URL", "SESSION_SECRET"]),
    databaseUrl: b
      .text()
      .label("Database URL")
      .default("postgres://localhost:5432/oscli"),
    secretKey: b.password().label("Secret key").default("sk_local_1234567890"),
  },
}));

envSetupCli.main(async () => {
  await envSetupCli.prompt.environmentName();
  await envSetupCli.prompt.requiredVars();
  await envSetupCli.prompt.databaseUrl();
  await envSetupCli.prompt.secretKey();

  const envContent = [
    `NODE_ENV=${envSetupCli.storage.environmentName}`,
    ...((envSetupCli.storage.requiredVars ?? ["API_URL"]).map(
      (variable) => `${variable}=`,
    )),
    `DATABASE_URL=${envSetupCli.storage.databaseUrl}`,
    `SECRET_KEY=${envSetupCli.storage.secretKey}`,
  ].join("\n");

  envSetupCli.box({
    title: ".env",
    content: envContent,
  });

  await envSetupCli.spin("Writing .env file", async () => {
    await sleep(260);
  });

  envSetupCli.success(
    `Prepared ${envSetupCli.storage.environmentName}.env with ${(envSetupCli.storage.requiredVars ?? []).length} required vars.`,
  );
  envSetupCli.outro("Environment file ready.");
});

type GenerateType = "component" | "hook" | "util" | "api-route";

const codegenCli = createCLI((b) => ({
  description: "codegen",
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

function toFilePath(
  type: GenerateType,
  name: string,
  outputDirectory: string,
): string {
  const safeDir = outputDirectory.endsWith("/")
    ? outputDirectory
    : `${outputDirectory}/`;

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

codegenCli.main(async () => {
  await codegenCli.prompt.generateType();
  await codegenCli.prompt.name();
  await codegenCli.prompt.outputDirectory();
  await codegenCli.prompt.overwrite();

  const generateType = (codegenCli.storage.generateType ?? "component") as GenerateType;
  const name = codegenCli.storage.name ?? "Button";
  const outputDirectory = codegenCli.storage.outputDirectory ?? "src/";
  const filePath = toFilePath(generateType, name, outputDirectory);
  const generatedContent = buildFileContent(generateType, name);

  await codegenCli.spin("Generating", async () => {
    await sleep(280);
  });

  if (!codegenCli.storage.overwrite) {
    codegenCli.log(
      "info",
      "Overwrite is disabled. Existing files would be preserved.",
    ).flush();
  }

  codegenCli.box({
    title: "Output",
    content: `File: ${filePath}`,
  });
  codegenCli.diff("", generatedContent);

  codegenCli.success(`Generated ${generateType} at ${filePath}.`);
  codegenCli.outro("Code generation complete.");
});

const auditCli = createCLI(() => ({
  description: "audit",
  theme: "basic",
}));

const auditFindings = [
  ["lodash", "4.17.19", "Prototype pollution vulnerability", "critical"],
  ["debug", "4.3.3", "Outdated transitive dependency", "medium"],
  ["left-pad", "1.3.0", "Deprecated package", "low"],
] as const;

auditCli.main(async () => {
  await auditCli.spin("Scanning dependencies", async () => {
    await sleep(280);
  });

  await auditCli.spin("Checking licenses", async () => {
    await sleep(240);
  });

  await auditCli.spin("Running security audit", async () => {
    await sleep(320);
  });

  auditCli.box({
    title: "Audit results",
    content: auditCli.table(
      ["Package", "Version", "Issue", "Severity"],
      auditFindings.map((row) => [...row]),
    ),
  });

  auditCli.log("warn", "left-pad is deprecated and should be removed.").flush();
  auditCli.log("warn", "debug is pinned below the safe minor release.").flush();
  auditCli.log("error", "lodash must be upgraded before the next deploy.").flush();
  auditCli.success("Audit complete for ./apps/web.");
  auditCli.outro("Review the findings above.");
});

export const homeDemos: HomeDemo[] = [
  {
    id: "create-app",
    title: "create-app",
    cli: createAppCli,
    answers: {
      project: "starboard",
      framework: "astro",
      features: ["tailwind", "auth"],
      typescript: false,
      packageManager: "pnpm",
      gitInit: true,
    },
  },
  {
    id: "db-migrate",
    title: "db-migrate",
    cli: dbMigrateCli,
    answers: {
      environment: "production",
      confirmApply: true,
    },
  },
  {
    id: "env-setup",
    title: "env-setup",
    cli: envSetupCli,
    answers: {
      environmentName: "staging",
      requiredVars: ["API_URL", "DATABASE_URL", "SESSION_SECRET"],
      databaseUrl: "postgres://staging.internal:5432/app",
      secretKey: "sk_live_9fe28ab11e",
    },
  },
  {
    id: "codegen",
    title: "codegen",
    cli: codegenCli,
    answers: {
      generateType: "component",
      name: "HeroBanner",
      outputDirectory: "src/components",
      overwrite: false,
    },
  },
  {
    id: "audit",
    title: "audit",
    cli: auditCli,
  },
];
