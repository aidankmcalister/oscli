/** @jsxRuntime classic */
"use client";

import * as React from "react";
import { useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type AnimateEvent =
  | { type: "intro"; message: string }
  | { type: "prompt_start"; key: string; label: string; promptType: string }
  | {
      type: "prompt_preview";
      key: string;
      label: string;
      promptType: string;
      lines: string[];
    }
  | { type: "char"; key: string; value: string; full: string }
  | {
      type: "prompt_submit";
      key: string;
      label: string;
      displayValue: string;
    }
  | { type: "outro"; message: string }
  | { type: "run_complete" }
  | { type: "loop_restart" };

type DemoTiming = {
  typeDelay?: number;
  promptDelay?: number;
  completionDelay?: number;
  loop?: boolean;
  loopDelay?: number;
};

/** Convenience speed presets. If `timing` is also provided, its values take precedence. */
export type DemoSpeed = "slow" | "normal" | "fast";

const SPEED_PRESETS: Record<DemoSpeed, Required<Pick<DemoTiming, "typeDelay" | "promptDelay" | "completionDelay">>> = {
  slow:   { typeDelay: 160, promptDelay: 1100, completionDelay: 0 },
  normal: { typeDelay: 85,  promptDelay: 700,  completionDelay: 0 },
  fast:   { typeDelay: 30,  promptDelay: 240,  completionDelay: 0 },
};

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
    timing?: DemoTiming;
  }): AsyncGenerator<AnimateEvent>;
};

type ThemeName = "dark" | "light";

type ThemeTokens = {
  fg: string;
  rail: string;
  accent: string;
  success: string;
  muted: string;
};

type RenderLine =
  | { kind: "intro"; message: string }
  | { kind: "prompt-label"; key: string; label: string }
  | { kind: "active-text"; key: string; full: string }
  | { kind: "active-preview"; key: string; lines: string[] }
  | { kind: "summary"; key: string; label: string; displayValue: string }
  | { kind: "outro"; message: string };

// ─── Theme ───────────────────────────────────────────────────────────────────

const themes: Record<ThemeName, ThemeTokens> = {
  dark: {
    fg: "#F3F1EB",
    rail: "#333",
    accent: "#22d3ee",
    success: "#4ade80",
    muted: "#666",
  },
  light: {
    fg: "#141414",
    rail: "#bbb",
    accent: "#0891b2",
    success: "#16a34a",
    muted: "#999",
  },
};

// ─── Random input generation ──────────────────────────────────────────────────

const TEXT_WORDS = [
  "studio-app", "orbit-kit", "northwind", "field-notes", "launchpad",
  "beacon", "velocity", "prism", "forge", "atlas", "nexus", "relay",
  "anchor", "summit", "keystone", "vector", "lattice", "catalyst",
];

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
  forced: Record<string, unknown> = {},
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  for (const [key, cfg] of Object.entries(configs)) {
    // Forced answers always win
    if (Object.prototype.hasOwnProperty.call(forced, key)) {
      inputs[key] = forced[key];
      continue;
    }

    switch (cfg.type ?? "text") {
      case "text":
      case "password":
        inputs[key] =
          cfg.hasDefault && cfg.defaultValue !== undefined && Math.random() < 0.4
            ? String(cfg.defaultValue)
            : pickRandom(TEXT_WORDS);
        break;

      case "select":
      case "search": {
        const choices = cfg.choices ?? [];
        if (choices.length > 0) inputs[key] = pickRandom(choices);
        else if (cfg.hasDefault) inputs[key] = cfg.defaultValue;
        break;
      }

      case "multiselect": {
        const choices = cfg.choices ?? [];
        if (choices.length > 0)
          inputs[key] = pickRandomSubset(choices, 1, Math.min(choices.length, 3));
        break;
      }

      case "list":
        inputs[key] = pickRandomSubset(TEXT_WORDS, cfg.min ?? 1, cfg.max ?? 3);
        break;

      case "confirm":
        inputs[key] = Math.random() > 0.35;
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
        if (cfg.hasDefault && cfg.defaultValue !== undefined)
          inputs[key] = cfg.defaultValue;
    }
  }

  return inputs;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveTiming(speed?: DemoSpeed, timing?: DemoTiming): DemoTiming {
  const preset = speed ? SPEED_PRESETS[speed] : SPEED_PRESETS.normal;
  return { ...preset, ...timing };
}

function resolveFadeDuration(fade: boolean | number | undefined): number {
  if (fade === false) return 0;
  if (typeof fade === "number") return fade;
  return 340; // default
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

function renderOptionLine(text: string, icon: string, active: boolean, t: ThemeTokens) {
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

function renderPreviewLine(line: string, t: ThemeTokens) {
  if (
    line.includes("↑↓") ||
    line.includes("enter select") ||
    line.includes("enter confirm") ||
    line.includes("space toggle") ||
    line.includes("type to filter")
  ) {
    return <span style={{ color: t.muted, opacity: 0.55, fontSize: "0.82em" }}>{line}</span>;
  }

  if (line.includes(" / ") && (line.startsWith("● ") || line.startsWith("○ "))) {
    const [l, r] = line.split(" / ");
    const li = l!.slice(0, 1);
    const ri = r!.slice(0, 1);
    return (
      <>
        <span style={{ color: li === "●" ? t.accent : t.muted }}>{li}</span>
        <span> </span>
        <span style={{ color: li === "●" ? t.fg : t.muted }}>{l!.slice(2)}</span>
        <span style={{ color: t.muted }}>{"  /  "}</span>
        <span style={{ color: ri === "●" ? t.accent : t.muted }}>{ri}</span>
        <span> </span>
        <span style={{ color: ri === "●" ? t.fg : t.muted }}>{r!.slice(2)}</span>
      </>
    );
  }

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

// ─── Component ───────────────────────────────────────────────────────────────

export interface OscliDemoProps {
  cli: AnimatableCLI;

  /**
   * Animation speed preset. Controls typing speed, pause between prompts,
   * and pause after submission. Overridden by individual `timing` values.
   * @default "normal"
   */
  speed?: DemoSpeed;

  /**
   * Fine-grained timing control. Values here override the selected `speed` preset.
   */
  timing?: DemoTiming;

  /**
   * Force specific prompt answers. Keys match prompt names defined in `createCLI`.
   * Forced answers persist across auto-replay runs. Other prompts are still
   * auto-generated randomly each run.
   *
   * @example
   * forcedAnswers={{ project: "my-app", framework: "next" }}
   */
  forcedAnswers?: Record<string, unknown>;

  /**
   * Provide fixed inputs for every prompt. Disables auto-generation and auto-replay.
   * Use `forcedAnswers` instead if you only want to pin certain prompts.
   */
  inputs?: Record<string, unknown>;

  /**
   * Controls the fade transition between replay runs.
   * - `true` (default): 340ms fade
   * - `false`: instant clear, no fade
   * - `number`: custom fade duration in ms
   */
  fade?: boolean | number;

  theme?: "dark" | "light";
  onRunComplete?: () => void;

  /** Delay in ms before auto-replaying (default 3000). Ignored when `inputs` is set. */
  replayDelay?: number;

  className?: string;
  style?: React.CSSProperties;
}

export function OscliDemo({
  cli,
  speed,
  timing,
  forcedAnswers,
  inputs: inputsProp,
  fade = true,
  theme = "dark",
  onRunComplete,
  replayDelay = 3000,
  className,
  style,
}: OscliDemoProps) {
  const t = themes[theme];
  const [lines, setLines] = useState<RenderLine[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);

  const fadeDuration = resolveFadeDuration(fade);
  const resolvedTiming = resolveTiming(speed, timing);

  useEffect(() => {
    let cancelled = false;
    const autoReplay = !inputsProp && Boolean(cli._promptConfigs);

    const run = async () => {
      let currentInputs =
        inputsProp ??
        (cli._promptConfigs
          ? generateInputs(cli._promptConfigs, forcedAnswers ?? {})
          : {});

      while (!cancelled) {
        setLines([]);
        setActiveKey(null);
        setIsFading(false);

        for await (const event of cli.animate({ inputs: currentInputs, timing: resolvedTiming })) {
          if (cancelled) break;

          if (event.type === "intro") {
            setLines((prev) => [...prev, { kind: "intro", message: event.message }]);
            continue;
          }

          if (event.type === "prompt_start") {
            setActiveKey(event.key);
            const isTextType = ["text", "password", "number", "date"].includes(event.promptType);
            setLines((prev) => {
              const next = [...prev, { kind: "prompt-label" as const, key: event.key, label: event.label }];
              if (isTextType) {
                next.push({ kind: "active-text" as const, key: event.key, full: "" });
              }
              return next;
            });
            continue;
          }

          if (event.type === "prompt_preview") {
            setLines((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (
                last &&
                "key" in last &&
                last.key === event.key &&
                (last.kind === "active-text" || last.kind === "active-preview")
              ) {
                next.pop();
              }
              next.push({ kind: "active-preview", key: event.key, lines: event.lines });
              return next;
            });
            continue;
          }

          if (event.type === "char") {
            setLines((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (
                last &&
                "key" in last &&
                last.key === event.key &&
                last.kind === "active-preview"
              ) {
                next.pop();
              }
              if (!next.some((l) => "key" in l && l.key === event.key && l.kind === "active-text")) {
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
            continue;
          }

          if (event.type === "prompt_submit") {
            setActiveKey(null);
            setLines((prev) => {
              const next = [...prev];
              while (next.length > 0 && isPromptLine(next[next.length - 1]!, event.key)) {
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
            continue;
          }

          if (event.type === "outro") {
            setActiveKey(null);
            setLines((prev) => [...prev, { kind: "outro", message: event.message }]);
            continue;
          }

          if (event.type === "run_complete") {
            onRunComplete?.();
            continue;
          }

          if (event.type === "loop_restart") {
            if (fadeDuration > 0) {
              setIsFading(true);
              await sleep(fadeDuration);
              if (cancelled) break;
            }
            setLines([]);
            setActiveKey(null);
            setIsFading(false);
          }
        }

        if (cancelled || !autoReplay) break;

        // Pause before replay
        await sleep(replayDelay);
        if (cancelled) break;

        // Fade out
        if (fadeDuration > 0) {
          setIsFading(true);
          await sleep(fadeDuration);
          if (cancelled) break;
        }

        // New random inputs for next run (forced answers still applied)
        currentInputs = generateInputs(cli._promptConfigs!, forcedAnswers ?? {});
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  // cli and inputsProp identity changes are the intentional triggers for restarts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cli, inputsProp]);

  return (
    <div className={className} style={{ width: "100%", height: "100%", ...style }}>
      <style>{"@keyframes oscli-blink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      <div
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
                  <span style={{ color: t.accent, animation: "oscli-blink 0.65s step-end infinite" }}>
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

          // outro
          return (
            <div key={`outro-${i}`}>
              <span style={{ color: t.rail }}>└</span>
              {line.message ? <span>{`  ${line.message}`}</span> : null}
            </div>
          );
        })}
        {!lines.some((l) => l.kind === "outro") && lines.length > 0 && (
          <div>
            <span style={{ color: t.rail }}>└</span>
          </div>
        )}
      </div>
    </div>
  );
}
