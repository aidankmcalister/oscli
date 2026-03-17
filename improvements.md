# improvements.md

## 1. System summary
This repository is a Bun/Turborepo monorepo with two publishable packages:
`@oscli-dev/oscli` at `0.1.3` and `@oscli-dev/react` at `0.1.1`. The core
package provides prompt, flag, output, and animation/runtime helpers; the React
package replays CLI flows in the docs site; `apps/docs` is a private Fumadocs
site that doubles as the main public documentation surface.

The codebase already has good bones. The public manifests are mostly clean,
rooted around explicit `exports`, `types`, and `files` allowlists. The runtime
has solid happy-path test coverage, and the output/theme layer is careful about
TTY fallbacks. The main risks are release-readiness rather than overall
project direction: the publish path is currently broken, the packed `oscli`
artifact can accumulate stale files, several prompt/runtime behaviors are wrong
in edge cases, and parts of the docs/public package surface have drifted.

## 2. Conventions
This audit uses the repository-audit categories and severity levels required by
the `code-audit-readonly` workflow. Finding IDs are sequential and are reused in
the backlog and phased plan below.

- Categories: `Bug`, `Performance`, `Security`, `Duplication`,
  `Code Quality`, `Architecture`, `Maintainability`, `Observability`,
  `Tests`, `Dependencies`
- Severity: `Critical`, `High`, `Medium`, `Low`
- Audit date: March 15, 2026

## 3. Release readiness verdict
This repository is not ready to publish on March 15, 2026.

The hard blockers are:

- The package prepublish path fails because the workspace test command does not
  find any tests when executed from `packages/oscli`.
- `@oscli-dev/oscli` can ship stale build artifacts because its build script
  does not clean `dist` before emitting split chunks.
- The core runtime still has user-visible correctness bugs in `select()`,
  `cli.animate()`, and boolean/confirm CLI option handling.

If you fix the blockers in this report without changing public API semantics
beyond bug fixes, the next publish target should be:

- `@oscli-dev/oscli`: `0.1.4`
- `@oscli-dev/react`: `0.1.2`

If you decide to redesign boolean/confirm CLI syntax in a way that changes
documented behavior, cut a minor release instead and ship `0.2.0` /
`0.2.0` together.

## 4. Validation summary
I used read-only validation commands and targeted runtime probes to separate
proven defects from static concerns.

- `bun run test`: failed. `turbo test` invoked `packages/oscli`'s local
  `vitest run`, which found no tests because the configured include glob is
  rooted at `packages/*/tests/**/*.test.ts`.
- `bunx vitest run`: passed. The repository-root run executed 11 test files /
  70 tests successfully.
- `bun run typecheck`: passed for `packages/oscli` and `packages/react`.
- `bun audit`: passed with no reported vulnerabilities.
- `npm pack --dry-run` in `packages/oscli`: succeeded and showed repeated stale
  hashed chunks plus stale declarations in the packed `dist` output.
- `npm pack --dry-run` in `packages/react`: succeeded and showed a compact pack
  surface, but the package still relies on a semver-unsafe peer range.
- Targeted probes reproduced:
  `select()` defaults resolving to the first item instead of the configured
  default, `cli.animate()` accepting invalid values, `--help` always rendering
  as `Usage: oscli`, and `--approved=false` / `--overwrite=false` failing as
  unknown options.

## 5. Progress tracking
This section lists the canonical file set used for this audit. All files below
were reviewed directly or through a focused read-only explorer pass and are
marked complete.

- [x] README.md
- [x] apps/docs/README.md
- [x] apps/docs/content/docs/flags.mdx
- [x] apps/docs/content/docs/index.mdx
- [x] apps/docs/content/docs/non-interactive-and-ci.mdx
- [x] apps/docs/package.json
- [x] apps/docs/tsconfig.json
- [x] examples/create-app.ts
- [x] examples/release.ts
- [x] package.json
- [x] packages/oscli/README.md
- [x] packages/oscli/package.json
- [x] packages/oscli/src/animate.ts
- [x] packages/oscli/src/builder.ts
- [x] packages/oscli/src/client.ts
- [x] packages/oscli/src/coerce.ts
- [x] packages/oscli/src/date.ts
- [x] packages/oscli/src/index.ts
- [x] packages/oscli/src/output.ts
- [x] packages/oscli/src/primitives/prompt.ts
- [x] packages/oscli/src/storage.ts
- [x] packages/oscli/src/suggest.ts
- [x] packages/oscli/src/theme.ts
- [x] packages/oscli/src/types.ts
- [x] packages/oscli/tests/animate.test.ts
- [x] packages/oscli/tests/client-advanced-features.test.ts
- [x] packages/oscli/tests/client.test.ts
- [x] packages/oscli/tests/ux-runtime.test.ts
- [x] packages/react/README.md
- [x] packages/react/package.json
- [x] packages/react/src/OscliDemo.tsx
- [x] packages/react/src/index.ts
- [x] tsconfig.json
- [x] turbo.json
- [x] vitest.config.ts

## 6. Review log
This log records the completion marker required by the audit workflow.

File fully reviewed: README.md
File fully reviewed: apps/docs/README.md
File fully reviewed: apps/docs/content/docs/flags.mdx
File fully reviewed: apps/docs/content/docs/index.mdx
File fully reviewed: apps/docs/content/docs/non-interactive-and-ci.mdx
File fully reviewed: apps/docs/package.json
File fully reviewed: apps/docs/tsconfig.json
File fully reviewed: examples/create-app.ts
File fully reviewed: examples/release.ts
File fully reviewed: package.json
File fully reviewed: packages/oscli/README.md
File fully reviewed: packages/oscli/package.json
File fully reviewed: packages/oscli/src/animate.ts
File fully reviewed: packages/oscli/src/builder.ts
File fully reviewed: packages/oscli/src/client.ts
File fully reviewed: packages/oscli/src/coerce.ts
File fully reviewed: packages/oscli/src/date.ts
File fully reviewed: packages/oscli/src/index.ts
File fully reviewed: packages/oscli/src/output.ts
File fully reviewed: packages/oscli/src/primitives/prompt.ts
File fully reviewed: packages/oscli/src/storage.ts
File fully reviewed: packages/oscli/src/suggest.ts
File fully reviewed: packages/oscli/src/theme.ts
File fully reviewed: packages/oscli/src/types.ts
File fully reviewed: packages/oscli/tests/animate.test.ts
File fully reviewed: packages/oscli/tests/client-advanced-features.test.ts
File fully reviewed: packages/oscli/tests/client.test.ts
File fully reviewed: packages/oscli/tests/ux-runtime.test.ts
File fully reviewed: packages/react/README.md
File fully reviewed: packages/react/package.json
File fully reviewed: packages/react/src/OscliDemo.tsx
File fully reviewed: packages/react/src/index.ts
File fully reviewed: tsconfig.json
File fully reviewed: turbo.json
File fully reviewed: vitest.config.ts

## 7. Complete finding inventory
This inventory includes every validated issue found during the audit, ordered by
severity and release impact.

### A001
Category: Tests
Severity: Critical
Location: vitest.config.ts:5-5
Problem: The only Vitest include glob is `packages/*/tests/**/*.test.ts`, but
`packages/oscli/package.json` runs `vitest run` from the package directory. In
that working directory the include matches nothing, so the workspace test path
used by both package `prepublishOnly` hooks fails before publish.
Impact: `@oscli-dev/oscli@0.1.3` and `@oscli-dev/react@0.1.1` are not
publish-ready because `bun run test` exits 1 from a clean checkout, even though
the actual test suite passes when run from the repo root.
Suggestion: Make package-local test commands run from the repo root, or change
the include pattern to something that resolves correctly from package
directories. Add a release smoke test that runs the exact `prepublishOnly`
command path.
Correlation notes: Verified on March 15, 2026: `bun run test` failed with "No
test files found", while `bunx vitest run` from the repo root passed 70 tests.
Related scripts: `packages/oscli/package.json:22-26`,
`packages/react/package.json:22-22`, `package.json:12-12`.
Security (if applicable): n/a

### A002
Category: Maintainability
Severity: High
Location: packages/oscli/package.json:15-21
Problem: `@oscli-dev/oscli` publishes the entire `dist` directory but its build
script never removes old split chunks before rebuilding.
Impact: stale hashed chunks and declarations survive across releases and are
shipped to npm, which bloats the tarball and risks exposing dead or misleading
artifacts that no longer correspond to source.
Suggestion: Clean `dist` before every build, then add an `npm pack --dry-run`
check in CI so tarball contents stay deterministic.
Correlation notes: `npm pack --dry-run` on March 15, 2026 showed 67 files in
the package, including repeated `index-*.js`, `progress-*.js`,
`spinner-*.js`, and stale `dist/primitives/ascii.d.ts` artifacts. The React
package already does the right thing at `packages/react/package.json:20-20`.
Security (if applicable): n/a

### A003
Category: Bug
Severity: High
Location: packages/oscli/src/coerce.ts:328-340
Problem: interactive `select()` prompts do not pass `defaultValue` into
`renderSelectPrompt()`, so the prompt always starts on index `0` regardless of
the configured default.
Impact: pressing Enter on a non-first default silently returns the wrong
selection, which can execute the wrong scaffold, environment, or release path.
Suggestion: Forward `defaultValue` into `renderSelectPrompt()` and initialize
the selected index from the matching choice before the first render.
Correlation notes: `packages/oscli/src/primitives/prompt.ts:429-509` starts the
selection at `0` and submits `choices[selectedIndex]`. Verified probe:
`defaultValue: "vue"` still resolved `"react"` when Enter was pressed
immediately.
Security (if applicable): n/a

### A004
Category: Bug
Severity: High
Location: packages/oscli/src/animate.ts:329-334
Problem: `cli.animate()` calls `resolvePromptValue()` but ignores validation
failures and keeps the original invalid value when `resolved.ok` is false.
Impact: docs and demo playback can show invalid input as accepted, which means
the React demo layer can contradict real runtime behavior and teach the wrong
contract to users.
Suggestion: surface validation failures from `animatePromptSequence()` as an
error event or terminal state, and make `client.ts` refuse to persist invalid
animated values.
Correlation notes: `packages/oscli/src/client.ts:1118-1146` trusts the
animation result without revalidating it. Verified probe: a prompt with
`.validate(v => v.length >= 4 ? true : "too short")` still emitted
`prompt_submit` for `"abc"` and then `run_complete`.
Security (if applicable): n/a

### A005
Category: Bug
Severity: Medium
Location: packages/oscli/src/client.ts:710-713
Problem: every generated CLI hardcodes `program.name("oscli")` instead of
deriving a name from the consumer binary or letting the app set one.
Impact: downstream applications built with the framework render incorrect help
and usage text, which is especially damaging for a CLI framework whose main job
is to own the command-line UX.
Suggestion: derive the default program name from `process.argv[1]` and expose
an explicit override in `createCLI()` for callers that want stable branding.
Correlation notes: Verified probe: `cli.test({ argv: ["--help"] })` prints
`Usage: oscli [options]` even for a consumer app titled `"My App"`.
Security (if applicable): n/a

### A006
Category: Bug
Severity: Medium
Location: packages/oscli/src/client.ts:312-318
Problem: boolean flags and confirm prompt bypasses are registered only as
positive presence flags (`--flag`), so there is no supported CLI syntax for
`false`. Defaults of `true` are therefore impossible to override from the CLI.
Impact: non-interactive automation cannot express a negative answer, which makes
default-true behaviors unsafe. For example, a release flow with
`confirmPublish.default(true)` cannot be turned off from CI.
Suggestion: support negated boolean options (for example `--no-flag`) or accept
explicit boolean values for boolean/confirm options and normalize them in one
place.
Correlation notes: `packages/oscli/src/coerce.ts:128-141` still contains
parsing logic for `"false"`, `"n"`, and `"no"`, but Commander never reaches it
with the current option shape. Verified probes: `--approved=false` and
`--overwrite=false` both fail as unknown options. See also
`examples/release.ts:19-19`.
Security (if applicable): n/a

### A007
Category: Bug
Severity: Medium
Location: packages/oscli/src/primitives/prompt.ts:429-509
Problem: `renderSelectPrompt()` accepts an empty `choices` array and can submit
`undefined` on Enter instead of failing fast.
Impact: handlers receive a value that violates the declared `T extends string`
contract, so the failure shows up later and farther away from the configuration
mistake.
Suggestion: reject empty choice arrays in the builder or in `renderByType()`
before any interactive prompt is rendered.
Correlation notes: `packages/oscli/src/coerce.ts:328-330` only checks that
`config.choices` exists, not that it is non-empty.
Security (if applicable): n/a

### A008
Category: Dependencies
Severity: Medium
Location: packages/react/package.json:41-44
Problem: `@oscli-dev/react` declares `@oscli-dev/oscli` as a peer dependency
with `*`, which makes the compatibility contract effectively unbounded.
Impact: consumers can install future incompatible `@oscli-dev/oscli` majors
without receiving an npm peer warning, even though the React demo package
depends on core runtime behavior.
Suggestion: tighten the peer range to the compatible line you intend to support,
for example `^0.1.0` or a shared workspace release range.
Correlation notes: the package is positioned as a companion to the core runtime
in `packages/react/README.md:15-21`, so peer compatibility matters to the
published surface.
Security (if applicable): n/a

### A009
Category: Bug
Severity: Medium
Location: packages/oscli/README.md:52-58
Problem: the package README quick start uses `description: "project setup"` in
the `createCLI()` config even though the runtime config surface supports
`title`, not `description`.
Impact: the copy-paste snippet is misleading and likely fails consumer typecheck
or silently omits the title/help metadata users expect.
Suggestion: change the published snippet to `title` and add a docs snippet
smoke test for README examples.
Correlation notes: the actual config shape is defined in
`packages/oscli/src/client.ts:110-117` and `packages/oscli/src/types.ts:75-82`.
Security (if applicable): n/a

### A010
Category: Bug
Severity: Medium
Location: packages/oscli/README.md:5-12
Problem: the package README logo points at `.../docs/public/...`, but this
repository stores those assets under `apps/docs/public`.
Impact: the package page on GitHub and npm loses its logo because the published
raw GitHub asset URLs return 404.
Suggestion: update the README asset URLs to `apps/docs/public` or ship stable
package-scoped assets that do not depend on the monorepo app path.
Correlation notes: the root README already points at the correct
`apps/docs/public` path at `README.md:5-12`.
Security (if applicable): n/a

### A011
Category: Tests
Severity: Medium
Location: apps/docs/package.json:9-9
Problem: the docs app exposes `types:check`, but the workspace root only runs
tasks named `typecheck`.
Impact: `bun run typecheck` gives a false sense of full-workspace coverage
because the docs app is skipped entirely. Docs-specific type drift can survive
until a later Next/Fumadocs build.
Suggestion: rename the docs script to `typecheck`, or add a dedicated Turbo task
that the root script executes.
Correlation notes: root `package.json:13-13` runs `turbo typecheck`, and the
March 15, 2026 validation run only executed `packages/oscli` and
`packages/react`.
Security (if applicable): n/a

### A012
Category: Architecture
Severity: Medium
Location: apps/docs/tsconfig.json:19-23
Problem: the docs app resolves `@oscli-dev/oscli` and `@oscli-dev/react`
directly to `node_modules/.../src/index.ts` instead of to the published entry
surface.
Impact: docs validation can succeed against internal source files while the
published package shape (`exports`, built JS, emitted `.d.ts`) is broken. That
weakens the docs app as a release canary.
Suggestion: point docs development at the workspace package entrypoints or built
artifacts that match what consumers install.
Correlation notes: this matters because the docs site is the primary public
surface for the packages.
Security (if applicable): n/a

### A013
Category: Bug
Severity: Low
Location: README.md:148-156
Problem: contributor-facing docs still reference a nonexistent `docs`
directory, and the docs site contains a leaked diff marker in its getting
started example.
Impact: local contributors can follow the wrong path, and the public docs site
shows avoidable polish issues.
Suggestion: update all local docs commands to `apps/docs` and remove the stray
`+` from the published code sample.
Correlation notes: related drift appears at `apps/docs/README.md:7-13` and
`apps/docs/content/docs/index.mdx:45-45`.
Security (if applicable): n/a

### A014
Category: Maintainability
Severity: Medium
Location: packages/oscli/package.json:26-26
Problem: both publishable packages shell out to workspace-wide
`bun run test && bun run build` in `prepublishOnly`, which couples package
publication to unrelated workspace state such as the private docs app build.
Impact: even after the immediate test-glob bug is fixed, docs-only regressions
can still block package publication and slow release recovery for the packages.
Suggestion: keep package-scoped release gates package-scoped, then enforce
workspace-wide checks in CI rather than in per-package prepublish hooks.
Correlation notes: the same pattern appears in `packages/react/package.json:22`,
and the workspace commands are defined in `package.json:11-13`.
Security (if applicable): n/a

## 8. Prioritized backlog (all findings)
This backlog orders all findings by release risk, estimated effort, and the
primary failure mode they create.

1. A001. Effort: S. Primary risk: Reliability. Fix the Vitest include/script
   mismatch so the actual prepublish path can pass.
2. A002. Effort: S. Primary risk: Reliability. Clean `dist` before build and
   make pack contents deterministic.
3. A003. Effort: M. Primary risk: Correctness. Make `select()` honor configured
   defaults in interactive mode.
4. A004. Effort: M. Primary risk: Correctness. Make `cli.animate()` reject or
   surface invalid values instead of pretending the run succeeded.
5. A006. Effort: M. Primary risk: Correctness. Add a supported negative syntax
   for boolean flags and confirm bypasses.
6. A005. Effort: S. Primary risk: Correctness. Stop hardcoding `oscli` as the
   consumer program name.
7. A007. Effort: S. Primary risk: Correctness. Fail fast on empty `select`
   choices.
8. A014. Effort: S. Primary risk: Reliability. Decouple package release hooks
   from unrelated workspace builds.
9. A011. Effort: S. Primary risk: Reliability. Bring the docs app into the
   root typecheck path.
10. A012. Effort: M. Primary risk: Maintainability. Point docs validation at
    the published package surface.
11. A009. Effort: S. Primary risk: Maintainability. Repair the package README
    quick-start snippet.
12. A010. Effort: S. Primary risk: Maintainability. Repair broken package README
    asset links.
13. A008. Effort: S. Primary risk: Maintainability. Tighten the React peer
    dependency range.
14. A013. Effort: S. Primary risk: Maintainability. Clean up stale docs paths
    and the leaked diff marker.

## 9. Detailed phased remediation plan
This plan assumes you want the smallest safe path to a publishable `0.1.4`
release without widening scope unnecessarily.

### Planning assumptions and constraints
The audit stayed read-only except for this report. I did not run a full Next.js
docs build because that would write `.next` output, and I did not edit any
source, config, or tests. The main unknown is whether you want to treat
negative boolean/confirm support as a simple bug fix or as a user-visible CLI
semantics expansion that deserves a minor bump.

### Phase 1
Objective: restore a trustworthy release path and deterministic package output.

- Findings included: A001, A002, A014
- Dependencies and ordering constraints: none; these can start immediately
  before deeper runtime fixes.
- Validation gates:
  `bun run test`
  `bunx vitest run`
  `bun run typecheck`
  `npm pack --dry-run` for both packages
- Exit criteria:
  the package prepublish path succeeds from a clean checkout, and packed `oscli`
  output contains only current build artifacts.

### Phase 2
Objective: fix core runtime correctness before shipping another release.

- Findings included: A003, A004, A005, A006, A007
- Dependencies and ordering constraints:
  A003 and A007 can be fixed together in prompt rendering.
  A006 depends on choosing the supported CLI syntax for negative booleans.
  A004 should land with new animation/runtime tests so the docs demo remains
  trustworthy.
- Validation gates:
  new tests for interactive select defaults
  new tests for empty select choices
  new tests for negative boolean/confirm CLI values
  new tests for `cli.animate()` invalid input
  a help-output test that asserts the derived program name
- Exit criteria:
  runtime and demo behavior agree on validation, interactive `select()` honors
  defaults, and CLI help/boolean semantics are stable and documented.

### Phase 3
Objective: align the published and documented surfaces with the real package
contract.

- Findings included: A008, A009, A010, A011, A012, A013
- Dependencies and ordering constraints:
  A011 should land before or alongside any docs updates so docs validation runs
  in the root workflow.
  A012 should land before relying on the docs app as a release canary.
- Validation gates:
  root typecheck includes the docs app
  package README snippets match the real API
  docs local-dev commands work from a clean checkout
  README asset links render correctly on GitHub/npm
- Exit criteria:
  the docs site and package READMEs accurately represent the published package
  surface, and docs validation participates in the normal release workflow.

### Sequencing rules
Critical and high-severity correctness/reliability issues come first. Packaging
determinism and the broken release command must be resolved before any publish.
Docs polish can wait until the release path and runtime semantics are correct,
but docs-validation coverage should not be postponed indefinitely because it is
part of the public surface for this project.

### Delivery roadmap
Use this execution order if you want the highest risk reduction fastest.

- Batch 1: A001, A002, A014
  Expected risk reduction: makes release commands trustworthy and tarballs
  predictable.
  Verification focus: root/package test commands and `npm pack --dry-run`.
- Batch 2: A003, A004, A006, A007, A005
  Expected risk reduction: removes the highest-impact runtime correctness bugs.
  Verification focus: targeted Vitest coverage for prompts, animation, and help.
- Batch 3: A011, A012, A009, A010, A008, A013
  Expected risk reduction: hardens the public package/docs surface and prevents
  future drift.
  Verification focus: docs typecheck coverage, README accuracy, and peer range.

## 10. Completeness checkpoint
This report covered release metadata, workspace scripts, package manifests,
public READMEs, the core `oscli` runtime files implicated by package behavior,
the docs paths that define the public contract, and the tests most relevant to
release confidence. The checked file list above appears exactly once, every
listed file is marked reviewed, and every finding maps back to at least one
reviewed file.

What was verified:

- publish/test/typecheck behavior through read-only command runs
- package pack surfaces through `npm pack --dry-run`
- runtime edge cases through targeted probes for select defaults, animation
  validation, help naming, and negative boolean handling
- docs and README drift through direct file review

Residual gaps:

- I did not run a full `apps/docs` build because it writes `.next` output.
- I did not execute browser-side rendering for `OscliDemo`; the React package
  review here was focused on publish metadata and compatibility risk rather than
  interactive browser QA.
