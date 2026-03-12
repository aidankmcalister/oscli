type PromptConfig = {
  type?: string;
  label?: string;
  choices?: readonly string[];
  hasDefault?: boolean;
  defaultValue?: unknown;
  confirmMode?: "toggle" | "simple";
};

type AnimateEvent =
  | { type: "intro"; message: string }
  | { type: "prompt_start"; key: string; label: string; promptType: string }
  | {
      type: "prompt_preview";
      key: string;
      label: string;
      promptType: string;
      lines: string[];
    }
  | { type: "char"; key: string; value: string; full: string }
  | {
      type: "prompt_submit";
      key: string;
      label: string;
      displayValue: string;
    }
  | { type: "spin_start"; label: string }
  | { type: "spin_complete"; label: string }
  | { type: "box_render"; title?: string; content: string }
  | { type: "log_line"; level: string; message: string }
  | { type: "success_line"; message: string }
  | { type: "outro"; message: string }
  | { type: "run_complete" };

type DemoTiming = {
  typeDelay?: number;
  promptDelay?: number;
  completionDelay?: number;
};

type DemoInputs = {
  project?: string;
  framework?: string;
  features?: string[];
  typescript?: boolean;
  packageManager?: string;
  gitInit?: boolean;
};

const promptConfigs: Record<string, PromptConfig> = {
  project: {
    type: "text",
    label: "Project",
    hasDefault: true,
    defaultValue: "my-app",
  },
  framework: {
    type: "select",
    label: "Framework",
    choices: ["next", "remix", "astro", "vite"],
    hasDefault: true,
    defaultValue: "next",
  },
  features: {
    type: "multiselect",
    label: "Features",
    choices: ["tailwind", "eslint", "testing", "auth"],
  },
  typescript: {
    type: "confirm",
    label: "Use TypeScript?",
    hasDefault: true,
    defaultValue: true,
    confirmMode: "simple",
  },
  packageManager: {
    type: "select",
    label: "Package manager",
    choices: ["npm", "bun", "pnpm", "yarn"],
    hasDefault: true,
    defaultValue: "bun",
  },
  gitInit: {
    type: "confirm",
    label: "Initialize git?",
    hasDefault: true,
    defaultValue: true,
    confirmMode: "simple",
  },
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function toLines(choices: readonly string[], selected: string[] = []) {
  return [
    ...choices.map((choice, index) => {
      const active = index === 0 ? "›" : " ";
      const icon = selected.includes(choice) ? "◉" : "○";
      return `${active} ${icon} ${choice}`;
    }),
    "↑↓ navigate • space toggle • enter confirm",
  ];
}

function toSelectLines(choices: readonly string[], value: string) {
  return [
    ...choices.map((choice) => {
      const active = choice === value ? "›" : " ";
      const icon = choice === value ? "●" : "○";
      return `${active} ${icon} ${choice}`;
    }),
    "↑↓ navigate • enter select",
  ];
}

function toConfirmLine(value: boolean) {
  return value ? "● yes / ○ no" : "○ yes / ● no";
}

function buildTree(
  project: string,
  framework: string,
  typescript: boolean,
  features: string[],
) {
  const extension = typescript ? "ts" : "js";
  const srcLines = [
    `│  │  ├─ main.${extension}`,
    `│  │  ├─ app.${extension}`,
    `│  │  └─ routes.${extension}`,
  ];

  if (features.includes("auth")) {
    srcLines.push(`│  │  └─ lib/auth.${extension}`);
  }

  const configFile =
    framework === "vite"
      ? `vite.config.${extension}`
      : `${framework}.config.${extension}`;

  const extraLines = [
    features.includes("tailwind") ? "│  ├─ tailwind.config.ts" : null,
    features.includes("tailwind") ? "│  ├─ postcss.config.js" : null,
    features.includes("eslint") ? "│  ├─ eslint.config.js" : null,
    features.includes("testing") ? "│  ├─ vitest.config.ts" : null,
  ].filter(Boolean) as string[];

  return [
    project,
    "├─ src",
    ...srcLines,
    "├─ public",
    "│  └─ favicon.ico",
    `├─ ${configFile}`,
    `├─ ${typescript ? "tsconfig.json" : "jsconfig.json"}`,
    ...extraLines,
    "├─ package.json",
    "├─ .gitignore",
    "└─ README.md",
  ].join("\n");
}

export const createAppDemoCli = {
  _promptConfigs: promptConfigs,
  async *animate({
    inputs,
    timing,
  }: {
    inputs: Record<string, unknown>;
    timing?: DemoTiming;
  }): AsyncGenerator<AnimateEvent> {
    const values = inputs as DemoInputs;
    const typeDelay = timing?.typeDelay ?? 85;
    const promptDelay = timing?.promptDelay ?? 700;
    const completionDelay = timing?.completionDelay ?? 0;

    const project = values.project ?? "my-app";
    const framework = values.framework ?? "next";
    const features = values.features ?? ["tailwind", "eslint"];
    const typescript = values.typescript ?? true;
    const packageManager = values.packageManager ?? "bun";
    const gitInit = values.gitInit ?? true;

    yield { type: "intro", message: "create-app" };

    yield {
      type: "prompt_start",
      key: "project",
      label: "Project",
      promptType: "text",
    };

    let full = "";
    for (const char of project) {
      full += char;
      yield { type: "char", key: "project", value: char, full };
      await sleep(typeDelay);
    }

    yield {
      type: "prompt_submit",
      key: "project",
      label: "Project",
      displayValue: project,
    };

    await sleep(promptDelay);

    yield {
      type: "prompt_start",
      key: "framework",
      label: "Framework",
      promptType: "select",
    };
    yield {
      type: "prompt_preview",
      key: "framework",
      label: "Framework",
      promptType: "select",
      lines: toSelectLines(promptConfigs.framework.choices ?? [], framework),
    };
    await sleep(promptDelay);
    yield {
      type: "prompt_submit",
      key: "framework",
      label: "Framework",
      displayValue: framework,
    };

    await sleep(promptDelay);

    yield {
      type: "prompt_start",
      key: "features",
      label: "Features",
      promptType: "multiselect",
    };
    yield {
      type: "prompt_preview",
      key: "features",
      label: "Features",
      promptType: "multiselect",
      lines: toLines(promptConfigs.features.choices ?? [], features),
    };
    await sleep(promptDelay);
    yield {
      type: "prompt_submit",
      key: "features",
      label: "Features",
      displayValue: features.join(", "),
    };

    await sleep(promptDelay);

    yield {
      type: "prompt_start",
      key: "typescript",
      label: "Use TypeScript?",
      promptType: "confirm",
    };
    yield {
      type: "prompt_preview",
      key: "typescript",
      label: "Use TypeScript?",
      promptType: "confirm",
      lines: [toConfirmLine(typescript), "enter confirm"],
    };
    await sleep(promptDelay);
    yield {
      type: "prompt_submit",
      key: "typescript",
      label: "Use TypeScript?",
      displayValue: typescript ? "yes" : "no",
    };

    await sleep(promptDelay);

    yield {
      type: "prompt_start",
      key: "packageManager",
      label: "Package manager",
      promptType: "select",
    };
    yield {
      type: "prompt_preview",
      key: "packageManager",
      label: "Package manager",
      promptType: "select",
      lines: toSelectLines(
        promptConfigs.packageManager.choices ?? [],
        packageManager,
      ),
    };
    await sleep(promptDelay);
    yield {
      type: "prompt_submit",
      key: "packageManager",
      label: "Package manager",
      displayValue: packageManager,
    };

    await sleep(promptDelay);

    yield {
      type: "prompt_start",
      key: "gitInit",
      label: "Initialize git?",
      promptType: "confirm",
    };
    yield {
      type: "prompt_preview",
      key: "gitInit",
      label: "Initialize git?",
      promptType: "confirm",
      lines: [toConfirmLine(gitInit), "enter confirm"],
    };
    await sleep(promptDelay);
    yield {
      type: "prompt_submit",
      key: "gitInit",
      label: "Initialize git?",
      displayValue: gitInit ? "yes" : "no",
    };

    yield { type: "spin_start", label: "Scaffolding project" };
    await sleep(650);
    yield { type: "spin_complete", label: "Scaffolding project" };

    yield { type: "spin_start", label: "Installing dependencies" };
    await sleep(900);
    yield { type: "spin_complete", label: "Installing dependencies" };

    yield {
      type: "box_render",
      title: "Generated files",
      content: buildTree(project, framework, typescript, features),
    };

    if (features.length > 0) {
      yield {
        type: "log_line",
        level: "info",
        message: `Enabled features: ${features.join(", ")}.`,
      };
    }

    if (gitInit) {
      yield {
        type: "log_line",
        level: "info",
        message: "Initialized a fresh git repository.",
      };
    }

    if (completionDelay > 0) {
      await sleep(completionDelay);
    }

    yield {
      type: "success_line",
      message: `Created ${project} with ${framework} and ${packageManager}.`,
    };
    yield { type: "outro", message: `Project ready in ./${project}` };
    yield { type: "run_complete" };
  },
};
