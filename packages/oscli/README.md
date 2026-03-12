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

# @oscli-dev/oscli

TypeScript-first CLI framework for prompts, flags, and output.

[![Docs](https://img.shields.io/badge/docs-oscli.dev-111111?style=flat-square)](https://oscli.dev)
[![npm version](https://img.shields.io/npm/v/%40oscli-dev%2Foscli?style=flat-square)](https://www.npmjs.com/package/@oscli-dev/oscli)

[Docs](https://oscli.dev) •
[npm](https://www.npmjs.com/package/@oscli-dev/oscli) •
[Examples](https://github.com/aidankmcalister/oscli/tree/main/examples)
</div>

`@oscli-dev/oscli` lets you define prompts, flags, and output once, then
reuse the same flow in interactive terminals, tests, and automation.

## Install

Install the package with the package manager you already use.

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

## What you get

The core package covers the runtime pieces most CLIs need.

- Typed prompts and typed flags from one builder API.
- Interactive and non-interactive runs from the same flow.
- Built-in output helpers for tables, boxes, trees, diffs, spinners, and
  progress.
- Theme presets, JSON mode, and multi-command routing.
- `cli.test()` for deterministic tests without touching stdin.

## Companion package

Use `@oscli-dev/react` when you want to embed an animated CLI demo in a React
app or docs site.

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

## Docs

Use these pages next.

- [Getting started](https://oscli.dev/docs)
- [Prompts](https://oscli.dev/docs/prompts)
- [Flags](https://oscli.dev/docs/flags)
- [Testing](https://oscli.dev/docs/testing)
- [Theme](https://oscli.dev/docs/theme)
