import { isRailEnabled } from "../output";
import { activeTheme as theme, visibleLength } from "../theme";

function railWidth(): number {
  if (!isRailEnabled() || theme.symbols.pipe.length === 0) {
    return visibleLength(theme.layout.indent);
  }

  return visibleLength(`${theme.symbols.pipe}  `);
}

export function renderDivider(
  label: string | undefined,
  _noColor: boolean,
  _isTTY: boolean,
): string {
  const columns = process.stdout.columns ?? 80;
  const availableWidth = Math.max(8, columns - railWidth() - 1);

  if (!label) {
    return `${theme.layout.indent}${theme.color.border("─".repeat(availableWidth))}`;
  }

  const plainLabel = ` ${label} `;
  const remaining = Math.max(0, availableWidth - plainLabel.length);
  const leftWidth = Math.floor(remaining / 2);
  const rightWidth = remaining - leftWidth;

  return `${theme.layout.indent}${theme.color.border("─".repeat(leftWidth))}${theme.color.muted(plainLabel)}${theme.color.border("─".repeat(rightWidth))}`;
}
