import type { ProgressGroupContext, ProgressStyle } from "./progress";
import { SPINNER_FRAMES } from "./progress";
import { finalizeLiveLine, writeLiveLine } from "../output";
import { activeTheme as theme } from "../theme";

export type SpinnerOptions = {
  style?: ProgressStyle;
  width?: number;
  context?: ProgressGroupContext;
  percent?: number;
  doneLabel?: string;
};

function formatElapsed(elapsedMs: number): string {
  if (elapsedMs < 60_000) {
    return `${(elapsedMs / 1000).toFixed(1)}s`;
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function renderSpinnerLine(
  icon: string,
  label: string,
  elapsedMs: number,
  state: "running" | "done" | "error",
): string {
  const coloredIcon =
    state === "running"
      ? theme.color.active(icon)
      : state === "done"
        ? theme.color.success(icon)
        : theme.color.error(icon);

  const coloredLabel =
    state === "error" ? theme.color.error(label) : theme.color.value(label);

  return `${theme.layout.indent}${coloredIcon} ${coloredLabel}  ${theme.color.timer(formatElapsed(elapsedMs))}`;
}

export async function spin<T>(
  label: string,
  fn: () => Promise<T>,
  options: SpinnerOptions = {},
): Promise<T> {
  const startedAt = Date.now();
  let frameIndex = 0;
  const runningLabel = `${label}...`;
  const doneLabel = options.doneLabel ?? label;

  if (!process.stdout.isTTY) {
    try {
      const result = await fn();
      finalizeLiveLine(
        renderSpinnerLine(
          theme.symbols.success,
          doneLabel,
          Date.now() - startedAt,
          "done",
        ),
      );
      return result;
    } catch (error) {
      finalizeLiveLine(
        renderSpinnerLine(
          theme.symbols.error,
          "Failed",
          Date.now() - startedAt,
          "error",
        ),
      );
      throw error;
    }
  }

  const renderRunning = () => {
    writeLiveLine(
      renderSpinnerLine(
        SPINNER_FRAMES[frameIndex],
        runningLabel,
        Date.now() - startedAt,
        "running",
      ),
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
    finalizeLiveLine(
      renderSpinnerLine(
        theme.symbols.success,
        doneLabel,
        Date.now() - startedAt,
        "done",
      ),
    );
    return result;
  } catch (error) {
    clearInterval(timer);
    finalizeLiveLine(
      renderSpinnerLine(
        theme.symbols.error,
        "Failed",
        Date.now() - startedAt,
        "error",
      ),
    );
    throw error;
  }
}
