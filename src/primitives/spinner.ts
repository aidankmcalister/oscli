import {
  SPINNER_FRAMES,
  createProgressGroup,
  renderProgressLine,
  writeProgressLine,
  type ProgressGroupContext,
  type ProgressStyle,
} from "./progress";

export type SpinnerOptions = {
  style?: ProgressStyle;
  width?: number;
  context?: ProgressGroupContext;
  percent?: number;
};

function finalizeSpinnerLine(line: string): void {
  writeProgressLine(line);
  if (process.stdout.isTTY) {
    process.stdout.write("\n");
  }
}

export async function spin<T>(
  label: string,
  fn: () => Promise<T>,
  options: SpinnerOptions = {},
): Promise<T> {
  const style = options.style === "steps" ? "hash" : options.style;

  const context =
    options.context ??
    createProgressGroup([{ label }], {
      style,
      width: options.width,
    });

  const startedAt = Date.now();
  const runningPercent = options.percent ?? 0;
  let frameIndex = 0;

  const renderRunning = () => {
    writeProgressLine(
      renderProgressLine({
        icon: SPINNER_FRAMES[frameIndex],
        label,
        elapsedMs: Date.now() - startedAt,
        percent: runningPercent,
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
    const result = await fn();
    clearInterval(timer);

    finalizeSpinnerLine(
      renderProgressLine({
        icon: "✓",
        label,
        elapsedMs: Date.now() - startedAt,
        percent: 100,
        context,
      }),
    );

    return result;
  } catch (error) {
    clearInterval(timer);

    finalizeSpinnerLine(
      renderProgressLine({
        icon: "✗",
        label,
        elapsedMs: Date.now() - startedAt,
        percent: runningPercent,
        context,
      }),
    );

    throw error;
  }
}
