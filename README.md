# clios

The last CLI framework you'll reach for.

`clios` is a Bun-first TypeScript CLI framework built with
[`commander`](https://www.npmjs.com/package/commander) and
[`picocolors`](https://www.npmjs.com/package/picocolors). You define prompts
once, define flags once, run your flow, and read typed values from
`cli.storage` and `cli.flags`.

## Current status

This repository currently supports a strong single-command workflow with:

- Typed prompt builders (`text`, `number`, `password`, `select`,
  `multiselect`, `confirm`)
- Typed flag builders (`string`, `boolean`, `number`, `choices`, `default`)
- Built-in prompt rendering in the terminal
- Automatic prompt bypass when matching flags are passed
- Global `--yes` / `-y` confirmation bypass
- Global `--no-color` and `NO_COLOR` support
- Non-interactive fallback for piped output and CI
- Exit hints and semantic exit codes
- CLI primitives for logs, table, box, spinner, and progress
- Closest-match suggestions with `cli.suggest(...)`
- Vitest test coverage for core behavior

> **Note:** Multi-command routing (`cli.command(...)`) is not implemented yet
> in the current codebase.

## Install and run this repo

Use these commands to install dependencies, run the manual demo, and run
checks.

```bash
bun install
bun run dev
bun run test
bun run typecheck
```

## Quick start

This is the minimal shape for a CLI with no prompts.

```ts
import { createCLI } from "clios";

const cli = createCLI(() => ({
  description: "my cli",
  prompts: {},
}));

await cli.run(async () => {
  cli.intro("Starting...");
  cli.success("Done.");
  cli.outro("Finished.");
});
```

## Prompt-driven example

This example shows the typed builder API and `cli.storage`.

```ts
import { createCLI } from "clios";

const cli = createCLI((b) => ({
  description: "project setup",
  prompts: {
    project: b.text().label("Project").default("my-app"),
    teamSize: b.number().label("Team size").min(1).max(20),
    mode: b
      .select({ choices: ["personal", "work"] as const })
      .label("Mode")
      .rule("work", "team project"),
    tags: b
      .multiselect({ choices: ["api", "ui", "docs"] as const })
      .label("Tags")
      .min(1)
      .max(2),
    confirmStart: b.confirm().label("Start setup?").default(true),
  },
}));

await cli.run(async () => {
  await cli.prompt.project();
  await cli.prompt.teamSize();
  await cli.prompt.mode();
  await cli.prompt.tags();
  await cli.prompt.confirmStart();

  if (!cli.storage.confirmStart) {
    cli.exit("Cancelled.");
  }

  cli.success(`Created ${cli.storage.project}`);
});
```

## Flags example

This example shows typed `cli.flags`, choice inference, and prompt bypass.

```ts
import { createCLI } from "clios";

const cli = createCLI((b) => ({
  description: "create-db",
  flags: {
    env: b
      .flag()
      .string()
      .choices(["dev", "staging", "prod"] as const)
      .default("dev"),
    json: b.flag().boolean().default(false),
    ttl: b.flag().string().default("1h"),
  },
  prompts: {
    name: b.text().label("Database name").default("mydb"),
    approved: b.confirm().label("Continue?").default(true),
  },
}));

await cli.run(async () => {
  cli.log("info", `env: ${cli.flags.env}`);
  cli.log("info", `json: ${cli.flags.json}`);
  cli.log("info", `ttl: ${cli.flags.ttl}`);

  // --name bypasses the prompt and writes into storage.
  await cli.prompt.name();

  // --yes / -y auto-answers all confirms as true.
  await cli.prompt.approved();
});
```

## Runtime behavior

`clios` adapts to interactive terminals, pipes, and CI by changing only its
runtime behavior, not your CLI definition.

- `stdout` non-TTY: prompts use defaults or matching flags, spinners stop
  animating, progress prints sequential step lines, and ANSI styling is
  removed.
- `stderr` non-TTY: error output stays on `stderr`, but ANSI styling is
  removed.
- `--no-color` and `NO_COLOR`: force plain output even in a TTY.
- `cli.exit(message, { hint, code })`: prints a red error line, an optional
  hint, and exits with either a numeric code or a semantic code.

```ts
cli.exit("package.json not found.", {
  hint: "Are you running this command from the right directory?",
  code: "not_found",
});
```

## Visual primitives example

This example shows table, box, spinner, and progress.

```ts
import { createCLI } from "clios";

const cli = createCLI(() => ({
  description: "visual demo",
  prompts: {},
}));

await cli.run(async () => {
  const summary = cli.table(
    ["Field", "Value"],
    [
      ["framework", "clios"],
      ["runtime", "bun"],
      ["status", "ready"],
    ],
  );

  cli.box({
    title: "Summary",
    content: summary,
  });

  await cli.spin("Running check", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  await cli.progress("Pipeline", ["Validate", "Build", "Finalize"], async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
});
```

## Theme overrides

You can override the default terminal theme per CLI instance. `clios` deep
merges your override with the defaults, so you only specify the parts you want
to change.

```ts
import { createCLI } from "clios";

const cli = createCLI((b) => ({
  description: "styled cli",
  theme: {
    cursor: "cyan",
    active: "cyan",
    success: "green",
    border: "gray",
    sidebar: "rounded",
    symbols: {
      cursor: "❯",
      success: "✔",
    },
    spacing: 2,
  },
  prompts: {
    project: b.text().label("Project").default("my-app"),
  },
}));
```

## API reference

`clios` currently exports these functions from the package root.

| Export | Description |
| --- | --- |
| `createCLI` | Creates a CLI instance with prompts and runtime helpers |
| `createBuilder` | Creates a standalone prompt builder factory |
| `createStorage` | Creates typed key/value storage |
| `suggest` | Returns the closest string match within edit distance 3 |
| `levenshtein` | Returns the edit distance between two strings |

### `createCLI` config

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | `string` | No | Commander description text |
| `prompts` | `Record<string, PromptBuilder>` | No | Prompt definitions map |
| `flags` | `Record<string, FlagBuilder>` | No | Flag definitions map |
| `theme` | `ThemeOverride` | No | Deep-merged CLI theme override |
| `emojis` | `boolean` | No | Reserved emoji toggle |

### Prompt builders

| Factory | Result type | Extra methods |
| --- | --- | --- |
| `b.text()` | `string` | Shared methods only |
| `b.password()` | `string` | Shared methods only |
| `b.number()` | `number` | `.min(n)`, `.max(n)`, `.prefix(string)` |
| `b.select({ choices })` | union from choices | `.rule(choice, description)` |
| `b.multiselect({ choices })` | array of union from choices | `.min(n)`, `.max(n)` |
| `b.confirm()` | `boolean` | Shared methods only |

### Shared prompt methods

| Method | Effect |
| --- | --- |
| `.label(string)` | Sets prompt label |
| `.describe(string)` | Sets help text metadata |
| `.placeholder(string)` | Sets placeholder text |
| `.default(value)` | Sets default value |
| `.optional()` | Marks value as optional |
| `.validate(fn)` | Validates value (`true` or error message) |
| `.transform(fn)` | Transforms value before storage |
| `.theme(string)` | Sets per-prompt theme metadata |

### Flag builder

Use `b.flag()` first, then choose a type.

| Builder call | Result type | Notes |
| --- | --- | --- |
| `b.flag().string()` | `string` | Registers `--name <value>` style flag |
| `b.flag().boolean()` | `boolean` | Registers `--name` style flag |
| `b.flag().number()` | `number` | Parses numeric values |

Shared flag methods:

| Method | Effect |
| --- | --- |
| `.label(string)` | Sets Commander help description |
| `.default(value)` | Sets default value when flag is omitted |
| `.choices([...])` | Restricts values and infers literal union type |
| `.optional()` | Marks value as `T \| undefined` when omitted |

Built-in global flag:

- `-y, --yes`: auto-answers all confirm prompts as `true`
- `--no-color`: disables ANSI colors and styled output
- `yes` is reserved and cannot be defined in `flags`
- `no-color` is reserved and cannot be defined in `flags`

Prompt definitions also register matching bypass flags automatically:

- `text`, `number`, `select`, and `password`: `--name <value>`
- `multiselect`: `--name <value...>`
- `confirm`: `--name`

### Theme override

`theme` overrides are applied at the CLI level and deep merge with the default
render theme.

| Field | Type | Description |
| --- | --- | --- |
| `cursor` | `"black" \| "red" \| "green" \| "yellow" \| "blue" \| "magenta" \| "cyan" \| "white" \| "gray"` | Overrides the cursor color |
| `active` | `ColorName` | Overrides active accent color |
| `success` | `ColorName` | Overrides success color |
| `error` | `ColorName` | Overrides error color |
| `warning` | `ColorName` | Overrides warning color |
| `info` | `ColorName` | Overrides info color |
| `border` | `ColorName` | Overrides rail and border color |
| `sidebar` | `false \| "square" \| "rounded"` | Controls the intro/outro corners and left rail |
| `symbols` | `Partial<typeof theme.symbols>` | Overrides individual terminal glyphs |
| `spacing` | `0 \| 1 \| 2` | Controls blank rail lines between sections |

### CLI instance methods

| Method | Description |
| --- | --- |
| `cli.run(fn)` | Runs your action through Commander |
| `cli.prompt.<name>()` | Runs a configured prompt and stores the value |
| `cli.storage` | Partial typed storage object |
| `cli.flags` | Typed parsed flag values available before prompts run |
| `cli.suggest(input, candidates)` | Returns the closest command or value match |
| `cli.intro(message)` | Intro line |
| `cli.outro(message)` | Outro line |
| `cli.log(level, message)` | Colored log (`info`, `warn`, `error`, `success`) |
| `cli.success(message)` | Success log shortcut |
| `cli.exit(message, options?)` | Error log with optional hint and semantic exit code |
| `cli.confirm(label, defaultValue?)` | One-off inline confirm prompt |
| `cli.table(headers, rows)` | Returns bordered table string |
| `cli.box({ title, content })` | Prints boxed content |
| `cli.spin(label, fn, options?)` | Spinner around async work |
| `cli.progress(label, steps, fn)` | Step progress with timer and aligned columns |

## Testing

Vitest is the primary test runner in this repo.

```bash
bun run test
bun run test:watch
```

## License

MIT
