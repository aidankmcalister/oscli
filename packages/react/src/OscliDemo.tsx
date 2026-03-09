/** @jsxRuntime classic */
"use client";

import * as React from "react";
import { useEffect, useState } from "react";

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

type AnimatableCLI<TInputs extends Record<string, unknown>> = {
  animate(options: {
    inputs: Partial<TInputs>;
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

const themes: Record<ThemeName, ThemeTokens> = {
  dark: {
    bg: "#0f0f0f",
    fg: "#F3F1EB",
    rail: "#333",
    accent: "#22d3ee",
    success: "#4ade80",
    muted: "#666",
  },
  light: {
    bg: "#f9f9f7",
    fg: "#141414",
    rail: "#ccc",
    accent: "#0891b2",
    success: "#16a34a",
    muted: "#999",
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isPromptLine(line: RenderLine, key: string): boolean {
  return (
    ("key" in line && line.key === key) &&
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
      {active ? <span style={{ color: tokens.accent }}>›</span> : <span>{" "}</span>}
      <span>{" "}</span>
      <span style={{ color: iconColor }}>{icon}</span>
      <span>{` `}</span>
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
      <span style={{ color: tokens.muted, opacity: 0.7 }}>
        {line}
      </span>
    );
  }

  if (line.includes(" / ") && (line.startsWith("● ") || line.startsWith("○ "))) {
    const [left, right] = line.split(" / ");
    const leftIcon = left.slice(0, 1);
    const leftText = left.slice(2);
    const rightIcon = right.slice(0, 1);
    const rightText = right.slice(2);

    return (
      <>
        <span style={{ color: leftIcon === "●" ? tokens.accent : tokens.muted }}>
          {leftIcon}
        </span>
        <span>{` `}</span>
        <span style={{ color: leftIcon === "●" ? tokens.fg : tokens.muted }}>
          {leftText}
        </span>
        <span style={{ color: tokens.muted }}>{`  /  `}</span>
        <span style={{ color: rightIcon === "●" ? tokens.accent : tokens.muted }}>
          {rightIcon}
        </span>
        <span>{` `}</span>
        <span style={{ color: rightIcon === "●" ? tokens.fg : tokens.muted }}>
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

export interface OscliDemoProps<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
> {
  cli: AnimatableCLI<TInputs>;
  inputs: Partial<TInputs>;
  timing?: DemoTiming;
  theme?: ThemeName;
  onRunComplete?: () => void;
}

export function OscliDemo<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
>({
  cli,
  inputs,
  timing,
  theme = "dark",
  onRunComplete,
}: OscliDemoProps<TInputs>) {
  const tokens = themes[theme];
  const [lines, setLines] = useState<RenderLine[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [replayTick, setReplayTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLines([]);
      setActiveKey(null);
      setIsComplete(false);
      setIsFading(false);

      for await (const event of cli.animate({
        inputs,
        timing,
      })) {
        if (cancelled) {
          break;
        }

        if (event.type === "intro") {
          setLines((current) => [...current, { kind: "intro", message: event.message }]);
          continue;
        }

        if (event.type === "prompt_start") {
          setActiveKey(event.key);
          setLines((current) => [
            ...current,
            { kind: "prompt-label", key: event.key, label: event.label },
          ]);
          continue;
        }

        if (event.type === "prompt_preview") {
          setLines((current) => {
            const next = [...current];
            const lastLine = next[next.length - 1];
            if (
              lastLine &&
              "key" in lastLine &&
              lastLine.key === event.key &&
              (lastLine.kind === "active-text" || lastLine.kind === "active-preview")
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
          setLines((current) => {
            const next = [...current];

            const lastLine = next[next.length - 1];
            if (
              lastLine &&
              "key" in lastLine &&
              lastLine.key === event.key &&
              lastLine.kind === "active-preview"
            ) {
              next.pop();
            }

            if (
              !next.some(
                (line) => "key" in line && line.key === event.key && line.kind === "active-text",
              )
            ) {
              next.push({ kind: "active-text", key: event.key, full: "" });
            }

            for (let index = next.length - 1; index >= 0; index -= 1) {
              const line = next[index];
              if (line.kind === "active-text" && line.key === event.key) {
                next[index] = { ...line, full: event.full };
                break;
              }
            }
            return next;
          });
          continue;
        }

        if (event.type === "prompt_submit") {
          setActiveKey(null);
          setLines((current) => {
            const next = [...current];
            while (
              next.length > 0 &&
              isPromptLine(next[next.length - 1] as RenderLine, event.key)
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
          setLines((current) => [...current, { kind: "outro", message: event.message }]);
          continue;
        }

        if (event.type === "run_complete") {
          setIsComplete(true);
          onRunComplete?.();
          continue;
        }

        if (event.type === "loop_restart") {
          setIsComplete(false);
          setIsFading(true);
          await sleep(300);
          if (cancelled) {
            break;
          }
          setLines([]);
          setActiveKey(null);
          setIsFading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [cli, inputs, onRunComplete, replayTick, timing]);

  return (
    <div style={{ width: "100%" }}>
      <style>{"@keyframes oscli-blink{0%,100%{opacity:1}50%{opacity:0}}"}</style>
      <div
        style={{
          background: "transparent",
          color: tokens.fg,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          lineHeight: 1.7,
          opacity: isFading ? 0 : 1,
          transition: "opacity 300ms ease",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {lines.map((line, index) => {
          if (line.kind === "intro") {
            return (
              <div key={`intro-${index}`}>
                <span style={{ color: tokens.rail }}>┌</span>
                {line.message ? <span>{`  ${line.message}`}</span> : null}
              </div>
            );
          }

          if (line.kind === "prompt-label") {
            return (
              <div key={`label-${line.key}-${index}`}>
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
                      animation: "oscli-blink 0.7s step-end infinite",
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
                {line.lines.map((previewLine, previewIndex) => (
                  <div key={`preview-${line.key}-${index}-${previewIndex}`}>
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
              <div key={`summary-${line.key}-${index}`}>
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

          return (
            <div key={`outro-${index}`}>
              <span style={{ color: tokens.rail }}>└</span>
              {line.message ? <span>{`  ${line.message}`}</span> : null}
            </div>
          );
        })}
      </div>
      {!timing?.loop && !onRunComplete && isComplete ? (
        <button
          type="button"
          onClick={() => setReplayTick((value) => value + 1)}
          style={{
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: `1px solid ${tokens.rail}`,
            borderRadius: 999,
            background: "transparent",
            color: tokens.muted,
            padding: "6px 10px",
            fontFamily: "inherit",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Replay
        </button>
      ) : null}
    </div>
  );
}
