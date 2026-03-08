import readline from "node:readline";

export const SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;

export type ProgressStyle =
  | "line"
  | "steps"
  | "braille"
  | "block"
  | "gradient"
  | "hash";

type GroupItem = {
  label: string;
  steps?: readonly string[];
};

export type ProgressGroupContext = {
  style: ProgressStyle;
  labelWidth: number;
  trackWidth: number;
  barWidth: number;
  timerWidth: number;
  tailWidth: number;
};

export type ProgressRenderOptions = {
  style?: ProgressStyle;
  width?: number;
  context?: ProgressGroupContext;
};

type ProgressLineState = {
  icon: string;
  label: string;
  elapsedMs: number;
  percent?: number;
  steps?: readonly string[];
  currentStepIndex?: number;
  context: ProgressGroupContext;
};

const DEFAULT_STYLE: ProgressStyle = "hash";
const DEFAULT_TRACK_WIDTH = 20;
const MIN_TRACK_WIDTH = 8;
const TIMER_WIDTH = 7; // [MM:SS]
const PERCENT_WIDTH = 4; // 100%,  60%,  10%

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatTimer(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPercent(percent: number): string {
  return `${clampPercent(percent)}%`.padStart(PERCENT_WIDTH, " ");
}

function buildStepsBar(
  steps: readonly string[],
  currentStepIndex: number,
): string {
  if (steps.length === 0) return "";
  const current = Math.max(0, Math.min(currentStepIndex, steps.length - 1));

  const past = steps.slice(0, current).join(" ▶ ");
  const active = `[${steps[current]}]`;
  const future = steps
    .slice(current + 1)
    .map((step) => `▷ ${step}`)
    .join(" ");

  return [past, active, future].filter(Boolean).join(past ? " ▶ " : " ");
}

function buildPercentBar(
  style: ProgressStyle,
  percent: number,
  width: number,
): string {
  const filled = Math.round((clampPercent(percent) / 100) * width);
  const empty = Math.max(0, width - filled);

  if (style === "line") {
    if (filled <= 0) return " ".repeat(width);
    if (filled >= width) return "━".repeat(width);
    return `${"━".repeat(Math.max(0, filled - 1))}╸${" ".repeat(empty)}`;
  }

  if (style === "braille") {
    return `[${"⣿".repeat(filled)}${"⣀".repeat(empty)}]`;
  }

  if (style === "block") {
    return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
  }

  if (style === "gradient") {
    const gradient = ["█", "▓", "▒", "░"];
    let fill = "";
    for (let i = 0; i < filled; i += 1) {
      fill += gradient[i % gradient.length];
    }
    return `[${fill.padEnd(width, " ")}]`;
  }

  // default: hash
  return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}

function renderedBarWidth(style: ProgressStyle, trackWidth: number): number {
  if (style === "line") return trackWidth;
  if (style === "steps") return 0;
  return trackWidth + 2; // bracketed styles
}

function fitTrackWidth(
  requested: number,
  labelWidth: number,
  tailWidth: number,
): number {
  const columns = process.stdout.columns ?? 120;

  // icon + space + label + "... " + bar + space + timer + space + tail
  const fixed =
    1 +
    1 +
    labelWidth +
    4 +
    1 +
    TIMER_WIDTH +
    (tailWidth > 0 ? 1 + tailWidth : 0);

  // reserve 2 chars for bracket styles when needed
  const maxTrack = Math.max(MIN_TRACK_WIDTH, columns - fixed - 2);

  return Math.max(MIN_TRACK_WIDTH, Math.min(requested, maxTrack));
}

export function createProgressGroup(
  items: GroupItem[],
  options: Omit<ProgressRenderOptions, "context"> = {},
): ProgressGroupContext {
  const style = options.style ?? DEFAULT_STYLE;
  const labelWidth = Math.max(1, ...items.map((item) => item.label.length));

  if (style === "steps") {
    const stepWidths = items.flatMap((item) => {
      if (!item.steps || item.steps.length === 0) return [0];
      return item.steps.map(
        (_, index) =>
          buildStepsBar(item.steps as readonly string[], index).length,
      );
    });

    const barWidth = Math.max(0, ...stepWidths);

    return {
      style,
      labelWidth,
      trackWidth: 0,
      barWidth,
      timerWidth: TIMER_WIDTH,
      tailWidth: 0,
    };
  }

  const tailWidth = PERCENT_WIDTH;
  const requested = options.width ?? DEFAULT_TRACK_WIDTH;
  const trackWidth = fitTrackWidth(requested, labelWidth, tailWidth);

  return {
    style,
    labelWidth,
    trackWidth,
    barWidth: renderedBarWidth(style, trackWidth),
    timerWidth: TIMER_WIDTH,
    tailWidth,
  };
}

export function renderProgressLine(state: ProgressLineState): string {
  const { context } = state;

  const label = state.label.padEnd(context.labelWidth, " ");

  let bar = "";
  if (context.style === "steps") {
    const steps = state.steps ?? [];
    const current = state.currentStepIndex ?? 0;
    bar = buildStepsBar(steps, current).padEnd(context.barWidth, " ");
  } else {
    bar = buildPercentBar(
      context.style,
      state.percent ?? 0,
      context.trackWidth,
    ).padEnd(context.barWidth, " ");
  }

  const timer = `[${formatTimer(state.elapsedMs)}]`;
  const tail =
    context.tailWidth > 0 ? ` ${formatPercent(state.percent ?? 0)}` : "";

  return `${state.icon} ${label}... ${bar} ${timer}${tail}`;
}

export function writeProgressLine(line: string): void {
  if (!process.stdout.isTTY) {
    process.stdout.write(`${line}\n`);
    return;
  }

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(line);
}

function finalizeProgressLine(line: string): void {
  writeProgressLine(line);
  if (process.stdout.isTTY) {
    process.stdout.write("\n");
  }
}

export async function progress<TStep extends string>(
  label: string,
  steps: readonly TStep[],
  fn: (step: TStep, index: number) => Promise<void>,
  options: ProgressRenderOptions = {},
): Promise<void> {
  const context =
    options.context ??
    createProgressGroup([{ label, steps }], {
      style: options.style,
      width: options.width,
    });

  const total = steps.length;
  const startedAt = Date.now();

  if (total === 0) {
    finalizeProgressLine(
      renderProgressLine({
        icon: "✓",
        label,
        elapsedMs: Date.now() - startedAt,
        percent: 100,
        context,
      }),
    );
    return;
  }

  if (!process.stdout.isTTY) {
    for (const [index, step] of steps.entries()) {
      await fn(step, index);
      finalizeProgressLine(
        renderProgressLine({
          icon: "✓",
          label,
          elapsedMs: Date.now() - startedAt,
          percent: ((index + 1) / total) * 100,
          steps,
          currentStepIndex: index,
          context,
        }),
      );
    }
    return;
  }

  for (const [index, step] of steps.entries()) {
    let frameIndex = 0;

    const renderRunning = () => {
      writeProgressLine(
        renderProgressLine({
          icon: SPINNER_FRAMES[frameIndex],
          label,
          elapsedMs: Date.now() - startedAt,
          percent: (index / total) * 100,
          steps,
          currentStepIndex: index,
          context,
        }),
      );
    };

    renderRunning();

    const timer = setInterval(() => {
      frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
      renderRunning();
    }, 80);

    try {
      await fn(step, index);
    } catch (error) {
      clearInterval(timer);
      finalizeProgressLine(
        renderProgressLine({
          icon: "✗",
          label,
          elapsedMs: Date.now() - startedAt,
          percent: (index / total) * 100,
          steps,
          currentStepIndex: index,
          context,
        }),
      );
      throw error;
    }

    clearInterval(timer);
  }

  finalizeProgressLine(
    renderProgressLine({
      icon: "✓",
      label,
      elapsedMs: Date.now() - startedAt,
      percent: 100,
      steps,
      currentStepIndex: steps.length - 1,
      context,
    }),
  );
}
