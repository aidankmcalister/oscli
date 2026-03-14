import type { ProgressGroupContext, ProgressStyle } from "./progress";
import { ASCII_SPINNER_FRAMES, SPINNER_FRAMES } from "./progress";
import { finalizeLiveLine, writeLine, writeLiveLine } from "../output";
import { activeTheme as theme } from "../theme";

export type SpinnerOptions = {
  style?: ProgressStyle;
  width?: number;
  context?: ProgressGroupContext;
  percent?: number;
  doneLabel?: string;
  isTTY?: boolean;
  noColor?: boolean;
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

function resolveDoneLabel(label: string, explicitDoneLabel?: string): string {
  if (explicitDoneLabel) {
    return explicitDoneLabel;
  }

  const trimmed = label.trim().replace(/\.\.\.$/, "");
  const [head, ...rest] = trimmed.split(/\s+/);

  if (!head) {
    return trimmed;
  }

  const lowerHead = head.toLowerCase();
  const mapped = new Map<string, string>([
    ["generating", "generated"],
    ["running", "ran"],
    ["installing", "installed"],
    ["building", "built"],
    ["fetching", "fetched"],
    ["writing", "wrote"],
    ["loading", "loaded"],
    ["compiling", "compiled"],
  ]).get(lowerHead);

  if (!mapped) {
    return trimmed;
  }

  const resolvedHead =
    head[0] === head[0]?.toUpperCase()
      ? mapped[0]?.toUpperCase() + mapped.slice(1)
      : mapped;

  return [resolvedHead, ...rest].join(" ");
}

export async function spin<T>(
  label: string,
  fn: () => Promise<T>,
  options: SpinnerOptions = {},
): Promise<T> {
  const startedAt = Date.now();
  let frameIndex = 0;
  const frames =
    options.noColor === true ? ASCII_SPINNER_FRAMES : SPINNER_FRAMES;
  const isTTY = options.isTTY ?? (process.stdout.isTTY === true);
  const runningLabel = `${label}...`;
  const doneLabel = resolveDoneLabel(label, options.doneLabel);

  if (!isTTY) {
    writeLine(
      renderSpinnerLine(frames[0], runningLabel, Date.now() - startedAt, "running"),
    );

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
        frames[frameIndex],
        runningLabel,
        Date.now() - startedAt,
        "running",
      ),
    );
  };

  renderRunning();

  const timer = setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length;
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
