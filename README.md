<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://raw.githubusercontent.com/aidankmcalister/oscli/main/apps/docs/public/favicon-dark.svg"
    >
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://raw.githubusercontent.com/aidankmcalister/oscli/main/apps/docs/public/favicon-light.svg"
    >
    <img
      src="https://raw.githubusercontent.com/aidankmcalister/oscli/main/apps/docs/public/favicon-light.svg"
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
  title: "project setup",
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

## What you get

`oscli` keeps the API small, but it covers the runtime pieces most CLIs need.

- Typed prompts and typed flags from one builder API.
- Interactive and non-interactive runs from the same flow.
- Built-in output helpers for tables, boxes, trees, diffs, spinners, and
  progress.
- Theme presets, JSON mode, and multi-command routing.
- `cli.test()` for deterministic tests without touching stdin.

## Package

This repository publishes `@oscli-dev/oscli`, the core CLI framework.

## Examples

The repository includes a smaller example suite with two layers.

- Concepts in
  [`examples/concepts/`](https://github.com/aidankmcalister/oscli/tree/main/examples/concepts):
  [`output-patterns`](https://github.com/aidankmcalister/oscli/blob/main/examples/concepts/output-patterns.ts),
  [`prompt-patterns`](https://github.com/aidankmcalister/oscli/blob/main/examples/concepts/prompt-patterns.ts),
  and
  [`theme-showcase`](https://github.com/aidankmcalister/oscli/blob/main/examples/concepts/theme-showcase.ts)
- Things you can build in
  [`examples/real-world-clis/`](https://github.com/aidankmcalister/oscli/tree/main/examples/real-world-clis):
  `create-app`, `db-migrate`, `deploy`, `github`, and `release`

Run any example directly from the repository root.

```bash
bun run examples/concepts/output-patterns.ts
bun run examples/concepts/prompt-patterns.ts
bun run examples/real-world-clis/create-app.ts
bun run examples/real-world-clis/github.ts pr-list --state open
```

## Docs

Start with these pages if you want the full API surface.

- [Getting started](https://oscli.dev/docs)
- [Prompts](https://oscli.dev/docs/prompts)
- [Flags](https://oscli.dev/docs/flags)
- [Testing](https://oscli.dev/docs/testing)
- [Theme](https://oscli.dev/docs/theme)

## Develop locally

From the repository root, use these commands during development.

```bash
bun install
bun run build
bun run test
cd apps/docs && bun run dev
```
