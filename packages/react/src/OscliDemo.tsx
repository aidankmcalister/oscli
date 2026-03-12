/** @jsxRuntime classic */
"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";

// ─── Speed presets ────────────────────────────────────────────────────────────

export type DemoSpeed = "slow" | "normal" | "fast";

type SpeedConfig = {
  typeDelay: number;
  promptDelay: number;
  fadeDuration: number;
  replayDelay: number;
};

const SPEED_PRESETS: Record<DemoSpeed, SpeedConfig> = {
  slow:   { typeDelay: 180, promptDelay: 900,  fadeDuration: 500, replayDelay: 4500 },
  normal: { typeDelay: 120, promptDelay: 620,  fadeDuration: 400, replayDelay: 3500 },
  fast:   { typeDelay: 85,  promptDelay: 420,  fadeDuration: 340, replayDelay: 3000 },
};

// ─── Theme ────────────────────────────────────────────────────────────────────

/**
 * Custom terminal color tokens. Any omitted key falls back to the system
 * base theme derived from `prefers-color-scheme`.
 */
export type OscliDemoTheme = {
  background?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  cursor?: string;
  success?: string;
  warn?: string;
  info?: string;
  error?: string;
  accent?: string;
};

type ResolvedTheme = {
  fg: string;
  rail: string;
  accent: string;
  success: string;
  warn: string;
  info: string;
  error: string;
  muted: string;
  cursor: string;
};

const DARK_TOKENS: ResolvedTheme = {
  fg:      "#F3F1EB",
  rail:    "#333",
  accent:  "#22d3ee",
  success: "#4ade80",
  warn:    "#f59e0b",
  info:    "#60a5fa",
  error:   "#f87171",
  muted:   "#666",
  cursor:  "#F3F1EB",
};

const LIGHT_TOKENS: ResolvedTheme = {
  fg:      "#141414",
  rail:    "#bbb",
  accent:  "#0891b2",
  success: "#16a34a",
  warn:    "#d97706",
  info:    "#2563eb",
  error:   "#dc2626",
  muted:   "#999",
  cursor:  "#141414",
};

function buildThemeTokens(
  theme: "light" | "dark" | "auto" | string | OscliDemoTheme | undefined,
  prefersDark: boolean,
): ResolvedTheme {
  if (theme === "light") return LIGHT_TOKENS;
  if (theme === "dark")  return DARK_TOKENS;

  if (typeof theme === "object" && theme !== null) {
    const base = prefersDark ? DARK_TOKENS : LIGHT_TOKENS;
    return {
      fg:      theme.foreground ?? base.fg,
      rail:    theme.border     ?? base.rail,
      accent:  theme.accent     ?? base.accent,
      success: theme.success    ?? base.success,
      warn:    theme.warn       ?? base.warn,
      info:    theme.info       ?? base.info,
      error:   theme.error      ?? base.error,
      muted:   theme.muted      ?? base.muted,
      cursor:  theme.cursor     ?? base.cursor,
    };
  }

  // "auto" or an unrecognised string (e.g. a future Shiki theme name) —
  // follow the system preference. Full Shiki integration is a future concern.
  return prefersDark ? DARK_TOKENS : LIGHT_TOKENS;
}

// ─── Type inference from the CLI instance ─────────────────────────────────────

/**
 * Extracts typed prompt answers from a `createCLI()` instance.
 *
 * `cli.storage` is typed as `Partial<StorageShape<TPrompts>>`, which already
 * carries the correct value type per prompt key — so conditional inference
 * here gives accurate per-prompt types (including literal unions for selects)
 * with zero manual bookkeeping.
 */
export type DemoAnswersFromCli<TCli> =
  TCli extends { storage: infer TStorage } ? TStorage : Record<string, unknown>;

/**
 * A manual playback sequence for branch-heavy CLIs where automatic inference
 * is insufficient.
 *
 * Each step is one of:
 * - a pinned prompt answer (takes precedence over `answers`)
 * - a wait pause (ms)
 * - an informational log line to inject into the output
 *
 * Treat this as an escape hatch, not the primary authoring model.
 */
export type OscliDemoScript<TCli = unknown> = Array<
  | { prompt: keyof DemoAnswersFromCli<TCli> & string; answer: unknown }
  | { action: "wait"; ms?: number }
  | { action: "log"; level?: "info" | "warn" | "success"; message: string }
>;

// ─── Internal CLI interface ───────────────────────────────────────────────────

type AnimateEvent =
  | { type: "intro"; message: string }
  | { type: "prompt_start"; key: string; label: string; promptType: string }
  | { type: "prompt_preview"; key: string; label: string; promptType: string; lines: string[] }
  | { type: "char"; key: string; value: string; full: string }
  | { type: "prompt_submit"; key: string; label: string; displayValue: string }
  | { type: "outro"; message: string }
  | { type: "run_complete" }
  | { type: "loop_restart" }
  | { type: "spin_start"; label: string }
  | { type: "spin_complete"; label: string }
  | { type: "log_line"; level: string; message: string }
  | { type: "box_render"; title?: string; content: string }
  | { type: "success_line"; message: string };

type PromptConfig = {
  type?: string;
  label?: string;
  choices?: readonly string[];
  min?: number;
  max?: number;
  format?: string;
  confirmMode?: "toggle" | "simple";
  hasDefault?: boolean;
  defaultValue?: unknown;
};

type AnimatableCLI = {
  _promptConfigs?: Record<string, PromptConfig>;
  animate(options: {
    inputs: Record<string, unknown>;
    ignoreDefaults?: boolean;
    timing?: { typeDelay?: number; promptDelay?: number; completionDelay?: number };
  }): AsyncGenerator<AnimateEvent>;
};

// ─── Public props ─────────────────────────────────────────────────────────────

export type OscliDemoProps<TCli extends AnimatableCLI = AnimatableCLI> = {
  /**
   * The `createCLI()` instance. Single source of truth for prompt structure,
   * choices, labels, defaults, and playback metadata.
   */
  cli: TCli;

  /**
   * Animation speed preset. Influences typing delay, pause between prompts,
   * fade duration, and the pause before each replay.
   * @default "normal"
   */
  speed?: DemoSpeed;

  /**
   * Typed per-prompt answers inferred from the CLI definition.
   * Keys and value types are checked at compile time.
   * Pinned prompts stay constant across all replay runs;
   * omitted prompts are chosen randomly each run.
   *
   * @example
   * answers={{ region: "us-east-1", confirmDeploy: true }}
   */
  answers?: DemoAnswersFromCli<TCli>;

  /**
   * Controls how many times the demo replays after completing.
   * - omitted / `true` → replay infinitely
   * - `false`          → run once, then stop
   * - `number`         → run exactly that many times in total
   * @default true
   */
  replay?: boolean | number;

  /**
   * Terminal theme.
   * - `"auto"`         → follows `prefers-color-scheme` (SSR-safe)
   * - `"dark"`         → force dark mode
   * - `"light"`        → force light mode
   * - `OscliDemoTheme` → custom token object merged over the system base
   * - any other string → treated as a Shiki theme name (falls back to dark
   *                      in v1; full Shiki integration is a future addition)
   * @default "auto"
   */
  theme?: "light" | "dark" | "auto" | string | OscliDemoTheme;

  /**
   * Controls the fade-out transition between replay runs.
   * - omitted → uses the duration from the `speed` preset
   * - `false` → no fade; the demo instantly resets and starts the next run
   * - `number` → custom fade duration in ms
   */
  fade?: false | number;

  /**
   * Manual playback sequence for branch-heavy CLIs where automatic inference
   * is insufficient. Script `prompt` steps take precedence over `answers`.
   * Use this as an escape hatch, not the primary authoring model.
   */
  script?: OscliDemoScript<TCli>;

  className?: string;
  style?: React.CSSProperties;

  /**
   * Called after each completed run. `runIndex` is zero-based.
   */
  onRunComplete?: (runIndex: number) => void;
};

// ─── Internal render-line model ───────────────────────────────────────────────

type RenderLine =
  | { kind: "intro"; message: string }
  | { kind: "prompt-label"; key: string; label: string }
  | { kind: "active-text"; key: string; full: string }
  | { kind: "active-preview"; key: string; lines: string[] }
  | { kind: "summary"; key: string; label: string; displayValue: string }
  | { kind: "outro"; message: string }
  | { kind: "spin"; label: string; done: boolean }
  | { kind: "log-line"; level: string; message: string }
  | { kind: "box"; title?: string; content: string }
  | { kind: "success"; message: string };

// ─── Input generation ─────────────────────────────────────────────────────────

const TEXT_WORDS = [
  "studio-app", "orbit-kit", "northwind", "field-notes", "launchpad",
  "beacon", "velocity", "prism", "forge", "atlas", "nexus", "relay",
  "anchor", "summit", "keystone", "vector", "lattice", "catalyst",
] as const;

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickRandomSubset<T>(arr: readonly T[], min = 1, max?: number): T[] {
  const cap = Math.max(min, Math.min(max ?? 3, arr.length));
  const count = min + Math.floor(Math.random() * (cap - min + 1));
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function generateInputs(
  configs: Record<string, PromptConfig>,
  pinned: Record<string, unknown>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  for (const [key, cfg] of Object.entries(configs)) {
    if (Object.prototype.hasOwnProperty.call(pinned, key)) {
      inputs[key] = pinned[key];
      continue;
    }

    switch (cfg.type ?? "text") {
      case "text":
      case "password":
        // Never use the prompt's default — always pick a random word so the
        // demo types something visible and the animation has something to show.
        inputs[key] = pickRandom(TEXT_WORDS);
        break;

      case "select":
      case "search": {
        const choices = cfg.choices ?? [];
        // Pick randomly from all choices, excluding the first item when there
        // are multiple options so the cursor always has somewhere to travel.
        const pool = choices.length > 1 ? choices.slice(1) : choices;
        inputs[key] = pool.length > 0 ? pickRandom(pool) : undefined;
        break;
      }

      case "multiselect": {
        const choices = cfg.choices ?? [];
        inputs[key] =
          choices.length > 0
            ? pickRandomSubset(choices, 1, Math.min(choices.length, 3))
            : [];
        break;
      }

      case "list":
        inputs[key] = pickRandomSubset(TEXT_WORDS, cfg.min ?? 1, cfg.max ?? 3);
        break;

      case "confirm":
        inputs[key] = Math.random() > 0.5;
        break;

      case "number": {
        const lo = cfg.min ?? 1;
        const hi = cfg.max ?? 100;
        inputs[key] = lo + Math.floor(Math.random() * (hi - lo + 1));
        break;
      }

      case "date": {
        const d = new Date();
        d.setDate(d.getDate() + Math.floor(Math.random() * 180) + 1);
        inputs[key] = d;
        break;
      }

      default:
        inputs[key] = undefined;
        break;
    }
  }

  return inputs;
}

/**
 * Build the pinned-answer map by merging `answers` with any prompt steps
 * from `script`. Script steps win on conflict.
 */
function buildPinned(
  answers: Record<string, unknown>,
  script: OscliDemoScript<unknown> | undefined,
): Record<string, unknown> {
  const pinned = { ...answers };
  if (!script) return pinned;
  for (const step of script) {
    if ("prompt" in step && typeof step.prompt === "string") {
      pinned[step.prompt] = step.answer;
    }
  }
  return pinned;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Returns true if the loop should start another run. */
function shouldContinueReplaying(
  replay: boolean | number | undefined,
  completedRuns: number,
): boolean {
  if (replay === false) return false;
  if (replay === undefined || replay === true) return true;
  return completedRuns < replay;
}

function isPromptLine(line: RenderLine, key: string): boolean {
  return (
    "key" in line &&
    line.key === key &&
    (line.kind === "prompt-label" ||
      line.kind === "active-text" ||
      line.kind === "active-preview")
  );
}

function isPreviewPromptType(promptType: string): boolean {
  return (
    promptType === "select" ||
    promptType === "search" ||
    promptType === "multiselect" ||
    promptType === "confirm-toggle"
  );
}

// ─── System color-scheme hook (SSR-safe) ──────────────────────────────────────

function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true; // SSR default
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersDark;
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderOptionLine(
  text: string,
  icon: string,
  active: boolean,
  t: ResolvedTheme,
) {
  const selected = icon === "●" || icon === "◉";
  return (
    <>
      {active ? <span style={{ color: t.accent }}>›</span> : <span> </span>}
      <span> </span>
      <span style={{ color: selected ? t.accent : t.muted }}>{icon}</span>
      <span> </span>
      <span style={{ color: active || selected ? t.fg : t.muted }}>{text}</span>
    </>
  );
}

function renderPreviewLine(line: string, t: ResolvedTheme) {
  // Keyboard hint lines
  if (
    line.includes("↑↓") ||
    line.includes("enter select") ||
    line.includes("enter confirm") ||
    line.includes("space toggle") ||
    line.includes("type to filter")
  ) {
    return (
      <span style={{ color: t.muted, opacity: 0.55, fontSize: "0.82em" }}>
        {line}
      </span>
    );
  }

  // Confirm toggle: "● Yes  /  ○ No"
  if (line.includes(" / ") && (line.startsWith("● ") || line.startsWith("○ "))) {
    const [l, r] = line.split(" / ");
    const left = l?.trim() ?? "";
    const right = r?.trim() ?? "";
    const li = left.slice(0, 1);
    const ri = right.slice(0, 1);
    return (
      <>
        <span style={{ color: li === "●" ? t.accent : t.muted }}>{li}</span>
        <span> </span>
        <span style={{ color: li === "●" ? t.fg : t.muted }}>{left.slice(2)}</span>
        <span style={{ color: t.muted }}>{"  /  "}</span>
        <span style={{ color: ri === "●" ? t.accent : t.muted }}>{ri}</span>
        <span> </span>
        <span style={{ color: ri === "●" ? t.fg : t.muted }}>{right.slice(2)}</span>
      </>
    );
  }

  // Select / multiselect option lines: "›  ● Option" or "   ○ Option"
  if (line.startsWith("› ") || line.startsWith("  ")) {
    const active = line.startsWith("› ");
    const content = line.slice(2);
    const icon = content[0] ?? "";
    if (["●", "○", "◉"].includes(icon) && content[1] === " ") {
      return renderOptionLine(content.slice(2), icon, active, t);
    }
  }

  return <span>{line}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders an animated replay of an `oscli` CLI flow.
 *
 * Inspects the CLI definition and simulates the full interaction sequence —
 * typing, selecting, confirming, spinners, output — without executing real
 * application code. Fully dynamic and randomised by default.
 *
 * @example
 * // Minimal — fully automatic, infinite replay
 * <OscliDemo cli={cli} />
 *
 * @example
 * // Pin specific answers, run three times total
 * <OscliDemo cli={cli} answers={{ region: "us-east-1" }} replay={3} />
 */
export function OscliDemo<TCli extends AnimatableCLI = AnimatableCLI>({
  cli,
  speed = "normal",
  answers,
  replay,
  theme: themeProp = "auto",
  fade,
  script,
  className,
  style,
  onRunComplete,
}: OscliDemoProps<TCli>) {
  const prefersDark = usePrefersDark();
  const t = buildThemeTokens(themeProp, prefersDark);
  const speedConfig = SPEED_PRESETS[speed];

  // `false` = instant reset, number = custom ms, omitted = speed preset default.
  const fadeDuration = fade === false ? 0 : (fade ?? speedConfig.fadeDuration);

  const [lines, setLines] = useState<RenderLine[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Read replay and onRunComplete through refs so their changes never restart
  // the animation loop — only cli / answers / script / speed should do that.
  const replayRef = useRef(replay);
  replayRef.current = replay;

  const onRunCompleteRef = useRef(onRunComplete);
  onRunCompleteRef.current = onRunComplete;

  useEffect(() => {
    let cancelled = false;
    const hasPromptConfigs = Boolean(cli._promptConfigs);

    const pinned = buildPinned(
      (answers ?? {}) as Record<string, unknown>,
      script as OscliDemoScript<unknown> | undefined,
    );

    // completedRuns tracks total finished runs for replay-count logic.
    let completedRuns = 0;

    const run = async () => {
      while (!cancelled) {
        // Build inputs for this run. Pinned answers stay fixed every run;
        // unpinned prompts are chosen randomly from the prompt config metadata.
        const inputs =
          hasPromptConfigs && cli._promptConfigs
            ? generateInputs(cli._promptConfigs, pinned)
            : { ...pinned };

        setLines([]);
        setActiveKey(null);
        setIsFading(false);

        for await (const event of cli.animate({
          inputs,
          ignoreDefaults: true,
          timing: {
            typeDelay: speedConfig.typeDelay,
            promptDelay: speedConfig.promptDelay,
            completionDelay: 0,
          },
        })) {
          if (cancelled) return;

          switch (event.type) {
            case "intro":
              setLines((prev) => [
                ...prev,
                { kind: "intro", message: event.message },
              ]);
              break;

            case "prompt_start": {
              const isTextType = [
                "text", "password", "number", "date",
              ].includes(event.promptType);
              setActiveKey(event.key);
              setLines((prev) => {
                if (isPreviewPromptType(event.promptType)) return [...prev];
                const next: RenderLine[] = [
                  ...prev,
                  { kind: "prompt-label", key: event.key, label: event.label },
                ];
                if (isTextType) {
                  next.push({ kind: "active-text", key: event.key, full: "" });
                }
                return next;
              });
              break;
            }

            case "prompt_preview":
              setLines((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                // Replace any stale active-text or prior preview for this key
                if (
                  last &&
                  "key" in last &&
                  last.key === event.key &&
                  (last.kind === "active-text" || last.kind === "active-preview")
                ) {
                  next.pop();
                }
                // Ensure the label line precedes the preview
                const previous = next[next.length - 1];
                if (
                  !previous ||
                  !("key" in previous) ||
                  previous.key !== event.key ||
                  previous.kind !== "prompt-label"
                ) {
                  next.push({
                    kind: "prompt-label",
                    key: event.key,
                    label: event.label,
                  });
                }
                next.push({
                  kind: "active-preview",
                  key: event.key,
                  lines: event.lines,
                });
                return next;
              });
              break;

            case "char":
              setLines((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                // If a preview was showing, remove it — back to text input
                if (
                  last &&
                  "key" in last &&
                  last.key === event.key &&
                  last.kind === "active-preview"
                ) {
                  next.pop();
                }
                // Ensure there is an active-text line to update
                if (
                  !next.some(
                    (l) =>
                      "key" in l &&
                      l.key === event.key &&
                      l.kind === "active-text",
                  )
                ) {
                  next.push({ kind: "active-text", key: event.key, full: "" });
                }
                for (let i = next.length - 1; i >= 0; i--) {
                  const l = next[i]!;
                  if (l.kind === "active-text" && l.key === event.key) {
                    next[i] = { ...l, full: event.full };
                    break;
                  }
                }
                return next;
              });
              break;

            case "prompt_submit":
              setActiveKey(null);
              setLines((prev) => {
                const next = [...prev];
                // Strip all intermediate lines for this prompt
                while (
                  next.length > 0 &&
                  isPromptLine(next[next.length - 1]!, event.key)
                ) {
                  next.pop();
                }
                next.push({
                  kind: "summary",
                  key: event.key,
                  label: event.label,
                  displayValue: event.displayValue,
                });
                return next;
              });
              break;

            case "spin_start":
              setLines((prev) => [
                ...prev,
                { kind: "spin", label: event.label, done: false },
              ]);
              break;

            case "spin_complete":
              setLines((prev) => {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i--) {
                  const l = next[i]!;
                  if (l.kind === "spin" && l.label === event.label && !l.done) {
                    next[i] = { ...l, done: true };
                    break;
                  }
                }
                return next;
              });
              break;

            case "log_line":
              setLines((prev) => [
                ...prev,
                { kind: "log-line", level: event.level, message: event.message },
              ]);
              break;

            case "box_render":
              setLines((prev) => [
                ...prev,
                { kind: "box", title: event.title, content: event.content },
              ]);
              break;

            case "success_line":
              setLines((prev) => [
                ...prev,
                { kind: "success", message: event.message },
              ]);
              break;

            case "outro":
              setActiveKey(null);
              setLines((prev) => [
                ...prev,
                { kind: "outro", message: event.message },
              ]);
              break;

            case "run_complete":
              // Fire before incrementing so the callback index is zero-based
              onRunCompleteRef.current?.(completedRuns);
              break;

            case "loop_restart":
              // We manage looping externally; the internal signal is a no-op.
              break;
          }
        }

        if (cancelled) return;

        completedRuns++;

        if (!shouldContinueReplaying(replayRef.current, completedRuns)) break;

        // Pause at end-of-run before resetting
        await sleep(speedConfig.replayDelay);
        if (cancelled) return;

        // Fade out before next run (skipped entirely when fadeDuration is 0)
        if (fadeDuration > 0) {
          setIsFading(true);
          await sleep(fadeDuration);
          if (cancelled) return;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // `cli`, `answers`, `script`, and `speed` changes all warrant a fresh run.
    // `replay` and `onRunComplete` are read through refs; they never restart.
    // Note: if `answers` / `script` are defined inline rather than memoised,
    // they will trigger a restart on every parent render — wrap in useMemo if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cli, answers, script, speed]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [lines]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const hasOutro = lines.some((l) => l.kind === "outro");
  const isRunning = lines.length > 0;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <style>{"@keyframes oscli-blink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      <div
        ref={viewportRef}
        style={{
          color: t.fg,
          fontFamily: "'JetBrains Mono','Fira Code',ui-monospace,monospace",
          fontSize: "clamp(11px, 1.05vw, 13px)",
          lineHeight: 1.75,
          opacity: isFading ? 0 : 1,
          transition: fadeDuration > 0 ? `opacity ${fadeDuration}ms ease` : undefined,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          width: "100%",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {lines.map((line, i) => {
          if (line.kind === "intro") {
            return (
              <div key={`intro-${i}`}>
                <span style={{ color: t.rail }}>┌</span>
                {line.message ? <span>{`  ${line.message}`}</span> : null}
              </div>
            );
          }

          if (line.kind === "prompt-label") {
            return (
              <div key={`label-${line.key}-${i}`}>
                <span style={{ color: t.rail }}>│</span>
                <span>{`  ${line.label}`}</span>
              </div>
            );
          }

          if (line.kind === "active-text") {
            return (
              <div key={`active-${line.key}-${i}`}>
                <span style={{ color: t.rail }}>│</span>
                <span>{"  "}</span>
                <span style={{ color: t.accent }}>›</span>
                <span>{` ${line.full}`}</span>
                {activeKey === line.key ? (
                  <span
                    style={{
                      color: t.cursor,
                      animation: "oscli-blink 0.65s step-end infinite",
                    }}
                  >
                    _
                  </span>
                ) : null}
              </div>
            );
          }

          if (line.kind === "active-preview") {
            return (
              <React.Fragment key={`preview-${line.key}-${i}`}>
                {line.lines.map((pl, pi) => (
                  <div key={`pl-${line.key}-${i}-${pi}`}>
                    <span style={{ color: t.rail }}>│</span>
                    <span>{"  "}</span>
                    {renderPreviewLine(pl, t)}
                  </div>
                ))}
              </React.Fragment>
            );
          }

          if (line.kind === "summary") {
            return (
              <div key={`summary-${line.key}-${i}`}>
                <span style={{ color: t.rail }}>│</span>
                <span> </span>
                <span style={{ color: t.success }}>✓</span>
                <span>{"  "}</span>
                <span style={{ color: t.muted }}>{`${line.label}:`}</span>
                <span>{"  "}</span>
                <span>{line.displayValue}</span>
              </div>
            );
          }

          if (line.kind === "spin") {
            return (
              <div key={`spin-${i}`}>
                <span style={{ color: t.rail }}>│</span>
                <span>{" "}</span>
                {line.done ? (
                  <span style={{ color: t.success }}>✓</span>
                ) : (
                  <span
                    style={{
                      color: t.accent,
                      animation: "oscli-blink 0.8s step-end infinite",
                    }}
                  >
                    ⠋
                  </span>
                )}
                <span>{"  "}</span>
                <span style={{ color: line.done ? t.muted : t.fg }}>
                  {line.label}
                </span>
              </div>
            );
          }

          if (line.kind === "log-line") {
            const levelColor =
              line.level === "info"    ? t.info
              : line.level === "warn"  ? t.warn
              : line.level === "error" ? t.error
              : line.level === "success" ? t.success
              : t.muted;
            const levelIcon =
              line.level === "info"    ? "ℹ"
              : line.level === "warn"  ? "⚠"
              : line.level === "error" ? "✖"
              : line.level === "success" ? "✓"
              : "·";
            return (
              <div key={`log-${i}`}>
                <span style={{ color: t.rail }}>│</span>
                <span>{" "}</span>
                <span style={{ color: levelColor }}>{levelIcon}</span>
                <span>{"  "}</span>
                <span style={{ color: t.muted }}>{line.message}</span>
              </div>
            );
          }

          if (line.kind === "box") {
            const boxLines = line.content.split("\n");
            return (
              <React.Fragment key={`box-${i}`}>
                {line.title && (
                  <div>
                    <span style={{ color: t.rail }}>│</span>
                    <span>{"  "}</span>
                    <span style={{ color: t.accent }}>{line.title}</span>
                  </div>
                )}
                {boxLines.map((bl, bi) => (
                  <div key={`boxline-${i}-${bi}`}>
                    <span style={{ color: t.rail }}>│</span>
                    <span>{"  "}</span>
                    <span style={{ color: t.muted }}>{bl}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          }

          if (line.kind === "success") {
            return (
              <div key={`success-${i}`}>
                <span style={{ color: t.rail }}>│</span>
                <span> </span>
                <span style={{ color: t.success }}>✓</span>
                <span>{"  "}</span>
                <span style={{ color: t.success }}>{line.message}</span>
              </div>
            );
          }

          // outro
          return (
            <div key={`outro-${i}`}>
              <span style={{ color: t.rail }}>└</span>
              {line.message ? <span>{`  ${line.message}`}</span> : null}
            </div>
          );
        })}

        {/* Trailing box-close shown while a run is in flight (no outro yet) */}
        {isRunning && !hasOutro && (
          <div>
            <span style={{ color: t.rail }}>└</span>
          </div>
        )}
      </div>
    </div>
  );
}
