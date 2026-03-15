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

// ─── NEON-WORKSPACE ───────────────────────────────────────────────────────────
// pnpm monorepo wizard — no sidebar, neon cyan, ❯ cursor
const neonWorkspaceCli = createCLI((b) => ({
  title: "neon-workspace",
  theme: {
    sidebar: false,
    active: "cyan",
    cursor: "cyan",
    border: "cyan",
    symbols: {
      cursor: "❯",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    name: b.text().label("Workspace name").default("my-monorepo"),
    pkgs: b
      .multiselect({
        choices: ["ui", "utils", "api", "docs"] as const,
      })
      .label("Packages")
      .min(1),
    manager: b
      .select({ choices: ["pnpm", "bun", "npm"] as const })
      .label("Package manager"),
    git: b.confirm("simple").label("Init git?").default(true),
  },
}));

neonWorkspaceCli.main(async () => {
  await neonWorkspaceCli.prompt.name();
  await neonWorkspaceCli.prompt.pkgs();
  await neonWorkspaceCli.prompt.manager();
  await neonWorkspaceCli.prompt.git();

  const name = neonWorkspaceCli.storage.name ?? "my-monorepo";
  const pkgs = (neonWorkspaceCli.storage.pkgs as string[]) ?? ["ui", "utils"];

  await neonWorkspaceCli.progress(
    "Bootstrapping",
    ["root", ...pkgs] as const,
    async () => {
      await sleep(220);
    },
  );

  neonWorkspaceCli.box({
    title: `${name}/`,
    content: neonWorkspaceCli.tree({
      [name]: {
        packages: pkgs.reduce(
          (acc, pkg) => ({ ...acc, [pkg]: { "package.json": null, "src": { "index.ts": null } } }),
          {} as Record<string, unknown>,
        ),
        "package.json": null,
        "pnpm-workspace.yaml": null,
        "tsconfig.json": null,
      },
    }),
  });

  neonWorkspaceCli.success(`Workspace ${name} ready — ${pkgs.length} packages`);
  neonWorkspaceCli.outro(`Run: cd ${name} && pnpm install`);
});

// ─── DB-PUSH ──────────────────────────────────────────────────────────────────
// Push schema changes to the database — no prompts, no sidebar, magenta/violet
const dbPushCli = createCLI(() => ({
  title: "db-push",
  theme: {
    sidebar: false,
    active: "magenta",
    cursor: "magenta",
    border: "magenta",
    symbols: {
      cursor: "›",
    },
  },
}));

dbPushCli.main(async () => {
  await dbPushCli.spin("Connecting to database", async () => {
    await sleep(300);
  });

  await dbPushCli.spin("Reading schema.prisma", async () => {
    await sleep(240);
  });

  await dbPushCli.spin("Diffing against live schema", async () => {
    await sleep(360);
  });

  dbPushCli.box({
    title: "Pending changes",
    content: lines(
      "  + CREATE TABLE users (",
      "      id          UUID PRIMARY KEY,",
      "      email       TEXT NOT NULL UNIQUE,",
      "      created_at  TIMESTAMPTZ DEFAULT now()",
      "  )",
      "  + CREATE INDEX idx_users_email ON users(email)",
      "  ~ ALTER TABLE posts ADD COLUMN author_id UUID",
      "        REFERENCES users(id) ON DELETE SET NULL",
    ),
  });

  await dbPushCli.progress(
    "Applying",
    ["users", "idx_users_email", "posts.author_id"] as const,
    async () => {
      await sleep(260);
    },
  );

  dbPushCli.box({
    title: "Applied",
    content: dbPushCli.table(
      ["Change", "Type", "Duration"],
      [
        ["users", "CREATE TABLE", "12ms"],
        ["idx_users_email", "CREATE INDEX", "8ms"],
        ["posts.author_id", "ALTER TABLE", "6ms"],
      ],
    ),
  });

  dbPushCli.success("Schema pushed. 3 changes applied.");
  dbPushCli.outro("Run db-push --env production to deploy to prod.");
});

// ─── CARGO-LITE ───────────────────────────────────────────────────────────────
// Rust project bootstrap — default square rails, heavy boxes, diff preview
const cargoLiteCli = createCLI((b) => ({
  title: "cargo-lite",
  theme: {
    sidebar: "line",
    active: "red",
    border: "red",
    symbols: {
      cursor: "▶",
      radio_on: "●",
      radio_off: "○",
      check_on: "■",
      check_off: "□",
    },
  },
  prompts: {
    name: b.text().label("Project name").default("myapp"),
    bin: b
      .select({ choices: ["binary", "library"] as const })
      .label("Project type"),
    edition: b
      .select({ choices: ["2021", "2018", "2015"] as const })
      .label("Edition"),
    deps: b
      .multiselect({
        choices: ["tokio", "serde", "clap", "reqwest", "axum"] as const,
      })
      .label("Dependencies"),
  },
}));

cargoLiteCli.main(async () => {
  await cargoLiteCli.prompt.name();
  await cargoLiteCli.prompt.bin();
  await cargoLiteCli.prompt.edition();
  await cargoLiteCli.prompt.deps();

  const name = cargoLiteCli.storage.name ?? "myapp";
  const bin = cargoLiteCli.storage.bin ?? "binary";
  const edition = cargoLiteCli.storage.edition ?? "2021";
  const deps = (cargoLiteCli.storage.deps as string[]) ?? ["tokio", "serde"];

  cargoLiteCli.box({
    title: "Cargo.toml preview",
    content: lines(
      `  [package]`,
      `  name    = "${name}"`,
      `  version = "0.1.0"`,
      `  edition = "${edition}"`,
      `  `,
      `  [dependencies]`,
      ...deps.map((d) => `  ${d} = "1"`),
    ),
  });

  await cargoLiteCli.spin("Writing project files", async () => {
    await sleep(380);
  });

  await cargoLiteCli.progress(
    "Setting up",
    ["Cargo.toml", `src/${bin === "binary" ? "main" : "lib"}.rs`, ".gitignore", "README.md"] as const,
    async () => {
      await sleep(160);
    },
  );

  cargoLiteCli.success(`${name} (${bin}) created`);
  cargoLiteCli.outro(`Run: cd ${name} && cargo build`);
});

// ─── DEPLOY-DANCE ─────────────────────────────────────────────────────────────
// Deploy tracker with pipeline progress — intro/outro, JSON mode
const deployDanceCli = createCLI((b) => ({
  title: "deploy-dance",
  theme: {
    sidebar: "rounded",
    active: "green",
    border: "green",
    symbols: {
      cursor: "▸",
      radio_on: "◉",
      radio_off: "○",
      check_on: "◉",
      check_off: "○",
    },
  },
  prompts: {
    env: b
      .select({ choices: ["staging", "production"] as const })
      .label("Target"),
    regions: b
      .multiselect({
        choices: ["us-east", "eu-west", "ap-south"] as const,
      })
      .label("Regions")
      .min(1),
    strategy: b
      .select({ choices: ["rolling", "blue-green", "canary"] as const })
      .label("Strategy"),
    dry: b.confirm("simple").label("Dry run?").default(false),
  },
}));

deployDanceCli.main(async () => {
  await deployDanceCli.prompt.env();
  await deployDanceCli.prompt.regions();
  await deployDanceCli.prompt.strategy();
  await deployDanceCli.prompt.dry();

  const env = deployDanceCli.storage.env ?? "staging";
  const regions = (deployDanceCli.storage.regions as string[]) ?? ["us-east"];
  const strategy = deployDanceCli.storage.strategy ?? "rolling";

  deployDanceCli.log("info", `Deploying to ${env} · ${strategy} · ${regions.length} region(s)`).flush();

  await deployDanceCli.progress(
    "Pipeline",
    ["build", "test", "docker push", ...regions, "dns update"] as const,
    async () => {
      await sleep(240);
    },
  );

  deployDanceCli.box({
    title: "Deployment summary",
    content: deployDanceCli.table(
      ["Region", "Strategy", "Status", "Duration"],
      regions.map((r, i) => [r, strategy, "live", `${18 + i * 4}s`]),
    ),
  });

  deployDanceCli.success(`Deployed to ${env} across ${regions.length} region(s).`);
  deployDanceCli.outro("All health checks passed. Rollback: deploy-dance rollback");
});

// ─── AUDIT-BOARD ─────────────────────────────────────────────────────────────
// Security & cost dashboard — cyan cursor, line sidebar, tree + table composition
const auditBoardCli = createCLI((b) => ({
  title: "audit-board",
  theme: {
    sidebar: "line",
    active: "cyan",
    cursor: "cyan",
    border: "cyan",
    symbols: {
      cursor: "▸",
      radio_on: "◈",
      radio_off: "◇",
      check_on: "◈",
      check_off: "◇",
    },
  },
  prompts: {
    team: b.text().label("Team slug").default("platform"),
    maxCost: b.number().label("Budget ($/month)").min(0).default(500),
    scope: b
      .multiselect({
        choices: ["security", "cost", "uptime", "compliance"] as const,
      })
      .label("Audit scope")
      .min(1),
  },
}));

auditBoardCli.main(async () => {
  await auditBoardCli.prompt.team();
  await auditBoardCli.prompt.maxCost();
  await auditBoardCli.prompt.scope();

  const team = auditBoardCli.storage.team ?? "platform";

  await auditBoardCli.spin("Fetching service inventory", async () => {
    await sleep(340);
  });

  await auditBoardCli.progress(
    "Running checks",
    ["security", "cost", "uptime", "compliance"] as const,
    async () => {
      await sleep(200);
    },
  );

  const tree = auditBoardCli.tree({
    [team]: {
      "api  (ok)": null,
      "worker  (ok)": null,
      "legacy  (warn)": null,
    },
  });

  const table = auditBoardCli.table(
    ["Service", "Cost $", "CVEs", "Uptime"],
    [
      ["api", "234", "0", "99.98%"],
      ["worker", "99", "0", "99.99%"],
      ["legacy", "180", "2", "99.71%"],
    ],
  );

  auditBoardCli.box({
    title: `Audit · ${team}`,
    content: lines(tree, "", table),
  });

  auditBoardCli.log("warn", "legacy: 2 unpatched CVEs — schedule remediation.").flush();
  auditBoardCli.log("info", "Total cost: $513/month · budget: $500/month.").flush();
  auditBoardCli.success("Audit complete. Report saved to ./audit-2026-03-15.json");
  auditBoardCli.outro("Full report: audit.internal.example.com");
});

export const homeDemos: HomeDemo[] = [
  {
    id: "neon-workspace",
    title: "neon-workspace",
    cli: neonWorkspaceCli,
    answers: {
      name: "my-monorepo",
      pkgs: ["ui", "utils", "api"],
      manager: "pnpm",
      git: true,
    },
    terminalTheme: {
      foreground: "#C9D1D9",
      muted: "#8B949E",
      border: "#21262D",
      cursor: "#79C0FF",
      accent: "#79C0FF",
      success: "#56D364",
      warn: "#E3B341",
      info: "#79C0FF",
      error: "#FF7B72",
    },
  },
  {
    id: "db-push",
    title: "db-push",
    cli: dbPushCli,
    terminalTheme: {
      foreground: "#E2E8F0",
      muted: "#94A3B8",
      border: "#1E1B4B",
      cursor: "#A5B4FC",
      accent: "#A5B4FC",
      success: "#86EFAC",
      warn: "#FDE68A",
      info: "#93C5FD",
      error: "#FCA5A5",
    },
  },
  {
    id: "cargo-lite",
    title: "cargo-lite",
    cli: cargoLiteCli,
    answers: {
      name: "myapp",
      bin: "binary",
      edition: "2021",
      deps: ["tokio", "serde", "clap"],
    },
    terminalTheme: {
      foreground: "#FEF3C7",
      muted: "#D97706",
      border: "#451A03",
      cursor: "#FB923C",
      accent: "#FB923C",
      success: "#86EFAC",
      warn: "#FDE68A",
      info: "#7DD3FC",
      error: "#FCA5A5",
    },
  },
  {
    id: "deploy-dance",
    title: "deploy-dance",
    cli: deployDanceCli,
    answers: {
      env: "staging",
      regions: ["us-east", "eu-west", "ap-south"],
      strategy: "rolling",
      dry: false,
    },
    terminalTheme: {
      foreground: "#D1FAE5",
      muted: "#059669",
      border: "#022C22",
      cursor: "#34D399",
      accent: "#34D399",
      success: "#6EE7B7",
      warn: "#FDE68A",
      info: "#7DD3FC",
      error: "#FCA5A5",
    },
  },
  {
    id: "audit-board",
    title: "audit-board",
    cli: auditBoardCli,
    answers: {
      team: "platform",
      maxCost: 500,
      scope: ["security", "cost", "uptime", "compliance"],
    },
    terminalTheme: {
      foreground: "#E2E8F0",
      muted: "#64748B",
      border: "#0F172A",
      cursor: "#38BDF8",
      accent: "#38BDF8",
      success: "#86EFAC",
      warn: "#FDE68A",
      info: "#7DD3FC",
      error: "#FCA5A5",
    },
  },
];
