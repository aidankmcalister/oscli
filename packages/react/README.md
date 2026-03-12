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

## Common props

Use these props most often.

| Prop | What it does |
| --- | --- |
| `cli` | Uses the CLI instance returned by `createCLI()`. |
| `speed` | Applies the built-in `"slow"`, `"normal"`, or `"fast"` preset. |
| `timing` | Sets exact delays for typing and prompt transitions. |
| `forcedAnswers` | Pins some generated answers while keeping replay enabled. |
| `inputs` | Uses fixed inputs and disables auto-replay. |
| `theme` | Switches between `"dark"` and `"light"`. |
| `fade` | Turns replay fading on, off, or sets a custom duration. |
| `replayDelay` | Controls the pause before the next replay. |
| `className`, `style`, `onRunComplete` | Control presentation and lifecycle hooks. |

## Deterministic runs

Use `inputs` when you want the same sequence every time. Use
`forcedAnswers` when you want replay to continue, but keep some answers
stable.

```tsx
<OscliDemo
  cli={cli}
  inputs={{
    project: "my-app",
    framework: "next",
    approved: true,
  }}
/>
```

## Docs

Read these pages next.

- [OscliDemo docs](https://oscli.dev/docs/oscli-demo)
- [Getting started](https://oscli.dev/docs)
- [Testing](https://oscli.dev/docs/testing)
