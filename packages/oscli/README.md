<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/favicon-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/public/favicon-light.svg">
    <img src="docs/public/favicon-light.svg" alt="oscli logo" width="72">
  </picture>

# oscli

*The last CLI framework you'll reach for.*

[![Website](https://img.shields.io/badge/website-oscli.dev-111111?style=flat-square)](https://oscli.dev)
[![npm version](https://img.shields.io/npm/v/%40oscli-dev%2Foscli?style=flat-square)](https://www.npmjs.com/package/@oscli-dev/oscli)
[![npm downloads](https://img.shields.io/npm/dm/%40oscli-dev%2Foscli?style=flat-square)](https://www.npmjs.com/package/@oscli-dev/oscli)
[![npm unpacked size](https://img.shields.io/npm/unpacked-size/%40oscli-dev%2Foscli?style=flat-square)](https://www.npmjs.com/package/@oscli-dev/oscli)

[Website](https://oscli.dev) •
[Package](https://www.npmjs.com/package/@oscli-dev/oscli) •
[Examples](./examples)
</div>

`oscli` is a TypeScript-first CLI framework built on
[`commander`](https://www.npmjs.com/package/commander) and
[`picocolors`](https://www.npmjs.com/package/picocolors). You define prompts,
flags, and output once, then read typed values from `cli.storage` and
`cli.flags` anywhere in your flow.

> [!NOTE]
> The fastest way to understand the API is to run the examples in
> [`examples/`](./examples). Each file is self-contained and runs directly with
> `bun run examples/<name>.ts`.

## Install

Install the published package with your package manager of choice.

```bash
npm install @oscli-dev/oscli
pnpm add @oscli-dev/oscli
yarn add @oscli-dev/oscli
bun add @oscli-dev/oscli
```

## Quick start

This is the smallest useful `oscli` program: one prompt, one confirmation, one
success path, and a final JSON result.

```ts
import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  description: "project setup",
  json: true,
  prompts: {
    project: b.text().label("Project").default("my-app"),
    approved: b.confirm().label("Continue?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("oscli quick start");

  await cli.prompt.project();
  await cli.prompt.approved();

  if (!cli.storage.approved) {
    cli.exit("Cancelled.", {
      hint: "Pass --yes to auto-approve confirmation prompts.",
      code: "usage",
    });
  }

  cli.setResult({
    project: cli.storage.project,
    approved: cli.storage.approved,
  });

  cli.success(`Created ${cli.storage.project}`);
  cli.outro("Done.");
});
```

## What you get

`oscli` keeps the CLI definition small, but it still covers the usual runtime
concerns.

- Typed prompts and typed flags from one builder API.
- Prompt bypass from matching flag names.
- Built-in output primitives for tables, boxes, trees, diffs, links, spinners,
  and progress.
- Theme presets and deep theme overrides.
- Multi-command routing on top of Commander.
- JSON mode for scripts and machine output.
- A test harness for Vitest and other non-interactive checks.

## Examples

The repository ships with runnable examples for common CLI workflows.

- [`examples/create-app.ts`](./examples/create-app.ts): project scaffolding
- [`examples/deploy.ts`](./examples/deploy.ts): deployment flow with flags and
  progress
- [`examples/db-migrate.ts`](./examples/db-migrate.ts): migration flow with
  dry-run support
- [`examples/codegen.ts`](./examples/codegen.ts): code generation with diff
  output
- [`examples/release.ts`](./examples/release.ts): release flow with version
  bumping
- [`examples/env-setup.ts`](./examples/env-setup.ts): environment file setup
- [`examples/onboard.ts`](./examples/onboard.ts): teammate onboarding
- [`examples/audit.ts`](./examples/audit.ts): project audit with warnings and
  fixes
- [`examples/theme-showcase.ts`](./examples/theme-showcase.ts): visual
  regression pass for all themes and primitives
- [`examples/multi-command.ts`](./examples/multi-command.ts): subcommand routing

Run any example directly:

```bash
bun run examples/create-app.ts
bun run examples/deploy.ts
bun run examples/multi-command.ts list
```

## Single-command flow

Use `cli.run(async () => {})` when your CLI has one flow. Prompt values are
fully inferred from the builder chain and stored on `cli.storage`.

```ts
import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  description: "workspace setup",
  theme: "rounded",
  flags: {
    env: b
      .flag()
      .string()
      .label("Environment")
      .choices(["dev", "staging", "prod"] as const)
      .default("dev"),
  },
  prompts: {
    project: b.text().label("Project").default("my-app").color("cyan"),
    framework: b
      .search({ choices: ["react", "vue", "svelte"] as const })
      .label("Framework")
      .rule("react", "component model"),
    tags: b.list().label("Tags").min(1).max(3),
    deadline: b.date().label("Deadline").format("YYYY-MM-DD"),
    approved: b.confirm().label("Continue?").default(true),
    fallback: b.confirm("simple").label("Use fallback mode?").default(false),
  },
}));

await cli.run(async () => {
  cli.intro("workspace setup");

  await cli.prompt.project();
  await cli.prompt.framework();
  await cli.prompt.tags();
  await cli.prompt.deadline();
  await cli.prompt.approved();
  await cli.prompt.fallback();

  cli.log(`Environment: ${cli.flags.env}`).flush();
  cli.success(`Ready: ${cli.storage.project}`);
  cli.outro("Finished.");
});
```

## Multi-command flow

Use `cli.command(name, fn)` when your CLI has subcommands. `oscli` registers
Commander subcommands for you, clears storage between command runs, and keeps
the same prompt and output APIs inside each handler.

```ts
import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  description: "workspace tool",
  autocompleteHint: "Run `workspace-tool completion` to enable tab completion",
  prompts: {
    name: b.text().label("Name").default("my-app"),
  },
}));

cli.command("init", async () => {
  await cli.prompt.name();
  cli.success(`Initialized ${cli.storage.name}`);
});

cli.command("doctor", async () => {
  cli.log("info", "Checking workspace").flush();
  cli.success("No issues found");
});

await cli.run();
```

## Flags and non-interactive mode

`oscli` parses flags before your handler runs. Matching prompt flags bypass the
interactive prompt, validation still runs, and non-interactive execution works
when prompts have defaults or matching flag values.

```ts
import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  description: "create-db",
  json: true,
  flags: {
    ttl: b.flag().string().label("TTL").default("1h"),
    env: b
      .flag()
      .string()
      .label("Environment")
      .choices(["dev", "staging", "prod"] as const)
      .default("dev"),
  },
  prompts: {
    name: b.text().label("Database name").default("mydb"),
    approved: b.confirm().label("Continue?").default(true),
  },
}));

await cli.run(async () => {
  cli.log(`env: ${cli.flags.env}`).flush();
  cli.log(`ttl: ${cli.flags.ttl}`).flush();

  await cli.prompt.name();
  await cli.prompt.approved();

  cli.setResult({
    name: cli.storage.name,
    approved: cli.storage.approved,
  });
});
```

Built-in runtime flags:

- `-y`, `--yes`: auto-answer every confirmation as `true`
- `--no-color`: disable ANSI color output
- `--json`: emit only the final JSON result when `json: true` is enabled
- `NO_COLOR=1`: disable ANSI color output from the environment

## Output and styling

`oscli` includes the output helpers you usually end up hand-rolling in CLIs.

```ts
import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI(() => ({
  description: "output demo",
}));

await cli.run(async () => {
  cli.intro("output demo");
  cli.divider("Summary");

  const fileTree = cli.tree({
    src: {
      "index.ts": null,
      "client.ts": null,
    },
    "package.json": null,
  });

  cli.box({
    title: "Files",
    content: fileTree,
  });

  cli.diff("name=old\nmode=dry-run", "name=new\nmode=live");
  cli.link("Website", "https://oscli.dev");

  await cli.spin("Generating files", async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  await cli.progress(
    "Pipeline",
    ["Validate", "Build", "Finalize"] as const,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
  );

  cli.outro("Done.");
});
```

Use `cli.log()` for section-aware text output and `cli.style()` when you want a
reusable formatter for multiple strings.

```ts
const emphasis = cli.style().color("cyan").bold();

cli.log("info", emphasis.render("building workspace")).underline().flush();
cli.log("plain message").italic().flush();
```

`cli.log()` supports both forms:

- `cli.log(message)`
- `cli.log(level, message)` where `level` is `info`, `warn`, `error`, or
  `success`

## Theme overrides

Use the `theme` field in `createCLI()` to pass either a preset name or a custom
override object.

```ts
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

Theme presets:

| Preset | Description |
| --- | --- |
| `default` | Square corners, `│` rail, spacing `1` |
| `basic` | No intro or outro corners, `│` rail kept, spacing `0`, cyan cursor and active color |
| `rounded` | Rounded `╭` and `╰` corners, `│` rail, spacing `1` |

## Testing

Use `cli.test()` to run the CLI in non-interactive mode for Vitest or other
programmatic checks. The returned object includes captured output, parsed flags,
storage, and the exit code.

For command-based CLIs, pass the subcommand in `argv`. For single-command CLIs,
call `cli.run(fn)` at least once before `cli.test()` so the CLI has a stored
main handler.

```ts
import { createCLI } from "@oscli-dev/oscli";
import { expect, test } from "vitest";

const cli = createCLI((b) => ({
  description: "workspace tool",
  prompts: {
    project: b.text().label("Project"),
  },
}));

cli.command("init", async () => {
  await cli.prompt.project();
  cli.success(`Created ${cli.storage.project}`);
});

test("init flow", async () => {
  const result = await cli.test({
    argv: ["init"],
    inputs: {
      project: "my-app",
    },
  });

  expect(result.storage.project).toBe("my-app");
  expect(result.output).toContain("Created my-app");
  expect(result.exitCode).toBe(0);
});
```

## API reference

The package root exports the core runtime, storage, builder, and suggestion
helpers.

| Export | Description |
| --- | --- |
| `createCLI` | Create a CLI instance with prompts, flags, and output helpers |
| `createBuilder` | Create a standalone prompt builder factory |
| `createStorage` | Create typed key/value storage |
| `suggest` | Return the closest string match within edit distance `3` |
| `levenshtein` | Return the edit distance between two strings |

### `createCLI()` config

Use the config function to define prompts, flags, theme overrides, and optional
JSON output support before your flow runs.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | `string` | No | Commander help description |
| `prompts` | `Record<string, PromptBuilder>` | No | Prompt definitions map |
| `flags` | `Record<string, FlagDefinitionBuilder>` | No | Flag definitions map |
| `theme` | `ThemeOverride \| ThemePreset` | No | Deep-merged theme override or preset name |
| `autocompleteHint` | `string` | No | Extra hint shown for unknown commands and flags |
| `json` | `boolean` | No | Enable the global `--json` flag and `cli.setResult()` |
| `emojis` | `boolean` | No | Reserved emoji toggle |

### Prompt builders

Use the shared chainable prompt API to define how each prompt behaves.

Canonical chain order for prompt builders:

```ts
b.<type>()
  .label()
  .describe()
  .placeholder()
  .default()
  .optional()
  .validate()
  .transform()
  .color()
```

| Factory | Result type | Extra methods |
| --- | --- | --- |
| `b.text()` | `string` | Shared methods only |
| `b.password()` | `string` | Shared methods only |
| `b.number()` | `number` | `.min(n)`, `.max(n)`, `.prefix(string)` |
| `b.select({ choices })` | Union from choices | `.rule(choice, description)` |
| `b.search({ choices })` | Union from choices | `.rule(choice, description)` |
| `b.multiselect({ choices })` | Array of union from choices | `.min(n)`, `.max(n)` |
| `b.list()` | `string[]` | `.min(n)`, `.max(n)` |
| `b.date()` | `Date` | `.format(string)` |
| `b.confirm()` | `boolean` | Toggle confirm by default |
| `b.confirm("simple")` | `boolean` | Simple typed `y/n` confirm |

### Shared prompt methods

Use these methods across prompt builders to control labels, defaults, optional
values, validation, transforms, and styling.

| Method | Description |
| --- | --- |
| `.label(string)` | Set the prompt label |
| `.describe(string)` | Add helper text below the label |
| `.placeholder(string)` | Show ghost text in empty text-like prompts |
| `.default(value)` | Set the default value |
| `.optional()` | Return `T \| undefined` |
| `.validate(fn)` | Run sync or async validation |
| `.transform(fn)` | Transform the stored value |
| `.theme(string)` | Store a per-prompt theme key |
| `.color(name)` | Override the prompt label color |

### Flag builders

Use flag builders to create typed `cli.flags` values before your handler runs.
The canonical flag chain is
`b.flag().string|boolean|number().label().choices().default().optional()`.

| Factory | Result type | Methods |
| --- | --- | --- |
| `b.flag().string()` | `string` | `.label()`, `.choices()`, `.default()`, `.optional()` |
| `b.flag().boolean()` | `boolean` | `.label()`, `.default()`, `.optional()` |
| `b.flag().number()` | `number` | `.label()`, `.default()`, `.optional()` |

### CLI methods

Use these methods from the object returned by `createCLI()`.

| Method | Description |
| --- | --- |
| `cli.run(fn?)` | Run the single-command flow or parse subcommands |
| `cli.command(name, fn)` | Register a subcommand handler |
| `cli.test(options)` | Run the CLI in non-interactive test mode |
| `cli.prompt.<name>()` | Resolve one prompt and store the value |
| `cli.storage` | Read resolved prompt values |
| `cli.flags` | Read resolved flag values |
| `cli.intro(message)` | Print the opening rail line |
| `cli.outro(message)` | Print the closing rail line |
| `cli.log(message)` | Print a plain section line |
| `cli.log(level, message)` | Print a leveled section line |
| `cli.style()` | Create a reusable style builder |
| `cli.setResult(value)` | Store the final JSON result for `--json` mode |
| `cli.success(message)` | Print a success line |
| `cli.exit(message, options?)` | Print an error, optional hint, and exit |
| `cli.confirm(label, defaultValue?)` | Run an inline simple confirmation prompt |
| `cli.spin(label, fn, options?)` | Run a spinner around async work |
| `cli.progress(label, steps, fn)` | Render multi-step progress output |
| `cli.box(options)` | Print boxed content |
| `cli.table(headers, rows)` | Return an aligned table string |
| `cli.tree(data)` | Return a file-tree string |
| `cli.diff(before, after)` | Print a line diff |
| `cli.divider(label?)` | Print a horizontal divider |
| `cli.link(label, url)` | Print a clickable link or plain fallback |
| `cli.suggest(input, candidates)` | Return the nearest string match |

### Exit codes

Use semantic exit codes when you want scripts to distinguish error types.

| Name | Numeric code |
| --- | --- |
| `error` | `1` |
| `usage` | `2` |
| `auth` | `3` |
| `not_found` | `4` |
| `network` | `5` |

## Local development

Use these commands when you work on the repository locally.

```bash
bun install
bun run test
bun run typecheck
bun run build
bun run docs
bun run examples/create-app.ts
```

## Next steps

- Browse the full docs at [oscli.dev](https://oscli.dev).
- Run the examples in [`examples/`](./examples) to see complete flows.
- Start a new CLI with `createCLI()` and keep your prompts, flags, and output
  in one place.
