import { finalizeLiveLine, isRailEnabled, writeLine, writeLiveLine } from "../output";
import {
  activeTheme as theme,
  padVisibleEnd,
  visibleLength,
} from "../theme";

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
  isTTY?: boolean;
  noColor?: boolean;
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
const MIN_TRACK_WIDTH = 8;
const TIMER_WIDTH = 7;
const PERCENT_WIDTH = 4;
export const ASCII_SPINNER_FRAMES = ["-", "\\", "|", "/"] as const;

function getDefaultTrackWidth(): number {
  return theme.layout.progressWidth;
}

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

function renderStepsBar(
  steps: readonly string[],
  currentStepIndex: number,
): string {
  if (steps.length === 0) return "";

  const current = Math.max(0, Math.min(currentStepIndex, steps.length - 1));
  const past = steps
    .slice(0, current)
    .map((step) => theme.color.dim(step))
    .join(` ${theme.color.dim("▶")} `);
  const active = `${theme.color.border("[")}${theme.color.value(
    steps[current] ?? "",
  )}${theme.color.border("]")}`;
  const future = steps
    .slice(current + 1)
    .map((step) => `${theme.color.dim("▷")} ${theme.color.muted(step)}`)
    .join(" ");

  let result = past ? `${past} ${theme.color.dim("▶")} ${active}` : active;
  if (future) {
    result = `${result} ${future}`;
  }

  return result;
}

function renderPercentBar(
  style: ProgressStyle,
  percent: number,
  width: number,
): string {
  const clamped = clampPercent(percent);
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);

  if (style === "line") {
    const active =
      filled <= 0
        ? ""
        : filled >= width
          ? "━".repeat(width)
          : `${"━".repeat(Math.max(0, filled - 1))}╸`;

    return padVisibleEnd(theme.color.success(active), width);
  }

  if (style === "braille") {
    return `${theme.color.border("[")}${theme.color.success("⣿".repeat(filled))}${theme.color.muted("⣀".repeat(empty))}${theme.color.border("]")}`;
  }

  if (style === "block") {
    return `${theme.color.border("[")}${theme.color.success("█".repeat(filled))}${theme.color.muted("░".repeat(empty))}${theme.color.border("]")}`;
  }

  if (style === "gradient") {
    const fill = "█▓▒░".slice(0, Math.min(4, filled)).padEnd(filled, "░");
    return `${theme.color.border("[")}${theme.color.success(fill)}${theme.color.muted(" ".repeat(empty))}${theme.color.border("]")}`;
  }

  return `${theme.color.border("[")}${theme.color.success(theme.symbols.bar_fill.repeat(filled))}${theme.color.muted(theme.symbols.bar_empty.repeat(empty))}${theme.color.border("]")}`;
}

function renderedBarWidth(style: ProgressStyle, trackWidth: number): number {
  if (style === "line") return trackWidth;
  if (style === "steps") return 0;
  return trackWidth + 2;
}

function fitTrackWidth(
  requested: number,
  labelWidth: number,
  tailWidth: number,
): number {
  const columns = process.stdout.columns ?? 120;
  const prefixWidth =
    isRailEnabled() && theme.symbols.pipe.length > 0
      ? visibleLength(`${theme.symbols.pipe}  `)
      : theme.layout.indent.length;
  const fixedWidth =
    prefixWidth +
    1 +
    1 +
    labelWidth +
    2 +
    2 +
    TIMER_WIDTH +
    (tailWidth > 0 ? 2 + tailWidth : 0);

  const barFrameWidth = 2;
  const safetyWidth = 2;
  const maxTrack = Math.max(
    MIN_TRACK_WIDTH,
    columns - fixedWidth - barFrameWidth - safetyWidth,
  );
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

      return item.steps.map((_, index) =>
        visibleLength(renderStepsBar(item.steps as readonly string[], index)),
      );
    });

    return {
      style,
      labelWidth,
      trackWidth: 0,
      barWidth: Math.max(0, ...stepWidths),
      timerWidth: TIMER_WIDTH,
      tailWidth: 0,
    };
  }

  const tailWidth = PERCENT_WIDTH;
  const requested = options.width ?? getDefaultTrackWidth();
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

function renderIcon(icon: string): string {
  if (icon === theme.symbols.success) {
    return theme.color.success(icon);
  }

  if (icon === theme.symbols.error) {
    return theme.color.error(icon);
  }

  return theme.color.active(icon);
}

export function renderProgressLine(state: ProgressLineState): string {
  const { context } = state;
  const label = theme.color.value(state.label.padEnd(context.labelWidth, " "));

  let bar = "";
  if (context.style === "steps") {
    const steps = state.steps ?? [];
    const current = state.currentStepIndex ?? 0;
    bar = padVisibleEnd(renderStepsBar(steps, current), context.barWidth);
  } else {
    bar = padVisibleEnd(
      renderPercentBar(context.style, state.percent ?? 0, context.trackWidth),
      context.barWidth,
    );
  }

  const timer = theme.color.timer(`[${formatTimer(state.elapsedMs)}]`);
  const tail =
    context.tailWidth > 0
      ? `  ${theme.color.value(formatPercent(state.percent ?? 0))}`
      : "";

  return `${theme.layout.indent}${renderIcon(state.icon)} ${label}  ${bar}  ${timer}${tail}`;
}

function writeProgressLine(line: string): void {
  writeLiveLine(line);
}

function finalizeProgressLine(line: string): void {
  finalizeLiveLine(line);
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
  const isTTY = options.isTTY ?? (process.stdout.isTTY === true);
  const frames =
    options.noColor === true ? ASCII_SPINNER_FRAMES : SPINNER_FRAMES;

  if (total === 0) {
    finalizeProgressLine(
      renderProgressLine({
        icon: theme.symbols.success,
        label,
        elapsedMs: Date.now() - startedAt,
        percent: 100,
        context,
      }),
    );
    return;
  }

  if (!isTTY) {
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index] as TStep;
      try {
        await fn(step, index);
      } catch (error) {
        finalizeProgressLine(
          renderProgressLine({
            icon: theme.symbols.error,
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

      writeLine(
        `${theme.layout.indent}[${index + 1}/${total}] ${theme.color.value(String(step))}`,
      );
    }

    finalizeProgressLine(
      renderProgressLine({
        icon: theme.symbols.success,
        label,
        elapsedMs: Date.now() - startedAt,
        percent: 100,
        steps,
        currentStepIndex: steps.length - 1,
        context,
      }),
    );
    return;
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index] as TStep;
    let frameIndex = 0;

    const renderRunning = () => {
      writeProgressLine(
        renderProgressLine({
          icon: frames[frameIndex],
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
      frameIndex = (frameIndex + 1) % frames.length;
      renderRunning();
    }, 80);

    try {
      await fn(step, index);
    } catch (error) {
      clearInterval(timer);
      finalizeProgressLine(
        renderProgressLine({
          icon: theme.symbols.error,
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
      icon: theme.symbols.success,
      label,
      elapsedMs: Date.now() - startedAt,
      percent: 100,
      steps,
      currentStepIndex: steps.length - 1,
      context,
    }),
  );
}
