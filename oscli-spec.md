# oscli

A terminal-first framework for building CLI tools with a single ergonomic API.

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Core values

Every decision must preserve these four things.

- **Simple** — the common path stays obvious and low-ceremony
- **Expandable** — new input types fit without rewrites
- **Customizable** — themes and rendering are configurable
- **Readable** — API and internals are easy to scan
- **Small** — one runtime dependency: `commander`. Nothing else.

> No additional packages for rendering, prompts, color, spinners, tables, or validation. All of that is built with Node built-ins.

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Input builders

Input is defined declaratively. Each builder is chainable.

| Builder | Purpose |
|---|---|
| `b.text()` | Free-form text |
| `b.number()` | Numeric input (integers and floats) |
| `b.password()` | Hidden input |
| `b.select({ choices })` | Pick one |
| `b.multi({ choices })` | Pick many |
| `b.confirm()` | Boolean yes/no |
| `b.date()` | Date picker |
| `b.path()` | Local filesystem path |

**Shared chain methods:** `.label()` `.placeholder()` `.default()` `.min()` `.max()` `.validate()` `.describe()` `.optional()` `.transform()`

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Resolution order

When the CLI runs, values are resolved in this order every time:

1. Explicit argv values
2. Validated defaults
3. Prompt for anything still unresolved
4. Re-validate final values
5. Expose on `cli.storage`

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Display methods

| Method | Purpose |
|---|---|
| `cli.intro(msg)` | Start of a session |
| `cli.note(msg)` | Informational line |
| `cli.warn(msg)` | Non-fatal warning |
| `cli.success(msg)` | Positive terminal state |
| `cli.log(level, msg)` | General logging |
| `cli.spin(label, fn)` | Spinner while `fn` runs |
| `cli.confirm(msg)` | Inline yes/no |
| `cli.progress(label, items, fn)` | Multi-item progress |
| `cli.table(title, columns, rows)` | Aligned table output |
| `cli.exit(msg)` | Friendly stop with message |
| `cli.outro(msg)` | End of session |

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Rendering

Two symbol sets — picked automatically based on terminal capability.

**Unicode**
```
OK ✓  ERR ✕  WARN ▲  PROMPT ◆  SPINNER ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
```

**ASCII fallback** (for dumb terminals / CI)
```
OK [ok]  ERR [x]  WARN [!]  PROMPT [?]  SPINNER | / - \
```

Rules:
- Honor `NO_COLOR`, `TERM=dumb`, and non-TTY environments
- No cursor rewrites or spinner animation in CI/log mode
- Never rely on color alone — always pair with a symbol

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Ideal syntax

```ts
import { createCLI } from "oscli";

const cli = createCLI((b) => ({
  description: "Collect a few things",

  prompts: {
    name:    b.text().label("Name").placeholder("Ada"),
    age:     b.number().label("Age").min(0).max(120),
    weight:  b.number().label("Weight (kg)").default(70),
    service: b.select({ choices: ["standard", "express"] }).default("standard"),
    tags:    b.multi({ choices: ["js", "ts", "rust"] }).label("Tags"),
    ok:      b.confirm().label("All good?").default(true),
    notes:   b.text().label("Notes").optional(),
  },
}));

await cli.run(async () => {
  await cli.prompt.name();
  await cli.prompt.age();

  if (cli.storage.age < 13) {
    cli.exit("You need a parent to continue.");
  }

  await cli.prompt.weight();
  await cli.prompt.service();

  switch (cli.storage.service) {
    case "express": cli.log("info", "Express adds £5."); break;
    default:        cli.log("info", "Standard shipping is free.");
  }

  let tags: string[] = [];
  do {
    await cli.prompt.tags();
    tags = cli.storage.tags;
    if (tags.length === 0) cli.warn("Pick at least one tag.");
  } while (tags.length === 0);

  await cli.prompt.ok();
  cli.log("info", cli.storage.ok ? "User confirmed ✅" : "User declined ❌");

  await cli.prompt.notes();

  const extra = cli.storage.notes ? `Notes: ${cli.storage.notes}` : "No notes";
  cli.success(`Saved profile for ${cli.storage.name} (${cli.storage.age} y/o) – ${extra}`);
});
```

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Cancellation rules

- `cli.exit()` is a control-flow terminator, not just a message
- After `exit`, no remaining command logic runs
- Cancelled runs are never reported as successful

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Chunk 1 acceptance checklist

These must all work before Chunk 1 is considered done.

**Input builders**
- [ ] All builders resolve correctly when value is passed via argv (non-interactive)
- [ ] All builders fall back to `.default()` when no argv value is given
- [ ] `.validate()` blocks resolution and surfaces an error message on failure
- [ ] `.optional()` allows a prompt to be skipped with no value
- [ ] `.min()` / `.max()` enforce bounds on `number` and `multi`
- [ ] `b.number()` accepts both integers and floats

**Runtime flow**
- [ ] `cli.storage.<key>` is readable after a prompt resolves
- [ ] `cli.exit()` stops execution — nothing after it runs
- [ ] `cli.run()` completes cleanly with no unhandled errors on the happy path

**Display**
- [ ] `cli.warn()`, `cli.success()`, `cli.log()`, `cli.note()` all print output
- [ ] Unicode symbols render in a standard terminal
- [ ] ASCII fallback renders when `TERM=dumb` or `NO_COLOR` is set
- [ ] No cursor control characters appear when stdout is not a TTY

**General**
- [ ] Only one runtime dependency (`commander`) in `package.json`
- [ ] The example in this spec runs end-to-end without errors

---

> **Chunk 1 scope:** Build functionality only. No styling, no pretty output, no themes. Every display method (`warn`, `success`, `log`, etc.) just prints plain text to stdout. The goal is a working API that passes the acceptance checklist — nothing more.

## Quality gates

A change is done when:

- `createCLI` API stays stable
- Runtime dependency count stays at **one** (`commander`)
- Input builders resolve the same way in TTY and non-TTY
- Unicode and ASCII tiers both render correctly
- Progress and spinner never emit cursor controls in CI
