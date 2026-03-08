# oscli

The last CLI framework you'll reach for.

`oscli` is a TypeScript-first CLI framework published on npm, built on
[`commander`](https://www.npmjs.com/package/commander) and
[`picocolors`](https://www.npmjs.com/package/picocolors). You define prompts,
flags, and output once, then read typed values from `cli.storage` and
`cli.flags` anywhere in your flow.

## Install

Use the package from npm with your package manager of choice.

```bash
bun add @oscli-dev/oscli
```

## Quick start

This example shows a small CLI with one prompt, one result object, and the
built-in output helpers.

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

  cli.log(`Environment: ${cli.flags.env}`);
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
  cli.log(`env: ${cli.flags.env}`);
  cli.log(`ttl: ${cli.flags.ttl}`);

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

## Runtime behavior

`oscli` adapts to interactive terminals, pipes, and CI by changing only its
runtime behavior, not your CLI definition.

- `stdout` non-TTY: prompts use defaults or matching flags, spinners stop
  animating, progress prints sequential step lines, and ANSI styling is
  removed.
- `stderr` non-TTY: error output stays on `stderr`, but ANSI styling is
  removed.
- `--no-color` and `NO_COLOR`: force plain output even in a TTY.
- `cli.exit(message, { hint, code })`: prints an error line, an optional hint,
  and exits with either a numeric code or a semantic code.
- `autocompleteHint`: adds an extra hint line for unknown commands and unknown
  flags.
- `json: true` with `--json`: suppresses decorative output and prints the value
  passed to `cli.setResult()` as raw JSON.

```ts
cli.exit("package.json not found.", {
  hint: "Are you running this command from the right directory?",
  code: "not_found",
});
```

## Visual primitives example

This example shows `table`, `box`, `tree`, `diff`, `link`, `spinner`, and
`progress`.

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
  cli.link("Documentation", "https://github.com/aidankmcalister/oscli");

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

## Styling helpers

Use `cli.log()` for section-aware text output and `cli.style()` when you want
to build a reusable formatter for multiple strings.

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
bun run dev
bun run test
bun run typecheck
bun run build
```
