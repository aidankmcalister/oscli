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

// ─── NOVA ─────────────────────────────────────────────────────────────────────
// AI model fine-tuning runner — indigo/violet
const novaCli = createCLI((b) => ({
  title: "nova",
  theme: {
    sidebar: "rounded",
    active: "blue",
    border: "blue",
    symbols: {
      cursor: "◆",
      radio_on: "◈",
      radio_off: "◇",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    model: b
      .select({
        choices: [
          "llama-3.1-8b",
          "mistral-7b",
          "phi-3-mini",
          "gemma-2-9b",
        ] as const,
      })
      .label("Base model"),
    dataset: b.text().label("Dataset path").default("data/finetune.jsonl"),
    epochs: b.number().label("Epochs").min(1).max(10).default(3),
    learningRate: b
      .select({ choices: ["1e-4", "5e-5", "2e-5", "1e-5"] as const })
      .label("Learning rate"),
    quantize: b.confirm("simple").label("4-bit quantization?").default(true),
  },
}));

novaCli.main(async () => {
  novaCli.box({
    title: "NOVA",
    content: lines(
      "  train  ·  eval  ·  export  ·  serve  ",
      "  ────────────────────────────────────  ",
      "  LoRA fine-tuning  ·  GGUF export     ",
    ),
  });

  await novaCli.prompt.model();
  await novaCli.prompt.dataset();
  await novaCli.prompt.epochs();
  await novaCli.prompt.learningRate();
  await novaCli.prompt.quantize();

  const model = novaCli.storage.model ?? "mistral-7b";
  const epochs = novaCli.storage.epochs ?? 3;

  await novaCli.spin("Loading base weights", async () => {
    await sleep(360);
  });

  await novaCli.spin("Tokenizing dataset", async () => {
    await sleep(300);
  });

  await novaCli.progress(
    `Training (${epochs} epochs)`,
    ["epoch 1/3", "epoch 2/3", "epoch 3/3"] as const,
    async () => {
      await sleep(320);
    },
  );

  novaCli.box({
    title: "Training summary",
    content: novaCli.table(
      ["Metric", "Value"],
      [
        ["train loss", "0.3142"],
        ["eval loss", "0.3389"],
        ["perplexity", "4.21"],
        ["tokens/sec", "2,840"],
      ],
    ),
  });

  novaCli.success(`${model} fine-tuned. Adapter saved to ./adapters/`);
  novaCli.outro("Export with nova export --format gguf");
});

// ─── DRIFT ────────────────────────────────────────────────────────────────────
// Git branch lifecycle manager — slate/cool grey
const driftCli = createCLI((b) => ({
  title: "drift",
  theme: {
    sidebar: "rounded",
    active: "white",
    border: "white",
    symbols: {
      cursor: "›",
      radio_on: "●",
      radio_off: "○",
      check_on: "☑",
      check_off: "☐",
    },
  },
  prompts: {
    remote: b
      .select({ choices: ["origin", "upstream", "fork"] as const })
      .label("Remote"),
    filter: b
      .select({ choices: ["stale", "merged", "ahead", "all"] as const })
      .label("Show branches"),
    branches: b
      .multiselect({
        choices: [
          "feat/payment-v2",
          "fix/session-leak",
          "chore/upgrade-deps",
          "feat/dark-mode",
          "refactor/auth-layer",
        ] as const,
      })
      .label("Delete branches")
      .min(1),
    confirm: b.confirm("simple").label("Confirm deletion?").default(false),
  },
}));

driftCli.main(async () => {
  driftCli.box({
    title: "DRIFT",
    content: lines(
      "  scan  ·  prune  ·  sync  ·  archive  ",
      "  ─────────────────────────────────────",
      "  git branch lifecycle management      ",
    ),
  });

  await driftCli.prompt.remote();
  await driftCli.prompt.filter();
  await driftCli.prompt.branches();
  await driftCli.prompt.confirm();

  await driftCli.spin("Fetching remote refs", async () => {
    await sleep(340);
  });

  driftCli.box({
    title: "Branch report",
    content: driftCli.table(
      ["Branch", "Last commit", "Status", "Behind"],
      [
        ["feat/payment-v2", "3 weeks ago", "merged", "0"],
        ["fix/session-leak", "5 weeks ago", "merged", "0"],
        ["chore/upgrade-deps", "2 weeks ago", "stale", "12"],
        ["feat/dark-mode", "6 weeks ago", "merged", "0"],
        ["refactor/auth-layer", "4 weeks ago", "stale", "8"],
      ],
    ),
  });

  await driftCli.progress(
    "Pruning",
    [
      "feat/payment-v2",
      "fix/session-leak",
      "chore/upgrade-deps",
      "feat/dark-mode",
    ] as const,
    async () => {
      await sleep(200);
    },
  );

  driftCli.success("4 branches deleted. Working tree is clean.");
  driftCli.outro("Run drift sync to update local refs.");
});

// ─── PRISM ────────────────────────────────────────────────────────────────────
// API key provisioner with scopes — teal/emerald
const prismCli = createCLI((b) => ({
  title: "prism",
  theme: {
    sidebar: false,
    active: "green",
    cursor: "green",
    border: "green",
    symbols: {
      cursor: "▸",
      check_on: "◉",
      check_off: "○",
    },
  },
  prompts: {
    name: b.text().label("Key name").default("prod-api-key"),
    environment: b
      .select({ choices: ["production", "staging", "development"] as const })
      .label("Environment"),
    scopes: b
      .multiselect({
        choices: [
          "read:users",
          "write:users",
          "read:billing",
          "write:billing",
          "admin:org",
        ] as const,
      })
      .label("Scopes")
      .min(1),
    rateLimit: b.number().label("Rate limit (req/min)").min(10).default(1000),
    expiry: b
      .select({ choices: ["30d", "90d", "1y", "never"] as const })
      .label("Expires"),
  },
}));

prismCli.main(async () => {
  prismCli.box({
    title: "PRISM",
    content: lines(
      "  provision  ·  rotate  ·  revoke  ",
      "  ────────────────────────────────  ",
      "  API key management & audit trail  ",
    ),
  });

  await prismCli.prompt.name();
  await prismCli.prompt.environment();
  await prismCli.prompt.scopes();
  await prismCli.prompt.rateLimit();
  await prismCli.prompt.expiry();

  const name = prismCli.storage.name ?? "prod-api-key";
  const environment = prismCli.storage.environment ?? "production";

  await prismCli.spin("Generating key material", async () => {
    await sleep(300);
  });

  await prismCli.spin("Writing to secrets store", async () => {
    await sleep(260);
  });

  prismCli.box({
    title: "Key provisioned",
    content: lines(
      `  Name        ${name}`,
      `  Env         ${environment}`,
      `  Key         prism_live_••••••••••••••••`,
      `  Rate limit  1,000 req/min`,
      `  Scopes      read:users, write:users`,
      `  Expires     90 days`,
    ),
  });

  prismCli.log("warn", "Store this key — it will not be shown again.").flush();
  prismCli.success(`Key provisioned for ${environment}.`);
  prismCli.outro("Manage keys at prism.dev/keys");
});

// ─── ORBIT ────────────────────────────────────────────────────────────────────
// Cron job scheduler — rose/pink
const orbitCli = createCLI((b) => ({
  title: "orbit",
  theme: {
    sidebar: "rounded",
    active: "magenta",
    border: "magenta",
    symbols: {
      cursor: "→",
      radio_on: "◉",
      radio_off: "○",
      check_on: "◆",
      check_off: "◇",
    },
  },
  prompts: {
    jobName: b.text().label("Job name").default("nightly-report"),
    schedule: b
      .select({
        choices: [
          "every 5 minutes",
          "hourly",
          "daily at midnight",
          "weekly on Monday",
          "custom",
        ] as const,
      })
      .label("Schedule"),
    command: b.text().label("Command").default("bun run generate-report"),
    timezone: b
      .select({
        choices: ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"] as const,
      })
      .label("Timezone"),
    retries: b.number().label("Max retries").min(0).max(5).default(3),
  },
}));

orbitCli.main(async () => {
  orbitCli.box({
    title: "ORBIT",
    content: lines(
      "  schedule  ·  monitor  ·  replay  ",
      "  ──────────────────────────────── ",
      "  distributed cron with history    ",
    ),
  });

  await orbitCli.prompt.jobName();
  await orbitCli.prompt.schedule();
  await orbitCli.prompt.command();
  await orbitCli.prompt.timezone();
  await orbitCli.prompt.retries();

  const jobName = orbitCli.storage.jobName ?? "nightly-report";

  await orbitCli.spin("Registering job", async () => {
    await sleep(280);
  });

  orbitCli.box({
    title: "Schedule preview",
    content: orbitCli.table(
      ["Run", "UTC time", "Status"],
      [
        ["next", "2026-03-16 00:00", "scheduled"],
        ["last", "2026-03-15 00:00", "success (3.2s)"],
        ["-1", "2026-03-14 00:00", "success (2.9s)"],
        ["-2", "2026-03-13 00:00", "failed → retried"],
      ],
    ),
  });

  orbitCli.log("info", "Webhook set to POST /hooks/orbit on completion.").flush();
  orbitCli.success(`${jobName} scheduled. Next run in 13h 24m.`);
  orbitCli.outro("View live runs at orbit.run/dashboard");
});

// ─── ECHO ─────────────────────────────────────────────────────────────────────
// Structured logging & tracing inspector — amber/warm
const echoCli = createCLI(() => ({
  title: "echo",
  theme: {
    sidebar: false,
    active: "yellow",
    border: "yellow",
    symbols: {
      cursor: "▶",
    },
  },
}));

echoCli.main(async () => {
  echoCli.box({
    title: "ECHO",
    content: lines(
      "  tail  ·  filter  ·  trace  ·  export  ",
      "  ─────────────────────────────────────  ",
      "  structured log inspector              ",
    ),
  });

  await echoCli.spin("Connecting to log stream", async () => {
    await sleep(320);
  });

  await echoCli.spin("Fetching last 500 events", async () => {
    await sleep(260);
  });

  await echoCli.progress(
    "Indexing traces",
    ["api", "worker", "scheduler", "gateway", "cache"] as const,
    async () => {
      await sleep(200);
    },
  );

  echoCli.box({
    title: "Top error sources (last 1h)",
    content: echoCli.table(
      ["Service", "Level", "Count", "P95 latency"],
      [
        ["api", "error", "12", "420ms"],
        ["worker", "warn", "48", "85ms"],
        ["gateway", "error", "3", "1,240ms"],
        ["scheduler", "info", "0", "12ms"],
      ],
    ),
  });

  echoCli.log("error", "gateway: upstream timeout on /api/v2/export (3×).").flush();
  echoCli.log("warn", "worker: job queue depth above 80% threshold.").flush();
  echoCli.log("info", "api: deploy event detected, resetting baselines.").flush();
  echoCli.success("Trace bundle written to ./traces/2026-03-15.tar.gz");
  echoCli.outro("Run echo replay --trace <id> to inspect a request.");
});

export const homeDemos: HomeDemo[] = [
  {
    id: "nova",
    title: "nova",
    cli: novaCli,
    answers: {
      model: "mistral-7b",
      dataset: "data/finetune.jsonl",
      epochs: 3,
      learningRate: "5e-5",
      quantize: true,
    },
    terminalTheme: {
      foreground: "#e8eaf6",
      muted: "#5c6494",
      border: "#1a1e3c",
      cursor: "#e8eaf6",
      accent: "#7986cb",
      success: "#a5d6a7",
      warn: "#fff176",
      info: "#80deea",
      error: "#ef9a9a",
    },
  },
  {
    id: "drift",
    title: "drift",
    cli: driftCli,
    answers: {
      remote: "origin",
      filter: "merged",
      branches: [
        "feat/payment-v2",
        "fix/session-leak",
        "chore/upgrade-deps",
        "feat/dark-mode",
      ],
      confirm: true,
    },
    terminalTheme: {
      foreground: "#eceff1",
      muted: "#607d8b",
      border: "#1c2b33",
      cursor: "#eceff1",
      accent: "#b0bec5",
      success: "#a5d6a7",
      warn: "#ffcc80",
      info: "#81d4fa",
      error: "#ef9a9a",
    },
  },
  {
    id: "prism",
    title: "prism",
    cli: prismCli,
    answers: {
      name: "prod-api-key",
      environment: "production",
      scopes: ["read:users", "write:users", "read:billing"],
      rateLimit: 1000,
      expiry: "90d",
    },
    terminalTheme: {
      foreground: "#e0f2f1",
      muted: "#4a7a6e",
      border: "#0d2b27",
      cursor: "#e0f2f1",
      accent: "#4db6ac",
      success: "#80cbc4",
      warn: "#ffcc80",
      info: "#80deea",
      error: "#ef9a9a",
    },
  },
  {
    id: "orbit",
    title: "orbit",
    cli: orbitCli,
    answers: {
      jobName: "nightly-report",
      schedule: "daily at midnight",
      command: "bun run generate-report",
      timezone: "UTC",
      retries: 3,
    },
    terminalTheme: {
      foreground: "#fce4ec",
      muted: "#9e6b7a",
      border: "#3d1a25",
      cursor: "#fce4ec",
      accent: "#f48fb1",
      success: "#c5e1a5",
      warn: "#fff176",
      info: "#81d4fa",
      error: "#ff8a80",
    },
  },
  {
    id: "echo",
    title: "echo",
    cli: echoCli,
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
];
