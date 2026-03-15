import { createCLI } from "@oscli-dev/oscli";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type DemoTheme = {
  foreground?: string;
  muted?: string;
  border?: string;
  cursor?: string;
  success?: string;
  warn?: string;
  info?: string;
  error?: string;
  accent?: string;
};

type HomeDemo = {
  id: string;
  title: string;
  cli: ReturnType<typeof createCLI>;
  answers?: Record<string, unknown>;
  terminalTheme?: "auto" | "light" | "dark" | DemoTheme;
};

function lines(...value: string[]): string {
  return value.join("\n");
}

// ─── CREATE-NODE-PACKAGE ──────────────────────────────────────────────────────
// Scaffold a minimal npm package — green, line sidebar
const createPkgCli = createCLI((b) => ({
  title: "create-node-package",
  theme: {
    sidebar: "line",
    active: "green",
    border: "green",
    symbols: {
      cursor: "→",
      radio_on: "◉",
      radio_off: "○",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    name: b.text().label("Package name").default("my-lib"),
    author: b.text().label("Author").default("aidankmcalister"),
    license: b
      .select({ choices: ["MIT", "Apache-2.0", "GPL-3.0"] as const })
      .label("License"),
    typescript: b.confirm("simple").label("Use TypeScript?").default(true),
  },
}));

createPkgCli.main(async () => {
  await createPkgCli.prompt.name();
  await createPkgCli.prompt.author();
  await createPkgCli.prompt.license();
  await createPkgCli.prompt.typescript();

  const name = createPkgCli.storage.name ?? "my-lib";
  const license = createPkgCli.storage.license ?? "MIT";

  await createPkgCli.spin(`Creating ${name}/`, async () => {
    await sleep(360);
  });

  await createPkgCli.progress(
    "Writing files",
    ["package.json", "tsconfig.json", "src/index.ts", "README.md"] as const,
    async () => {
      await sleep(180);
    },
  );

  createPkgCli.box({
    title: `${name}/`,
    content: createPkgCli.tree({
      [name]: {
        src: { "index.ts": null },
        "package.json": null,
        "tsconfig.json": null,
        "README.md": null,
        ".gitignore": null,
      },
    }),
  });

  createPkgCli.success(`${name} scaffolded under ./${name}`);
  createPkgCli.outro(
    lines(`License: ${license}`, `Run: cd ${name} && bun install`),
  );
});

// ─── ENV-VAULT ────────────────────────────────────────────────────────────────
// Encrypt / decrypt .env files — amber, no sidebar
const envVaultCli = createCLI((b) => ({
  title: "env-vault",
  theme: {
    sidebar: false,
    active: "yellow",
    cursor: "yellow",
    border: "yellow",
    symbols: {
      cursor: "▸",
      check_on: "■",
      check_off: "□",
    },
  },
  prompts: {
    action: b
      .select({ choices: ["encrypt", "decrypt"] as const })
      .label("Action"),
    file: b.text().label("File").default(".env"),
    passphrase: b.password().label("Passphrase").default("correct-horse-staple"),
    backup: b.confirm("simple").label("Keep plaintext backup?").default(false),
  },
}));

envVaultCli.main(async () => {
  await envVaultCli.prompt.action();
  await envVaultCli.prompt.file();
  await envVaultCli.prompt.passphrase();
  await envVaultCli.prompt.backup();

  const action = envVaultCli.storage.action ?? "encrypt";
  const file = envVaultCli.storage.file ?? ".env";

  await envVaultCli.spin(
    action === "encrypt" ? "Deriving key (PBKDF2)" : "Deriving key",
    async () => {
      await sleep(400);
    },
  );

  await envVaultCli.spin(
    action === "encrypt" ? "Encrypting (AES-256-GCM)" : "Decrypting",
    async () => {
      await sleep(300);
    },
  );

  const outFile = action === "encrypt" ? `${file}.vault` : file;

  envVaultCli.box({
    title: action === "encrypt" ? "Vault written" : "File restored",
    content: lines(
      `  Source      ${file}`,
      `  Output      ${outFile}`,
      `  Algorithm   AES-256-GCM`,
      `  Key derive  PBKDF2 · 310,000 iter`,
      `  HMAC        SHA-256 · verified`,
    ),
  });

  if (action === "encrypt") {
    envVaultCli
      .log(
        "warn",
        "Passphrase is not stored. Loss means permanent data loss.",
      )
      .flush();
  }

  envVaultCli.success(
    action === "encrypt"
      ? `Encrypted → ${outFile}`
      : `Restored → ${outFile}`,
  );
  envVaultCli.outro("env-vault · zero dependencies · AES-256-GCM");
});

// ─── NPM-AUDIT-MATRIX ─────────────────────────────────────────────────────────
// CI-friendly security report — red, rounded sidebar
const auditCli = createCLI((b) => ({
  title: "npm-audit-matrix",
  theme: {
    sidebar: "rounded",
    active: "red",
    border: "red",
    symbols: {
      cursor: "◆",
      radio_on: "◈",
      radio_off: "◇",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    level: b
      .select({
        choices: ["low", "moderate", "high", "critical"] as const,
      })
      .label("Min severity"),
    production: b.confirm("simple").label("Production deps only?").default(true),
    format: b
      .select({ choices: ["table", "tree", "json"] as const })
      .label("Output format"),
  },
}));

auditCli.main(async () => {
  await auditCli.prompt.level();
  await auditCli.prompt.production();
  await auditCli.prompt.format();

  const level = auditCli.storage.level ?? "high";

  await auditCli.spin("Running npm audit", async () => {
    await sleep(420);
  });

  await auditCli.progress(
    "Resolving advisories",
    ["lodash", "axios", "express", "semver", "minimatch"] as const,
    async () => {
      await sleep(160);
    },
  );

  auditCli.box({
    title: `Vulnerabilities · min: ${level}`,
    content: auditCli.table(
      ["Package", "Severity", "CVE", "Fix"],
      [
        ["semver", "high", "CVE-2022-25883", "7.5.2"],
        ["minimatch", "high", "CVE-2022-3517", "3.0.5"],
        ["axios", "moderate", "CVE-2023-45857", "1.6.0"],
      ],
    ),
  });

  auditCli.log("error", "2 high-severity advisories require immediate action.").flush();
  auditCli.log("warn", "1 moderate advisory — patch before next release.").flush();
  auditCli.success("Audit complete. Run npm audit fix to apply patches.");
  auditCli.outro("Exit code 1 in CI when high or critical are found.");
});

// ─── REPO-GUARD ───────────────────────────────────────────────────────────────
// Enforce branch rules before push — slate/cool, line sidebar
const repoGuardCli = createCLI((b) => ({
  title: "repo-guard",
  theme: {
    sidebar: "line",
    active: "cyan",
    border: "cyan",
    symbols: {
      cursor: "›",
      radio_on: "●",
      radio_off: "○",
      check_on: "☑",
      check_off: "☐",
    },
  },
  prompts: {
    base: b.text().label("Base branch").default("main"),
    rules: b
      .multiselect({
        choices: [
          "no-main-push",
          "require-pr",
          "linear-history",
          "clean-worktree",
        ] as const,
      })
      .label("Enforce rules")
      .min(1),
    fix: b.confirm("simple").label("Auto-fix when possible?").default(true),
  },
}));

repoGuardCli.main(async () => {
  await repoGuardCli.prompt.base();
  await repoGuardCli.prompt.rules();
  await repoGuardCli.prompt.fix();

  const base = repoGuardCli.storage.base ?? "main";

  await repoGuardCli.spin("Reading git state", async () => {
    await sleep(280);
  });

  await repoGuardCli.progress(
    "Checking rules",
    [
      "no-main-push",
      "require-pr",
      "linear-history",
      "clean-worktree",
    ] as const,
    async () => {
      await sleep(220);
    },
  );

  repoGuardCli.box({
    title: `Rule results · base: ${base}`,
    content: repoGuardCli.table(
      ["Rule", "Result", "Detail"],
      [
        ["no-main-push", "pass", "current: feat/auth"],
        ["require-pr", "pass", "PR #84 open"],
        ["linear-history", "pass", "1 commit ahead"],
        ["clean-worktree", "pass", "no unstaged files"],
      ],
    ),
  });

  repoGuardCli.log("info", "All 4 rules passed. Safe to push.").flush();
  repoGuardCli.success("Guard checks complete.");
  repoGuardCli.outro("Add to .git/hooks/pre-push to run automatically.");
});

// ─── BUNDLE-SIZE ──────────────────────────────────────────────────────────────
// Track build output size drift — violet, rounded sidebar
const bundleSizeCli = createCLI((b) => ({
  title: "bundle-size",
  theme: {
    sidebar: "rounded",
    active: "magenta",
    border: "magenta",
    symbols: {
      cursor: "▶",
      radio_on: "◉",
      radio_off: "○",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    buildCmd: b.text().label("Build command").default("bun run build"),
    artifact: b.text().label("Stats file").default("dist/stats.json"),
    threshold: b.number().label("Max KB growth").min(0).default(5),
    notify: b
      .select({ choices: ["log", "warn", "error", "exit"] as const })
      .label("On exceed"),
  },
}));

bundleSizeCli.main(async () => {
  await bundleSizeCli.prompt.buildCmd();
  await bundleSizeCli.prompt.artifact();
  await bundleSizeCli.prompt.threshold();
  await bundleSizeCli.prompt.notify();

  const threshold = bundleSizeCli.storage.threshold ?? 5;

  await bundleSizeCli.spin("Running build", async () => {
    await sleep(460);
  });

  await bundleSizeCli.spin("Reading bundle stats", async () => {
    await sleep(240);
  });

  bundleSizeCli.box({
    title: "Bundle comparison",
    content: bundleSizeCli.tree({
      "dist/": {
        "index.js   284 KB → 291 KB  (+7 KB)": null,
        "vendor.js  512 KB → 512 KB  (no change)": null,
        "styles.css  48 KB →  47 KB  (−1 KB)": null,
      },
      "Total: 844 KB → 850 KB  (+6 KB)": null,
    }),
  });

  bundleSizeCli.log(
    "warn",
    `index.js grew 7 KB — threshold is ${threshold} KB.`,
  ).flush();
  bundleSizeCli.log("info", "vendor.js unchanged. styles.css compressed.").flush();
  bundleSizeCli.success("Baseline updated to 850 KB.");
  bundleSizeCli.outro("Commit .bundle-baseline.json to track drift in CI.");
});

export const homeDemos: HomeDemo[] = [
  {
    id: "create-node-package",
    title: "create-node-package",
    cli: createPkgCli,
    answers: {
      name: "my-lib",
      author: "aidankmcalister",
      license: "MIT",
      typescript: true,
    },
    terminalTheme: {
      foreground: "#e8f5e9",
      muted: "#4a7a54",
      border: "#142b1a",
      cursor: "#e8f5e9",
      accent: "#66bb6a",
      success: "#a5d6a7",
      warn: "#fff176",
      info: "#80deea",
      error: "#ef9a9a",
    },
  },
  {
    id: "env-vault",
    title: "env-vault",
    cli: envVaultCli,
    answers: {
      action: "encrypt",
      file: ".env",
      passphrase: "correct-horse-staple",
      backup: false,
    },
    terminalTheme: {
      foreground: "#fff8e1",
      muted: "#9e8a50",
      border: "#3d3010",
      cursor: "#fff8e1",
      accent: "#ffd54f",
      success: "#c5e1a5",
      warn: "#ffd54f",
      info: "#80deea",
      error: "#ff8a80",
    },
  },
  {
    id: "npm-audit-matrix",
    title: "npm-audit-matrix",
    cli: auditCli,
    answers: {
      level: "high",
      production: true,
      format: "table",
    },
    terminalTheme: {
      foreground: "#fce4ec",
      muted: "#9e5060",
      border: "#3d1018",
      cursor: "#fce4ec",
      accent: "#ef5350",
      success: "#a5d6a7",
      warn: "#ffe082",
      info: "#81d4fa",
      error: "#ff5252",
    },
  },
  {
    id: "repo-guard",
    title: "repo-guard",
    cli: repoGuardCli,
    answers: {
      base: "main",
      rules: ["no-main-push", "require-pr", "linear-history", "clean-worktree"],
      fix: true,
    },
    terminalTheme: {
      foreground: "#e0f7fa",
      muted: "#4a7a87",
      border: "#0d2b33",
      cursor: "#e0f7fa",
      accent: "#4dd0e1",
      success: "#80cbc4",
      warn: "#ffcc80",
      info: "#81d4fa",
      error: "#ef9a9a",
    },
  },
  {
    id: "bundle-size",
    title: "bundle-size",
    cli: bundleSizeCli,
    answers: {
      buildCmd: "bun run build",
      artifact: "dist/stats.json",
      threshold: 5,
      notify: "warn",
    },
    terminalTheme: {
      foreground: "#f3e8ff",
      muted: "#8a6da8",
      border: "#2d1a45",
      cursor: "#f3e8ff",
      accent: "#ce93d8",
      success: "#a5d6a7",
      warn: "#ffe082",
      info: "#90caf9",
      error: "#ef9a9a",
    },
  },
];
