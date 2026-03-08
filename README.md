# oscli

The last CLI framework you'll reach for.

`oscli` is a Bun-first TypeScript CLI framework built with
[`commander`](https://www.npmjs.com/package/commander) and
[`picocolors`](https://www.npmjs.com/package/picocolors). You define prompts
once, run your flow, and read typed values from `cli.storage`.

## Current status

This repository currently supports a strong single-command workflow with:

- Typed prompt builders (`text`, `number`, `password`, `select`,
  `multiselect`, `confirm`)
- Built-in prompt rendering in the terminal
- CLI primitives for logs, table, box, spinner, and progress
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
import { createCLI } from "oscli";

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
import { createCLI } from "oscli";

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

## Visual primitives example

This example shows table, box, spinner, and progress.

```ts
import { createCLI } from "oscli";

const cli = createCLI(() => ({
  description: "visual demo",
  prompts: {},
}));

await cli.run(async () => {
  const summary = cli.table(
    ["Field", "Value"],
    [
      ["framework", "oscli"],
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

## API reference

`oscli` currently exports these functions from the package root.

| Export | Description |
| --- | --- |
| `createCLI` | Creates a CLI instance with prompts and runtime helpers |
| `createBuilder` | Creates a standalone prompt builder factory |
| `createStorage` | Creates typed key/value storage |

### `createCLI` config

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | `string` | No | Commander description text |
| `prompts` | `Record<string, PromptBuilder>` | Yes | Prompt definitions map (use `{}` for none) |
| `theme` | `{ spacing?: number }` | No | Reserved theme config |
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

### CLI instance methods

| Method | Description |
| --- | --- |
| `cli.run(fn)` | Runs your action through Commander |
| `cli.prompt.<name>()` | Runs a configured prompt and stores the value |
| `cli.storage` | Partial typed storage object |
| `cli.intro(message)` | Intro line |
| `cli.outro(message)` | Outro line |
| `cli.log(level, message)` | Colored log (`info`, `warn`, `error`, `success`) |
| `cli.success(message)` | Success log shortcut |
| `cli.exit(message)` | Error log + `process.exit(1)` |
| `cli.confirm(label, defaultValue?)` | One-off inline confirm prompt |
| `cli.table(headers, rows)` | Returns bordered table string |
| `cli.box({ title, content })` | Prints boxed content |
| `cli.spin(label, fn)` | Spinner around async work |
| `cli.progress(label, steps, fn)` | Step progress with timer and aligned columns |

## Testing

Vitest is the primary test runner in this repo.

```bash
bun run test
bun run test:watch
```

## License

MIT
