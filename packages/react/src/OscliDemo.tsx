/** @jsxRuntime classic */
"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

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
  bg: string;
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
    bg: "transparent",
    fg: "#F3F1EB",
    rail: "#333",
    accent: "#22d3ee",
    success: "#4ade80",
    muted: "#666",
  },
  light: {
    bg: "transparent",
    fg: "#141414",
    rail: "#ccc",
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
  const cap = max ?? Math.min(arr.length, 3);
  const count = min + Math.floor(Math.random() * (cap - min + 1));
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.max(min, count));
}

function generateInputsFromConfigs(
  configs: Record<string, PromptConfig>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  for (const [key, cfg] of Object.entries(configs)) {
    const type = cfg.type ?? "text";

    switch (type) {
      case "text":
      case "password": {
        if (cfg.hasDefault && cfg.defaultValue !== undefined) {
          // ~40% chance to use a random word instead of default
          inputs[key] = Math.random() > 0.4 ? pickRandom(TEXT_WORDS) : String(cfg.defaultValue);
        } else {
          inputs[key] = pickRandom(TEXT_WORDS);
        }
        break;
      }

      case "select":
      case "search": {
        const choices = cfg.choices ?? [];
        if (choices.length > 0) {
          inputs[key] = pickRandom(choices);
        } else if (cfg.hasDefault) {
          inputs[key] = cfg.defaultValue;
        }
        break;
      }

      case "multiselect": {
        const choices = cfg.choices ?? [];
        if (choices.length > 0) {
          inputs[key] = pickRandomSubset(choices, 1, Math.min(choices.length, 3));
        }
        break;
      }

      case "list": {
        const words = pickRandomSubset(TEXT_WORDS, cfg.min ?? 1, cfg.max ?? 3);
        inputs[key] = words;
        break;
      }

      case "confirm": {
        inputs[key] = Math.random() > 0.35;
        break;
      }

      case "number": {
        const lo = cfg.min ?? 1;
        const hi = cfg.max ?? 100;
        inputs[key] = lo + Math.floor(Math.random() * (hi - lo + 1));
        break;
      }

      case "date": {
        const now = new Date();
        const offset = Math.floor(Math.random() * 180) + 1;
        const future = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
        inputs[key] = future;
        break;
      }

      default:
        if (cfg.hasDefault && cfg.defaultValue !== undefined) {
          inputs[key] = cfg.defaultValue;
        }
    }
  }

  return inputs;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function renderOptionLine(
  optionText: string,
  icon: string,
  active: boolean,
  tokens: ThemeTokens,
) {
  const isSelected = icon === "●" || icon === "◉";
  const iconColor = isSelected ? tokens.accent : tokens.muted;
  const textColor = active || isSelected ? tokens.fg : tokens.muted;

  return (
    <>
      {active ? (
        <span style={{ color: tokens.accent }}>›</span>
      ) : (
        <span>{" "}</span>
      )}
      <span>{" "}</span>
      <span style={{ color: iconColor }}>{icon}</span>
      <span>{" "}</span>
      <span style={{ color: textColor }}>{optionText}</span>
    </>
  );
}

function renderPreviewContent(line: string, tokens: ThemeTokens) {
  if (
    line.includes("↑↓") ||
    line.includes("enter select") ||
    line.includes("enter confirm") ||
    line.includes("space toggle") ||
    line.includes("type to filter")
  ) {
    return (
      <span style={{ color: tokens.muted, opacity: 0.6, fontSize: "0.85em" }}>
        {line}
      </span>
    );
  }

  if (
    line.includes(" / ") &&
    (line.startsWith("● ") || line.startsWith("○ "))
  ) {
    const [left, right] = line.split(" / ");
    const leftIcon = left!.slice(0, 1);
    const leftText = left!.slice(2);
    const rightIcon = right!.slice(0, 1);
    const rightText = right!.slice(2);

    return (
      <>
        <span
          style={{ color: leftIcon === "●" ? tokens.accent : tokens.muted }}
        >
          {leftIcon}
        </span>
        <span>{" "}</span>
        <span
          style={{ color: leftIcon === "●" ? tokens.fg : tokens.muted }}
        >
          {leftText}
        </span>
        <span style={{ color: tokens.muted }}>{" / "}</span>
        <span
          style={{ color: rightIcon === "●" ? tokens.accent : tokens.muted }}
        >
          {rightIcon}
        </span>
        <span>{" "}</span>
        <span
          style={{ color: rightIcon === "●" ? tokens.fg : tokens.muted }}
        >
          {rightText}
        </span>
      </>
    );
  }

  if (line.startsWith("› ") || line.startsWith("  ")) {
    const active = line.startsWith("› ");
    const content = line.slice(2);
    const icon = content.slice(0, 1);

    if (["●", "○", "◉"].includes(icon) && content.slice(1, 2) === " ") {
      return renderOptionLine(content.slice(2), icon, active, tokens);
    }
  }

  return <span>{line}</span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface OscliDemoProps {
  cli: AnimatableCLI;
  /** Override inputs instead of auto-generating them from prompt configs. */
  inputs?: Record<string, unknown>;
  timing?: DemoTiming;
  theme?: ThemeName;
  onRunComplete?: () => void;
  /** Delay in ms before auto-replaying after a run completes. Default 3000. */
  replayDelay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function OscliDemo({
  cli,
  inputs: inputsProp,
  timing,
  theme = "dark",
  onRunComplete,
  replayDelay = 3000,
  className,
  style,
}: OscliDemoProps) {
  const tokens = themes[theme];
  const [lines, setLines] = useState<RenderLine[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [runId, setRunId] = useState(0);
  const cancelRef = useRef(false);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive inputs: use prop if provided, otherwise auto-generate
  const derivedInputs = React.useMemo(() => {
    if (inputsProp) return inputsProp;
    if (cli._promptConfigs) {
      return generateInputsFromConfigs(cli._promptConfigs);
    }
    return {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsProp, runId, cli]);

  useEffect(() => {
    cancelRef.current = false;

    const run = async () => {
      setLines([]);
      setActiveKey(null);
      setIsFading(false);

      for await (const event of cli.animate({
        inputs: derivedInputs,
        timing,
      })) {
        if (cancelRef.current) break;

        if (event.type === "intro") {
          setLines((cur) => [
            ...cur,
            { kind: "intro", message: event.message },
          ]);
          continue;
        }

        if (event.type === "prompt_start") {
          setActiveKey(event.key);
          setLines((cur) => [
            ...cur,
            { kind: "prompt-label", key: event.key, label: event.label },
          ]);
          continue;
        }

        if (event.type === "prompt_preview") {
          setLines((cur) => {
            const next = [...cur];
            const last = next[next.length - 1];
            if (
              last &&
              "key" in last &&
              last.key === event.key &&
              (last.kind === "active-text" || last.kind === "active-preview")
            ) {
              next.pop();
            }
            next.push({
              kind: "active-preview",
              key: event.key,
              lines: event.lines,
            });
            return next;
          });
          continue;
        }

        if (event.type === "char") {
          setLines((cur) => {
            const next = [...cur];
            const last = next[next.length - 1];

            if (
              last &&
              "key" in last &&
              last.key === event.key &&
              last.kind === "active-preview"
            ) {
              next.pop();
            }

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
          continue;
        }

        if (event.type === "prompt_submit") {
          setActiveKey(null);
          setLines((cur) => {
            const next = [...cur];
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
          continue;
        }

        if (event.type === "outro") {
          setActiveKey(null);
          setLines((cur) => [
            ...cur,
            { kind: "outro", message: event.message },
          ]);
          continue;
        }

        if (event.type === "run_complete") {
          onRunComplete?.();

          // Schedule auto-replay with fresh random inputs
          if (!inputsProp && cli._promptConfigs) {
            replayTimerRef.current = setTimeout(() => {
              if (!cancelRef.current) {
                setIsFading(true);
                setTimeout(() => {
                  if (!cancelRef.current) {
                    setRunId((id) => id + 1);
                  }
                }, 350);
              }
            }, replayDelay);
          }
          continue;
        }

        if (event.type === "loop_restart") {
          setIsFading(true);
          await sleep(300);
          if (cancelRef.current) break;
          setLines([]);
          setActiveKey(null);
          setIsFading(false);
        }
      }
    };

    void run();

    return () => {
      cancelRef.current = true;
      if (replayTimerRef.current !== null) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [cli, derivedInputs, onRunComplete, replayDelay, timing, inputsProp]);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <style>
        {"@keyframes oscli-blink{0%,100%{opacity:1}50%{opacity:0}}"}
        {"@keyframes oscli-fade-in{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}"}
      </style>
      <div
        style={{
          background: tokens.bg,
          color: tokens.fg,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
          fontSize: "clamp(11px, 1.1vw, 13px)",
          lineHeight: 1.7,
          opacity: isFading ? 0 : 1,
          transition: "opacity 350ms ease",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          width: "100%",
        }}
      >
        {lines.map((line, index) => {
          if (line.kind === "intro") {
            return (
              <div
                key={`intro-${index}`}
                style={{
                  animation: "oscli-fade-in 180ms ease both",
                  animationDelay: `${index * 20}ms`,
                }}
              >
                <span style={{ color: tokens.rail }}>┌</span>
                {line.message ? (
                  <span>{`  ${line.message}`}</span>
                ) : null}
              </div>
            );
          }

          if (line.kind === "prompt-label") {
            return (
              <div
                key={`label-${line.key}-${index}`}
                style={{
                  animation: "oscli-fade-in 180ms ease both",
                }}
              >
                <span style={{ color: tokens.rail }}>│</span>
                <span>{`  ${line.label}`}</span>
              </div>
            );
          }

          if (line.kind === "active-text") {
            return (
              <div key={`active-${line.key}-${index}`}>
                <span style={{ color: tokens.rail }}>│</span>
                <span>{"  "}</span>
                <span style={{ color: tokens.accent }}>›</span>
                <span>{` ${line.full}`}</span>
                {activeKey === line.key ? (
                  <span
                    style={{
                      color: tokens.accent,
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
              <React.Fragment key={`preview-${line.key}-${index}`}>
                {line.lines.map((previewLine, pi) => (
                  <div key={`preview-${line.key}-${index}-${pi}`}>
                    <span style={{ color: tokens.rail }}>│</span>
                    <span>{"  "}</span>
                    {renderPreviewContent(previewLine, tokens)}
                  </div>
                ))}
              </React.Fragment>
            );
          }

          if (line.kind === "summary") {
            return (
              <div
                key={`summary-${line.key}-${index}`}
                style={{
                  animation: "oscli-fade-in 160ms ease both",
                }}
              >
                <span style={{ color: tokens.rail }}>│</span>
                <span>{" "}</span>
                <span style={{ color: tokens.success }}>✓</span>
                <span>{"  "}</span>
                <span style={{ color: tokens.muted }}>{`${line.label}:`}</span>
                <span>{"  "}</span>
                <span>{line.displayValue}</span>
              </div>
            );
          }

          // outro
          return (
            <div
              key={`outro-${index}`}
              style={{
                animation: "oscli-fade-in 200ms ease both",
              }}
            >
              <span style={{ color: tokens.rail }}>└</span>
              {line.message ? <span>{`  ${line.message}`}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
