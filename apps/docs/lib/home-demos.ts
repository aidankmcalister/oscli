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

const orbitCli = createCLI((b) => ({
  description: "orbit",
  theme: {
    sidebar: "rounded",
    active: "cyan",
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
    mission: b.text().label("Mission").default("Aurora"),
    destination: b
      .search({
        choices: [
          "moon-base",
          "mars-lab",
          "europa-station",
          "orbit-ring",
        ] as const,
      })
      .label("Destination"),
    payload: b
      .multiselect({
        choices: ["mapping", "relay", "habitat", "research"] as const,
      })
      .label("Payload")
      .min(1)
      .max(3),
    launchWindow: b.date().label("Launch window").format("YYYY-MM-DD"),
    autopilot: b.confirm().label("Enable autopilot?").default(true),
  },
}));

orbitCli.main(async () => {
  orbitCli.box({
    title: "ORBIT",
    content: lines(
      "      .-^-.      ",
      "   .-'     '-.   ",
      "  /  /| |\\  \\\\  ",
      "  |  \\| |/  |   ",
      "   '-._____.-'   ",
    ),
  });

  await orbitCli.prompt.mission();
  await orbitCli.prompt.destination();
  await orbitCli.prompt.payload();
  await orbitCli.prompt.launchWindow();
  await orbitCli.prompt.autopilot();

  const mission = orbitCli.storage.mission ?? "Aurora";
  const destination = orbitCli.storage.destination ?? "moon-base";
  const payload = orbitCli.storage.payload ?? [];

  await orbitCli.spin("Fueling thrusters", async () => {
    await sleep(420);
  });

  await orbitCli.progress(
    "Launch checklist",
    ["Nav lock", "Fuel pressure", "Payload seal", "Telemetry link"] as const,
    async () => {
      await sleep(260);
    },
  );

  orbitCli.box({
    title: "Flight plan",
    content: orbitCli.tree({
      [mission]: {
        flight: {
          "manifest.json": null,
          "telemetry.map": null,
        },
        payload: Object.fromEntries(
          payload.map((item) => [`${item}.cargo`, null]),
        ),
        "launch-window.txt": null,
      },
    }),
  });

  if (!orbitCli.storage.autopilot) {
    orbitCli.log("warn", "Manual piloting enabled for orbital insertion.").flush();
  }

  orbitCli.success(`Mission ${mission} cleared for ${destination}.`);
  orbitCli.outro("Launch window locked.");
});

const vaultsmithCli = createCLI((b) => ({
  description: "vaultsmith",
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
      "╭────────────────────╮",
      "│   vaultsmith / kms │",
      "╰────────────────────╯",
    ),
  });

  await vaultsmithCli.prompt.workspace();
  await vaultsmithCli.prompt.keys();
  await vaultsmithCli.prompt.rootSecret();
  await vaultsmithCli.prompt.rotationDays();
  await vaultsmithCli.prompt.auditTrail();

  const workspace = vaultsmithCli.storage.workspace ?? "ledger";
  const keys = vaultsmithCli.storage.keys ?? [];
  const rootSecret = vaultsmithCli.storage.rootSecret ?? "vault_live_seed";
  const rotationDays = vaultsmithCli.storage.rotationDays ?? 30;

  vaultsmithCli.box({
    title: `${workspace}.env.vault`,
    content: lines(
      ...keys.map((key) => `${key}=••••••••••`),
      `ROOT_SECRET=${mask(rootSecret)}`,
      `ROTATION_DAYS=${rotationDays}`,
    ),
  });

  await vaultsmithCli.spin("Encrypting secrets", async () => {
    await sleep(360);
  });

  if (vaultsmithCli.storage.auditTrail) {
    vaultsmithCli.log(
      "info",
      "Audit trail enabled for future rotations.",
    ).flush();
  }

  vaultsmithCli.success(`Sealed ${keys.length + 1} entries for ${workspace}.`);
  vaultsmithCli.outro("Vault snapshot written.");
});

const paletteLabCli = createCLI((b) => ({
  description: "palette-lab",
  theme: {
    sidebar: "rounded",
    active: "magenta",
    cursor: "magenta",
    border: "magenta",
    symbols: {
      cursor: "✦",
      radio_on: "◆",
      radio_off: "◇",
      check_on: "◈",
      check_off: "◇",
    },
  },
  prompts: {
    brand: b.text().label("Brand").default("Monocle"),
    reference: b
      .search({
        choices: ["editorial", "neo-brutal", "soft-ui", "retro-grid"] as const,
      })
      .label("Reference"),
    outputs: b
      .multiselect({
        choices: ["css-vars", "tailwind", "figma", "storybook"] as const,
      })
      .label("Outputs")
      .min(1)
      .max(3),
    contrast: b.number().label("Contrast target").min(70).max(98),
    darkMode: b.confirm().label("Generate dark mode?").default(true),
  },
}));

paletteLabCli.main(async () => {
  paletteLabCli.box({
    title: "PALETTE LAB",
    content: lines(
      "■■■■  ░░░░  ■■■■",
      "░░■■  ■■■■  ░░■■",
      "■■■■  ░░░░  ■■■■",
    ),
  });

  await paletteLabCli.prompt.brand();
  await paletteLabCli.prompt.reference();
  await paletteLabCli.prompt.outputs();
  await paletteLabCli.prompt.contrast();
  await paletteLabCli.prompt.darkMode();

  const brand = paletteLabCli.storage.brand ?? "Monocle";
  const reference = paletteLabCli.storage.reference ?? "editorial";
  const outputs = paletteLabCli.storage.outputs ?? [];

  await paletteLabCli.progress(
    "Mixing palette",
    ["Sampling", "Balancing", "Contrast pass", "Exporting"] as const,
    async () => {
      await sleep(230);
    },
  );

  paletteLabCli.box({
    title: "Build sheet",
    content: paletteLabCli.table(
      ["Field", "Value"],
      [
        ["brand", brand],
        ["reference", reference],
        ["outputs", outputs.join(", ") || "none"],
        ["contrast", `${paletteLabCli.storage.contrast ?? 90}`],
        ["dark mode", paletteLabCli.storage.darkMode ? "yes" : "no"],
      ],
    ),
  });

  paletteLabCli.success(`Generated ${outputs.length} exports for ${brand}.`);
  paletteLabCli.outro("Tokens ready for review.");
});

const releaseTrainCli = createCLI((b) => ({
  description: "release-train",
  theme: {
    sidebar: "rounded",
    active: "green",
    cursor: "green",
    border: "green",
    symbols: {
      cursor: "▹",
      radio_on: "●",
      radio_off: "○",
      check_on: "◉",
      check_off: "○",
    },
  },
  prompts: {
    version: b.text().label("Version").default("1.8.0"),
    channel: b
      .select({ choices: ["canary", "beta", "stable"] as const })
      .label("Channel"),
    shipDate: b.date().label("Ship date").format("YYYY-MM-DD"),
    notify: b.confirm("simple").label("Send changelog email?").default(true),
  },
}));

releaseTrainCli.main(async () => {
  releaseTrainCli.box({
    title: "RELEASE TRAIN",
    content: lines(
      "╭─ tag ─╮   ╭─ docs ─╮",
      "╰─ build╯──▶╰─ ship ─╯",
    ),
  });

  await releaseTrainCli.prompt.version();
  await releaseTrainCli.prompt.channel();
  await releaseTrainCli.prompt.shipDate();
  await releaseTrainCli.prompt.notify();

  await releaseTrainCli.spin("Compiling release notes", async () => {
    await sleep(320);
  });

  await releaseTrainCli.progress(
    "Publishing artifacts",
    ["cli", "react", "docs"] as const,
    async () => {
      await sleep(250);
    },
  );

  releaseTrainCli.box({
    title: "Published tags",
    content: releaseTrainCli.tree({
      releases: {
        [`v${releaseTrainCli.storage.version ?? "1.8.0"}`]: {
          "cli.tgz": null,
          "react.tgz": null,
          "docs.json": null,
        },
      },
    }),
  });

  if (releaseTrainCli.storage.notify) {
    releaseTrainCli.log("info", "Queued changelog email for subscribers.").flush();
  }

  releaseTrainCli.success(
    `Shipped ${releaseTrainCli.storage.version ?? "1.8.0"} to ${releaseTrainCli.storage.channel ?? "stable"}.`,
  );
  releaseTrainCli.outro("Release train cleared the station.");
});

const sentinelCli = createCLI(() => ({
  description: "sentinel",
  theme: {
    sidebar: false,
    active: "red",
    border: "red",
    symbols: {
      cursor: "▶",
    },
  },
}));

const sentinelFindings = [
  ["api-gateway", "latency spike", "us-east-1", "high"],
  ["billing-worker", "retry storm", "eu-west-1", "medium"],
  ["session-cache", "evictions", "ap-southeast-1", "low"],
] as const;

sentinelCli.main(async () => {
  sentinelCli.box({
    title: "SENTINEL",
    content: lines(
      "▓█▀▀ ▓█████  ███▄    █ ▄▄▄█████▓ ██▓ ███▄    █ ▓█████  ██▓    ",
      "▓█   ▀▓█   ▀  ██ ▀█   █ ▓  ██▒ ▓▒▓██▒ ██ ▀█   █ ▓█   ▀ ▓██▒    ",
      "▒███  ▒███   ▓██  ▀█ ██▒▒ ▓██░ ▒░▒██▒▓██  ▀█ ██▒▒███   ▒██░    ",
    ),
  });

  await sentinelCli.spin("Polling edge regions", async () => {
    await sleep(380);
  });

  await sentinelCli.spin("Replaying traces", async () => {
    await sleep(340);
  });

  await sentinelCli.progress(
    "Correlating incidents",
    ["gateway", "workers", "cache", "alerts"] as const,
    async () => {
      await sleep(210);
    },
  );

  sentinelCli.box({
    title: "Active findings",
    content: sentinelCli.table(
      ["Service", "Issue", "Region", "Severity"],
      sentinelFindings.map((row) => [...row]),
    ),
  });

  sentinelCli.log("warn", "billing-worker is retrying above the safe threshold.").flush();
  sentinelCli.log("error", "api-gateway latency is outside the SLO window.").flush();
  sentinelCli.log("info", "session-cache evictions are stabilizing.").flush();
  sentinelCli.success("Escalation bundle prepared for on-call.");
  sentinelCli.outro("Incident room is live.");
});

export const homeDemos: HomeDemo[] = [
  {
    id: "orbit",
    title: "orbit",
    cli: orbitCli,
    answers: {
      mission: "Aurora",
      destination: "europa-station",
      payload: ["relay", "research"],
      launchWindow: new Date("2026-11-14"),
      autopilot: false,
    },
    terminalTheme: {
      foreground: "#edf5ff",
      muted: "#6b7d92",
      border: "#2a3240",
      cursor: "#edf5ff",
      accent: "#6ee7ff",
      success: "#73f0a5",
      warn: "#ffd166",
      info: "#8db7ff",
      error: "#ff8f8f",
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
    id: "palette-lab",
    title: "palette-lab",
    cli: paletteLabCli,
    answers: {
      brand: "Monocle",
      reference: "editorial",
      outputs: ["css-vars", "figma", "storybook"],
      contrast: 92,
      darkMode: true,
    },
    terminalTheme: {
      foreground: "#fff1f7",
      muted: "#9a7890",
      border: "#3b2335",
      cursor: "#fff1f7",
      accent: "#ff7bd5",
      success: "#7ef0b5",
      warn: "#ffd38a",
      info: "#a5b8ff",
      error: "#ff8fa8",
    },
  },
  {
    id: "release-train",
    title: "release-train",
    cli: releaseTrainCli,
    answers: {
      version: "1.8.0",
      channel: "stable",
      shipDate: new Date("2026-03-20"),
      notify: true,
    },
    terminalTheme: {
      foreground: "#eefcf3",
      muted: "#75887a",
      border: "#24342a",
      cursor: "#eefcf3",
      accent: "#6ee7a2",
      success: "#8df39f",
      warn: "#f5d26a",
      info: "#8fc6ff",
      error: "#ff8d8d",
    },
  },
  {
    id: "sentinel",
    title: "sentinel",
    cli: sentinelCli,
    terminalTheme: {
      foreground: "#f7ecec",
      muted: "#907575",
      border: "#352727",
      cursor: "#f7ecec",
      accent: "#ff8b7a",
      success: "#84e4a6",
      warn: "#ffcb6b",
      info: "#95b8ff",
      error: "#ff7b7b",
    },
  },
];
