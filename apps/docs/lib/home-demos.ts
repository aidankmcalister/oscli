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

function mask(value: string): string {
  return "*".repeat(Math.min(String(value).length, 18));
}

// ─── FORGE ────────────────────────────────────────────────────────────────────
// Project scaffolding — emerald green, rounded sidebar
const forgeCli = createCLI((b) => ({
  title: "forge",
  theme: {
    sidebar: "rounded",
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
    project: b.text().label("Project name").default("helios"),
    template: b
      .select({ choices: ["ts-library", "react-app", "api-server", "cli-tool"] as const })
      .label("Template"),
    features: b
      .multiselect({ choices: ["testing", "linting", "docker", "ci-cd"] as const })
      .label("Include")
      .min(1)
      .max(4),
    pkgManager: b
      .select({ choices: ["bun", "pnpm", "npm"] as const })
      .label("Package manager"),
    git: b.confirm("simple").label("Init git repo?").default(true),
  },
}));

forgeCli.main(async () => {
  forgeCli.box({
    title: "FORGE",
    content: lines(
      "  scaffold  ·  build  ·  ship  ",
      "  ────────────────────────────  ",
      "  typescript  ·  bun  ·  turbo  ",
    ),
  });

  await forgeCli.prompt.project();
  await forgeCli.prompt.template();
  await forgeCli.prompt.features();
  await forgeCli.prompt.pkgManager();
  await forgeCli.prompt.git();

  const project = forgeCli.storage.project ?? "helios";
  const template = forgeCli.storage.template ?? "ts-library";

  await forgeCli.spin("Installing dependencies", async () => {
    await sleep(400);
  });

  await forgeCli.progress(
    "Scaffolding",
    ["Create directories", "Write configs", "Setup tooling", "Init git"] as const,
    async () => {
      await sleep(230);
    },
  );

  forgeCli.box({
    title: `${project}/`,
    content: forgeCli.tree({
      [project]: {
        src: {
          "index.ts": null,
          "types.ts": null,
        },
        tests: {
          [`${project}.test.ts`]: null,
        },
        ".github": {
          workflows: { "ci.yml": null },
        },
        "eslint.config.ts": null,
        "package.json": null,
        "tsconfig.json": null,
        "README.md": null,
      },
    }),
  });

  forgeCli.success(`${template} project scaffolded at ./${project}`);
  forgeCli.outro("Run bun dev to get started.");
});

// ─── RELAY ────────────────────────────────────────────────────────────────────
// Deployment pipeline — sky blue, rounded sidebar
const relayCli = createCLI((b) => ({
  title: "relay",
  theme: {
    sidebar: "rounded",
    active: "cyan",
    border: "cyan",
    symbols: {
      cursor: "▶",
      radio_on: "●",
      radio_off: "○",
      check_on: "◉",
      check_off: "○",
    },
  },
  prompts: {
    service: b
      .search({
        choices: [
          "api-gateway",
          "auth-service",
          "billing-worker",
          "data-pipeline",
          "edge-proxy",
        ] as const,
      })
      .label("Service"),
    tag: b.text().label("Image tag").default("v2.4.1"),
    environment: b
      .select({ choices: ["staging", "canary", "production"] as const })
      .label("Environment"),
    regions: b
      .multiselect({
        choices: ["us-east-1", "eu-west-1", "ap-southeast-1"] as const,
      })
      .label("Deploy to")
      .min(1),
    approve: b.confirm("simple").label("Approve rollout?").default(true),
  },
}));

relayCli.main(async () => {
  relayCli.box({
    title: "RELAY",
    content: lines(
      "  build → push → deploy → verify  ",
      "  ─────────────────────────────── ",
      "  zero-downtime  ·  multi-region  ",
    ),
  });

  await relayCli.prompt.service();
  await relayCli.prompt.tag();
  await relayCli.prompt.environment();
  await relayCli.prompt.regions();
  await relayCli.prompt.approve();

  const service = relayCli.storage.service ?? "api-gateway";
  const tag = relayCli.storage.tag ?? "v2.4.1";
  const environment = relayCli.storage.environment ?? "production";

  await relayCli.spin("Building image", async () => {
    await sleep(360);
  });

  await relayCli.spin("Pushing to registry", async () => {
    await sleep(280);
  });

  await relayCli.progress(
    "Rolling out",
    ["us-east-1", "eu-west-1", "ap-southeast-1"] as const,
    async () => {
      await sleep(300);
    },
  );

  relayCli.box({
    title: "Deployment",
    content: relayCli.table(
      ["Region", "Status", "Version", "Health"],
      [
        ["us-east-1", "live", tag, "100%"],
        ["eu-west-1", "live", tag, "100%"],
        ["ap-southeast-1", "live", tag, "100%"],
      ],
    ),
  });

  relayCli.success(`${service}@${tag} deployed to ${environment}.`);
  relayCli.outro("Rollout complete. All regions healthy.");
});

// ─── VAULTSMITH ───────────────────────────────────────────────────────────────
// Secret manager — amber gold, no sidebar
const vaultsmithCli = createCLI((b) => ({
  title: "vaultsmith",
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
    workspace: b.text().label("Workspace").default("ledger"),
    keys: b.list().label("Keys").min(2).max(4),
    rootSecret: b.password().label("Root secret").default("vault_live_seed"),
    rotationDays: b.number().label("Rotation days").min(7).max(90),
    auditTrail: b.confirm().label("Enable audit trail?").default(true),
  },
}));

vaultsmithCli.main(async () => {
  vaultsmithCli.box({
    title: "VAULTSMITH",
    content: lines(
      "  ┌──────────────────┐  ",
      "  │  key management  │  ",
      "  └──────────────────┘  ",
      "  AES-256-GCM  ·  PBKDF2  ",
    ),
  });

  await vaultsmithCli.prompt.workspace();
  await vaultsmithCli.prompt.keys();
  await vaultsmithCli.prompt.rootSecret();
  await vaultsmithCli.prompt.rotationDays();
  await vaultsmithCli.prompt.auditTrail();

  const workspace = vaultsmithCli.storage.workspace ?? "ledger";
  const keys = (vaultsmithCli.storage.keys as string[]) ?? [];
  const rootSecret = vaultsmithCli.storage.rootSecret ?? "vault_live_seed";
  const rotationDays = vaultsmithCli.storage.rotationDays ?? 30;

  vaultsmithCli.box({
    title: `${workspace}.vault`,
    content: lines(
      ...keys.map((k) => `${k}=••••••••••`),
      `ROOT_SECRET=${mask(String(rootSecret))}`,
      `ROTATION=${rotationDays}d`,
      `ALGORITHM=AES-256-GCM`,
    ),
  });

  await vaultsmithCli.spin("Sealing vault", async () => {
    await sleep(380);
  });

  if (vaultsmithCli.storage.auditTrail) {
    vaultsmithCli
      .log("info", "Audit trail enabled — all access events will be logged.")
      .flush();
  }

  vaultsmithCli.success(`Sealed ${keys.length + 1} secrets for ${workspace}.`);
  vaultsmithCli.outro("Vault snapshot written.");
});

// ─── AXIOM ────────────────────────────────────────────────────────────────────
// Schema migrations — violet, rounded sidebar
const axiomCli = createCLI((b) => ({
  title: "axiom",
  theme: {
    sidebar: "rounded",
    active: "magenta",
    border: "magenta",
    symbols: {
      cursor: "◆",
      radio_on: "◈",
      radio_off: "◇",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    schema: b.text().label("Schema file").default("schema.prisma"),
    operations: b
      .multiselect({
        choices: [
          "add-index",
          "rename-column",
          "drop-constraint",
          "add-fk",
        ] as const,
      })
      .label("Operations")
      .min(1),
    target: b
      .select({ choices: ["staging", "production"] as const })
      .label("Target env"),
    dryRun: b.confirm("simple").label("Dry run?").default(false),
  },
}));

axiomCli.main(async () => {
  axiomCli.box({
    title: "AXIOM",
    content: lines(
      "  diff  ·  plan  ·  apply  ·  rollback  ",
      "  ─────────────────────────────────────  ",
      "  zero-downtime schema migrations        ",
    ),
  });

  await axiomCli.prompt.schema();
  await axiomCli.prompt.operations();
  await axiomCli.prompt.target();
  await axiomCli.prompt.dryRun();

  const target = axiomCli.storage.target ?? "production";

  await axiomCli.spin("Analyzing schema diff", async () => {
    await sleep(340);
  });

  axiomCli.box({
    title: "Migration plan",
    content: lines(
      "  + CREATE INDEX idx_users_email ON users(email)",
      "  ~ RENAME COLUMN events.user_id → events.user_uuid",
      "  + ADD CONSTRAINT sessions_user_fk",
    ),
  });

  await axiomCli.progress(
    "Applying",
    ["users", "events", "sessions"] as const,
    async () => {
      await sleep(280);
    },
  );

  axiomCli.box({
    title: "Migration result",
    content: axiomCli.table(
      ["Table", "Operation", "Duration", "Status"],
      [
        ["users", "add-index", "42ms", "applied"],
        ["events", "rename-column", "18ms", "applied"],
        ["sessions", "add-fk", "31ms", "applied"],
      ],
    ),
  });

  axiomCli.success(`3 migrations applied to ${target}.`);
  axiomCli.outro("Schema is up to date.");
});

// ─── SENTINEL ─────────────────────────────────────────────────────────────────
// Incident monitor — red/coral, no sidebar, no prompts
const sentinelCli = createCLI(() => ({
  title: "sentinel",
  theme: {
    sidebar: false,
    active: "red",
    border: "red",
    symbols: {
      cursor: "▶",
    },
  },
}));

sentinelCli.main(async () => {
  sentinelCli.box({
    title: "SENTINEL",
    content: lines(
      "  monitor  ·  triage  ·  escalate  ",
      "  ─────────────────────────────── ",
      "  real-time incident detection     ",
    ),
  });

  await sentinelCli.spin("Scanning edge nodes", async () => {
    await sleep(380);
  });

  await sentinelCli.spin("Replaying traces", async () => {
    await sleep(340);
  });

  await sentinelCli.progress(
    "Correlating",
    [
      "api-gateway",
      "billing-worker",
      "edge-proxy",
      "session-cache",
      "auth-service",
    ] as const,
    async () => {
      await sleep(190);
    },
  );

  sentinelCli.box({
    title: "Active findings",
    content: sentinelCli.table(
      ["Service", "Issue", "Region", "Sev"],
      [
        ["api-gateway", "latency spike", "us-east-1", "high"],
        ["billing-worker", "retry storm", "eu-west-1", "medium"],
        ["edge-proxy", "cert expiring", "ap-se-1", "medium"],
        ["session-cache", "mem pressure", "us-east-1", "low"],
      ],
    ),
  });

  sentinelCli.log("error", "api-gateway latency is outside the SLO window.").flush();
  sentinelCli.log("warn", "billing-worker retry rate above safe threshold.").flush();
  sentinelCli.log("info", "edge-proxy cert expires in 14 days — renew soon.").flush();
  sentinelCli.success("Escalation bundle prepared for on-call.");
  sentinelCli.outro("Incident room is live.");
});

export const homeDemos: HomeDemo[] = [
  {
    id: "forge",
    title: "forge",
    cli: forgeCli,
    answers: {
      project: "helios",
      template: "ts-library",
      features: ["testing", "linting", "ci-cd"],
      pkgManager: "bun",
      git: true,
    },
    terminalTheme: {
      foreground: "#e8f5e9",
      muted: "#5a7a5e",
      border: "#1a3320",
      cursor: "#e8f5e9",
      accent: "#69f0ae",
      success: "#b9f6ca",
      warn: "#ffd54f",
      info: "#80deea",
      error: "#ff8a80",
    },
  },
  {
    id: "relay",
    title: "relay",
    cli: relayCli,
    answers: {
      service: "api-gateway",
      tag: "v2.4.1",
      environment: "production",
      regions: ["us-east-1", "eu-west-1", "ap-southeast-1"],
      approve: true,
    },
    terminalTheme: {
      foreground: "#e1f5fe",
      muted: "#4d7a8f",
      border: "#0d2d3d",
      cursor: "#e1f5fe",
      accent: "#4dd0e1",
      success: "#80cbc4",
      warn: "#ffcc80",
      info: "#81d4fa",
      error: "#ef9a9a",
    },
  },
  {
    id: "vaultsmith",
    title: "vaultsmith",
    cli: vaultsmithCli,
    answers: {
      workspace: "ledger",
      keys: ["API_KEY", "DATABASE_URL", "SESSION_SECRET"],
      rootSecret: "vault_live_f29ab1d2e9",
      rotationDays: 30,
      auditTrail: true,
    },
    terminalTheme: {
      foreground: "#f7f1e3",
      muted: "#948b6f",
      border: "#3d3428",
      cursor: "#f7f1e3",
      accent: "#ffcd70",
      success: "#9fe870",
      warn: "#ffcd70",
      info: "#7db5ff",
      error: "#ff8b6a",
    },
  },
  {
    id: "axiom",
    title: "axiom",
    cli: axiomCli,
    answers: {
      schema: "schema.prisma",
      operations: ["add-index", "rename-column", "add-fk"],
      target: "production",
      dryRun: false,
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
  {
    id: "sentinel",
    title: "sentinel",
    cli: sentinelCli,
    terminalTheme: {
      foreground: "#fce4ec",
      muted: "#9e6b75",
      border: "#3d1a22",
      cursor: "#fce4ec",
      accent: "#ff8a80",
      success: "#a5d6a7",
      warn: "#ffe082",
      info: "#90caf9",
      error: "#ff5252",
    },
  },
];
