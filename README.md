<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://raw.githubusercontent.com/aidankmcalister/oscli/main/docs/public/favicon-dark.svg"
    >
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://raw.githubusercontent.com/aidankmcalister/oscli/main/docs/public/favicon-light.svg"
    >
    <img
      src="https://raw.githubusercontent.com/aidankmcalister/oscli/main/docs/public/favicon-light.svg"
      alt="oscli logo"
      width="72"
    >
  </picture>

# oscli

TypeScript-first CLI framework for prompts, flags, and output.

[![Website](https://img.shields.io/badge/docs-oscli.dev-111111?style=flat-square)](https://oscli.dev)
[![npm version](https://img.shields.io/npm/v/%40oscli-dev%2Foscli?style=flat-square)](https://www.npmjs.com/package/@oscli-dev/oscli)

[Docs](https://oscli.dev) •
[npm](https://www.npmjs.com/package/@oscli-dev/oscli) •
[Examples](https://github.com/aidankmcalister/oscli/tree/main/examples)
</div>

`oscli` lets you define prompts, flags, and output once, then reuse the same
flow in interactive terminals, tests, and automation.

## Install

Install the core package with the package manager you already use.

```bash
npm install @oscli-dev/oscli
pnpm add @oscli-dev/oscli
yarn add @oscli-dev/oscli
bun add @oscli-dev/oscli
```

## Quick start

Start with one flow, resolve prompts, and read typed values from
`cli.storage`.

```ts
import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  description: "project setup",
  prompts: {
    project: b.text().label("Project").default("my-app"),
    approved: b.confirm().label("Continue?").default(true),
  },
}));

await cli.run(async () => {
  cli.intro("project setup");

  await cli.prompt.project();
  await cli.prompt.approved();

  if (!cli.storage.approved) {
    cli.exit("Cancelled.", { code: "usage" });
  }

  cli.success(`Created ${cli.storage.project}`);
  cli.outro("Done.");
});
```

## Register once, run later

If you want the same CLI instance to drive terminal execution and experimental
tools like `<OscliDemo />`, register the single-command handler once with
`cli.main()`, then call `cli.run()` at the entrypoint.

```ts
const cli = createCLI((b) => ({
  description: "project setup",
  prompts: {
    project: b.text().label("Project").default("my-app"),
  },
}));

cli.main(async () => {
  await cli.prompt.project();
  cli.success(`Created ${cli.storage.project}`);
});

if (import.meta.main) {
  await cli.run();
}
```

## What you get

`oscli` keeps the API small, but it covers the runtime pieces most CLIs need.

- Typed prompts and typed flags from one builder API.
- Interactive and non-interactive runs from the same flow.
- Built-in output helpers for tables, boxes, trees, diffs, spinners, and
  progress.
- Theme presets, JSON mode, and multi-command routing.
- `cli.test()` for deterministic tests without touching stdin.

## Packages

This repository publishes two packages.

- `@oscli-dev/oscli`: the core CLI framework.
- `@oscli-dev/react`: a React component for embedding animated CLI demos.

## Examples

The repository includes runnable examples for common workflows.

- [`create-app`](https://github.com/aidankmcalister/oscli/blob/main/examples/create-app.ts):
  project scaffolding
- [`deploy`](https://github.com/aidankmcalister/oscli/blob/main/examples/deploy.ts):
  flags, progress, and confirmations
- [`release`](https://github.com/aidankmcalister/oscli/blob/main/examples/release.ts):
  versioning and final summaries
- [`multi-command`](https://github.com/aidankmcalister/oscli/blob/main/examples/multi-command.ts):
  subcommand routing

Run any example directly from the repository root.

```bash
bun run examples/create-app.ts
bun run examples/deploy.ts
bun run examples/multi-command.ts list
```

## Docs

Start with these pages if you want the full API surface.

- [Getting started](https://oscli.dev/docs)
- [Prompts](https://oscli.dev/docs/prompts)
- [Flags](https://oscli.dev/docs/flags)
- [Testing](https://oscli.dev/docs/testing)
- [OscliDemo](https://oscli.dev/docs/oscli-demo)

## Develop locally

From the repository root, use these commands during development.

```bash
bun install
bun run build
bun run test
cd docs && bun run dev
```
