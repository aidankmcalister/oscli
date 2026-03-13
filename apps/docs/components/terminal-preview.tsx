"use client";

import { useEffect, useState, type ReactNode } from "react";

type Tone =
  | "default"
  | "border"
  | "muted"
  | "active"
  | "success"
  | "error"
  | "warning"
  | "info";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BORDER_CHARS = "┌┐└┘╭╮╰╯│├┤┬┴┼─";
const BAR_FILL_CHARS = "#█▓▒░⣿⣀";

function toneClass(tone: Tone): string {
  switch (tone) {
    case "border":
      return "oscli-terminal-border";
    case "muted":
      return "oscli-terminal-muted";
    case "active":
      return "oscli-terminal-active";
    case "success":
      return "oscli-terminal-success";
    case "error":
      return "oscli-terminal-error";
    case "warning":
      return "oscli-terminal-warning";
    case "info":
      return "oscli-terminal-info";
    default:
      return "";
  }
}

function SpinnerGlyph() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFrame((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => window.clearInterval(id);
  }, []);

  return <span className={toneClass("active")}>{SPINNER_FRAMES[frame]}</span>;
}

function symbolTone(char: string): Tone {
  if (BORDER_CHARS.includes(char)) return "border";
  if (char === "›" || char === "●" || char === "◉") return "active";
  if (char === "○") return "muted";
  if (char === "✓") return "success";
  if (char === "✗") return "error";
  if (char === "⚠") return "warning";
  if (char === "ℹ") return "info";
  return "default";
}

function renderPlainText(line: string): ReactNode[] {
  const output: ReactNode[] = [];
  let buffer = "";

  const pushBuffer = () => {
    if (buffer.length > 0) {
      output.push(<span key={`text-${output.length}`}>{buffer}</span>);
      buffer = "";
    }
  };

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (SPINNER_FRAMES.includes(char)) {
      pushBuffer();
      output.push(<SpinnerGlyph key={`spinner-${output.length}`} />);
      continue;
    }

    const tone = symbolTone(char);
    if (tone !== "default") {
      pushBuffer();
      output.push(
        <span key={`${tone}-${output.length}`} className={toneClass(tone)}>
          {char}
        </span>,
      );
      continue;
    }

    buffer += char;
  }

  pushBuffer();
  return output;
}

function renderBar(bar: string, tone: Tone): ReactNode[] {
  const output: ReactNode[] = [];

  for (const char of bar) {
    if (char === "[" || char === "]") {
      output.push(
        <span key={`bar-border-${output.length}`} className={toneClass("border")}>
          {char}
        </span>,
      );
      continue;
    }

    if (BAR_FILL_CHARS.includes(char) && char !== "-") {
      output.push(
        <span key={`bar-fill-${output.length}`} className={toneClass(tone)}>
          {char}
        </span>,
      );
      continue;
    }

    if (char === "-") {
      output.push(
        <span key={`bar-empty-${output.length}`} className={toneClass("muted")}>
          {char}
        </span>,
      );
      continue;
    }

    output.push(<span key={`bar-text-${output.length}`}>{char}</span>);
  }

  return output;
}

function renderStatusLine(
  railPrefix: string,
  icon: string,
  rest: string,
  tone: Tone,
): ReactNode[] {
  const progressMatch = rest.match(
    /^(.*?)(\[[#\-\u2588\u2593\u2592\u2591\u28FF\u28C0]+\])(\s+)(\[\d{2}:\d{2}\])(\s+)(\d+%)$/,
  );
  const spinnerMatch = rest.match(/^(.*?)(\s+)(\d+(?:\.\d)?s|\d+m \d{2}s)$/);
  const output: ReactNode[] = [];

  if (railPrefix.length > 0) {
    output.push(...renderPlainText(railPrefix));
  }

  if (SPINNER_FRAMES.includes(icon)) {
    output.push(<SpinnerGlyph key="status-spinner" />);
  } else {
    output.push(
      <span key="status-icon" className={toneClass(tone)}>
        {icon}
      </span>,
    );
  }

  output.push(<span key="status-gap"> </span>);

  if (progressMatch) {
    const [, label, bar, gapBeforeTimer, timer, gapBeforePercent, percent] =
      progressMatch;

    output.push(<span key="status-label">{label}</span>);
    output.push(...renderBar(bar, tone));
    output.push(<span key="timer-gap">{gapBeforeTimer}</span>);
    output.push(
      <span key="timer" className={toneClass("muted")}>
        {timer}
      </span>,
    );
    output.push(<span key="percent-gap">{gapBeforePercent}</span>);
    output.push(<span key="percent">{percent}</span>);
    return output;
  }

  if (spinnerMatch) {
    const [, label, gap, duration] = spinnerMatch;
    output.push(<span key="spinner-label">{label}</span>);
    output.push(<span key="spinner-gap">{gap}</span>);
    output.push(
      <span key="spinner-duration" className={toneClass("muted")}>
        {duration}
      </span>,
    );
    return output;
  }

  output.push(<span key="status-rest">{rest}</span>);
  return output;
}

function renderLine(line: string): ReactNode[] {
  const statusMatch = line.match(
    /^(\s*(?:[│ ]\s*)?)([⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏✓✗]) (.*)$/,
  );
  const diffMatch = line.match(/^(\s*(?:│\s{2})?)([+-]) (.*)$/);

  if (diffMatch) {
    const [, prefix, marker, text] = diffMatch;
    const tone = marker === "+" ? "success" : "error";

    return [
      ...renderPlainText(prefix),
      <span key="diff-line" className={toneClass(tone)}>
        {`${marker} ${text}`}
      </span>,
    ];
  }

  if (statusMatch) {
    const [, prefix, icon, rest] = statusMatch;
    const tone =
      icon === "✓"
        ? "success"
        : icon === "✗"
          ? "error"
          : "active";

    return renderStatusLine(prefix, icon, rest, tone);
  }

  return renderPlainText(line);
}

export function TerminalPreview({
  code,
  title,
}: {
  code: string;
  title?: string;
}) {
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className="not-prose my-4">
      <div className="oscli-terminal-frame">
        {title ? <div className="oscli-terminal-header">{title}</div> : null}
        <div className="oscli-terminal-body">
          {lines.map((line, index) => (
            <div key={`${index}-${line}`} className="oscli-terminal-line">
              {line.length > 0 ? renderLine(line) : <span>&nbsp;</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
