# @oscli-dev/react

React components for `oscli` demos and previews.

`@oscli-dev/react` lets you render an animated CLI walkthrough from the same
`createCLI()` instance you use in the terminal. It works well for docs sites,
landing pages, and onboarding flows.

## Install

Install the React package alongside the core CLI package.

```bash
npm install @oscli-dev/react @oscli-dev/oscli
```

You also need `react` 18 or newer.

## Quick start

Pass your CLI instance to `OscliDemo`, and give the parent container a fixed
height.

```tsx
import { OscliDemo } from "@oscli-dev/react";
import { cli } from "./cli";

export function Demo() {
  return (
    <div style={{ height: 320 }}>
      <OscliDemo cli={cli} />
    </div>
  );
}
```

## Replay real CLI logic

If your CLI has logs, spinners, boxes, branches, or other runtime behavior
after prompts, register the single-command handler on the CLI once. `OscliDemo`
replays the prompt flow and the emitted output from that handler.

```tsx
import { createCLI } from "@oscli-dev/oscli";

export const cli = createCLI((b) => ({
  description: "create-app",
  prompts: {
    project: b.text().label("Project").default("my-app"),
  },
}));

cli.main(async () => {
  await cli.prompt.project();
  await cli.spin("Scaffolding project", async () => {});
  cli.success(`Created ${cli.storage.project}`);
});
```

## Common props

Use these props most often.

| Prop | What it does |
| --- | --- |
| `cli` | Uses the CLI instance returned by `createCLI()`. |
| `answers` | Pins typed prompt answers while leaving other prompts auto-generated. |
| `replay` | Runs once, forever, or for a fixed number of total plays. |
| `speed` | Applies the built-in `"slow"`, `"normal"`, or `"fast"` preset. |
| `theme` | Uses `"auto"`, `"light"`, `"dark"`, or custom theme tokens. |
| `fade` | Turns replay fading on, off, or sets a custom duration. |
| `script` | Adds a manual playback sequence for custom demo steps. |
| `className`, `style`, `onRunComplete` | Control presentation and lifecycle hooks. |

## Deterministic runs

Use `answers` when you want stable prompt values. Set `replay={false}` when
you want the demo to run once and stop.

```tsx
<OscliDemo
  cli={cli}
  answers={{
    project: "my-app",
    framework: "next",
    approved: true,
  }}
  replay={false}
/>
```

## Docs

Read these pages next.

- [OscliDemo docs](https://oscli.dev/docs/oscli-demo)
- [Getting started](https://oscli.dev/docs)
- [Testing](https://oscli.dev/docs/testing)
