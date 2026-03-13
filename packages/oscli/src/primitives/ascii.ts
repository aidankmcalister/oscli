import type { ColorName } from "../theme";

export type AsciiStyle = {
  color?: ColorName;
  bold?: boolean;
  dim?: boolean;
};

// Compact 5-row font for printable ASCII (space through ~).
// Each character is 5 rows tall. Width varies per character.
const FONT: Record<string, string[]> = {
  A: [
    " ██ ",
    "█  █",
    "████",
    "█  █",
    "█  █",
  ],
  B: [
    "███ ",
    "█  █",
    "███ ",
    "█  █",
    "███ ",
  ],
  C: [
    " ███",
    "█   ",
    "█   ",
    "█   ",
    " ███",
  ],
  D: [
    "███ ",
    "█  █",
    "█  █",
    "█  █",
    "███ ",
  ],
  E: [
    "████",
    "█   ",
    "███ ",
    "█   ",
    "████",
  ],
  F: [
    "████",
    "█   ",
    "███ ",
    "█   ",
    "█   ",
  ],
  G: [
    " ███",
    "█   ",
    "█ ██",
    "█  █",
    " ███",
  ],
  H: [
    "█  █",
    "█  █",
    "████",
    "█  █",
    "█  █",
  ],
  I: [
    "███",
    " █ ",
    " █ ",
    " █ ",
    "███",
  ],
  J: [
    "████",
    "   █",
    "   █",
    "█  █",
    " ██ ",
  ],
  K: [
    "█  █",
    "█ █ ",
    "██  ",
    "█ █ ",
    "█  █",
  ],
  L: [
    "█   ",
    "█   ",
    "█   ",
    "█   ",
    "████",
  ],
  M: [
    "█   █",
    "██ ██",
    "█ █ █",
    "█   █",
    "█   █",
  ],
  N: [
    "█   █",
    "██  █",
    "█ █ █",
    "█  ██",
    "█   █",
  ],
  O: [
    " ██ ",
    "█  █",
    "█  █",
    "█  █",
    " ██ ",
  ],
  P: [
    "███ ",
    "█  █",
    "███ ",
    "█   ",
    "█   ",
  ],
  Q: [
    " ██ ",
    "█  █",
    "█  █",
    "█ █ ",
    " █ █",
  ],
  R: [
    "███ ",
    "█  █",
    "███ ",
    "█ █ ",
    "█  █",
  ],
  S: [
    " ███",
    "█   ",
    " ██ ",
    "   █",
    "███ ",
  ],
  T: [
    "█████",
    "  █  ",
    "  █  ",
    "  █  ",
    "  █  ",
  ],
  U: [
    "█  █",
    "█  █",
    "█  █",
    "█  █",
    " ██ ",
  ],
  V: [
    "█   █",
    "█   █",
    " █ █ ",
    " █ █ ",
    "  █  ",
  ],
  W: [
    "█   █",
    "█   █",
    "█ █ █",
    "██ ██",
    "█   █",
  ],
  X: [
    "█   █",
    " █ █ ",
    "  █  ",
    " █ █ ",
    "█   █",
  ],
  Y: [
    "█   █",
    " █ █ ",
    "  █  ",
    "  █  ",
    "  █  ",
  ],
  Z: [
    "█████",
    "   █ ",
    "  █  ",
    " █   ",
    "█████",
  ],
  "0": [
    " ██ ",
    "█  █",
    "█  █",
    "█  █",
    " ██ ",
  ],
  "1": [
    " █ ",
    "██ ",
    " █ ",
    " █ ",
    "███",
  ],
  "2": [
    " ██ ",
    "█  █",
    "  █ ",
    " █  ",
    "████",
  ],
  "3": [
    "███ ",
    "   █",
    " ██ ",
    "   █",
    "███ ",
  ],
  "4": [
    "█  █",
    "█  █",
    "████",
    "   █",
    "   █",
  ],
  "5": [
    "████",
    "█   ",
    "███ ",
    "   █",
    "███ ",
  ],
  "6": [
    " ██ ",
    "█   ",
    "███ ",
    "█  █",
    " ██ ",
  ],
  "7": [
    "████",
    "   █",
    "  █ ",
    " █  ",
    " █  ",
  ],
  "8": [
    " ██ ",
    "█  █",
    " ██ ",
    "█  █",
    " ██ ",
  ],
  "9": [
    " ██ ",
    "█  █",
    " ███",
    "   █",
    " ██ ",
  ],
  "!": [
    "█",
    "█",
    "█",
    " ",
    "█",
  ],
  "?": [
    " ██ ",
    "█  █",
    "  █ ",
    "    ",
    "  █ ",
  ],
  ".": [
    " ",
    " ",
    " ",
    " ",
    "█",
  ],
  ",": [
    " ",
    " ",
    " ",
    " █",
    "█ ",
  ],
  "-": [
    "    ",
    "    ",
    "████",
    "    ",
    "    ",
  ],
  "_": [
    "    ",
    "    ",
    "    ",
    "    ",
    "████",
  ],
  "/": [
    "   █",
    "  █ ",
    " █  ",
    "█   ",
    "    ",
  ],
  ":": [
    " ",
    "█",
    " ",
    "█",
    " ",
  ],
  " ": [
    "  ",
    "  ",
    "  ",
    "  ",
    "  ",
  ],
};

const ROWS = 5;
const LETTER_GAP = 1;

/**
 * Render a text string as multi-line ASCII block art.
 * Returns an array of lines (one per row of the font).
 * Characters not in the font are silently skipped.
 */
export function ascii(text: string): string[] {
  const upper = text.toUpperCase();
  const glyphs: string[][] = [];

  for (const char of upper) {
    const glyph = FONT[char];
    if (glyph) {
      glyphs.push(glyph);
    }
  }

  if (glyphs.length === 0) {
    return [];
  }

  const lines: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    const parts: string[] = [];
    for (const glyph of glyphs) {
      parts.push(glyph[row]);
    }
    lines.push(parts.join(" ".repeat(LETTER_GAP)));
  }

  return lines;
}
