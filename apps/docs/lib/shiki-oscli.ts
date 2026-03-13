import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";
import type { LanguageRegistration, ThemeRegistration } from "shiki";

export const oscliLanguage: LanguageRegistration = {
  name: "oscli",
  displayName: "oscli",
  scopeName: "text.oscli",
  patterns: [
    { include: "#summary-line" },
    { include: "#hint-bar" },
    { include: "#value-line" },
    { include: "#label-line" },
    { include: "#rail-only-line" },
    { include: "#corner" },
    { include: "#pipe" },
    { include: "#success" },
    { include: "#error" },
    { include: "#warning" },
    { include: "#info" },
    { include: "#active-radio" },
    { include: "#inactive-radio" },
    { include: "#separator" },
    { include: "#cursor-arrow" },
    { include: "#cursor" },
  ],
  repository: {
    "summary-line": {
      begin: "^(\\s*)(│)?(\\s{2})?(✓)(\\s{1,2})",
      beginCaptures: {
        2: { name: "punctuation.definition.rail.pipe.oscli" },
        4: { name: "constant.other.success.oscli" },
      },
      end: "$",
      patterns: [
        {
          match: "([^\\n]+?)(\\s{2,})([^\\n]+)$",
          captures: {
            1: { name: "variable.other.summary-label.oscli" },
            3: { name: "variable.other.summary-value.oscli" },
          },
        },
        { include: "#cursor" },
      ],
    },
    "value-line": {
      begin:
        "^(\\s*)(│)(\\s{2})(?=(?:[›>]|\\$\\s*[›>]|[●○]|.*_$|.*\\s/\\s.*))(?!\\s*(?:✓|✗|⚠|ℹ))",
      beginCaptures: {
        2: { name: "punctuation.definition.rail.pipe.oscli" },
      },
      end: "$",
      contentName: "string.unquoted.value.oscli",
      patterns: [
        { include: "#active-radio" },
        { include: "#inactive-radio" },
        { include: "#separator" },
        { include: "#cursor-arrow" },
        { include: "#cursor" },
        { include: "#hint-text" },
      ],
    },
    "label-line": {
      begin:
        "^(\\s*)(│)(\\s{2})(?!\\s*(?:✓|✗|⚠|ℹ|●|○|›))(?!\\s*$)(?!.*_\\s*$)",
      beginCaptures: {
        2: { name: "punctuation.definition.rail.pipe.oscli" },
      },
      end: "$",
      contentName: "entity.name.prompt-label.oscli",
    },
    "rail-only-line": {
      match: "^(\\s*)(│)(\\s*)$",
      captures: {
        2: { name: "punctuation.definition.rail.pipe.oscli" },
      },
    },
    corner: {
      match: "^\\s*([┌└╭╰])",
      captures: {
        1: { name: "punctuation.definition.rail.corner.oscli" },
      },
    },
    pipe: {
      match: "│",
      name: "punctuation.definition.rail.pipe.oscli",
    },
    success: {
      match: "✓",
      name: "constant.other.success.oscli",
    },
    error: {
      match: "✗",
      name: "constant.other.error.oscli",
    },
    warning: {
      match: "⚠",
      name: "constant.other.warning.oscli",
    },
    info: {
      match: "ℹ",
      name: "constant.other.info.oscli",
    },
    "active-radio": {
      match: "●",
      name: "constant.language.radio.active.oscli",
    },
    "inactive-radio": {
      match: "○",
      name: "constant.language.radio.inactive.oscli",
    },
    separator: {
      match: "\\s/\\s",
      name: "punctuation.separator.oscli",
    },
    "cursor-arrow": {
      match: "[›>]",
      name: "punctuation.cursor.arrow.oscli",
    },
    cursor: {
      match: "_(?=\\s*$)",
      name: "punctuation.cursor.oscli",
    },
    "hint-text": {
      match: "\\s{3,}[^\\s].*$",
      name: "comment.hint.oscli",
    },
    "hint-bar": {
      match: "^.*[↑↓⏎].*$",
      name: "comment.keyboard-hint.oscli",
    },
  },
};

const oscliTokenColorsLight: NonNullable<ThemeRegistration["tokenColors"]> = [
  {
    scope: "punctuation.definition.rail.corner.oscli",
    settings: { foreground: "#555555" },
  },
  {
    scope: "punctuation.definition.rail.pipe.oscli",
    settings: { foreground: "#555555" },
  },
  {
    scope: "constant.other.success.oscli",
    settings: { foreground: "#16a34a" },
  },
  {
    scope: "constant.other.error.oscli",
    settings: { foreground: "#dc2626" },
  },
  {
    scope: "constant.other.warning.oscli",
    settings: { foreground: "#d97706" },
  },
  {
    scope: "constant.other.info.oscli",
    settings: { foreground: "#2563eb" },
  },
  {
    scope: "constant.language.radio.active.oscli",
    settings: { foreground: "#0891b2" },
  },
  {
    scope: "constant.language.radio.inactive.oscli",
    settings: { foreground: "#888888" },
  },
  {
    scope: "punctuation.separator.oscli",
    settings: { foreground: "#888888" },
  },
  {
    scope: "punctuation.cursor.arrow.oscli",
    settings: { foreground: "#0891b2" },
  },
  {
    scope: "entity.name.prompt-label.oscli",
    settings: { foreground: "#111111", fontStyle: "bold" },
  },
  {
    scope: "string.unquoted.value.oscli",
    settings: { foreground: "#444444" },
  },
  {
    scope: "punctuation.cursor.oscli",
    settings: { foreground: "#0891b2" },
  },
  {
    scope: "comment.hint.oscli",
    settings: { foreground: "#aaaaaa" },
  },
  {
    scope: "comment.keyboard-hint.oscli",
    settings: { foreground: "#aaaaaa" },
  },
  {
    scope: "variable.other.summary-label.oscli",
    settings: { foreground: "#888888" },
  },
  {
    scope: "variable.other.summary-value.oscli",
    settings: { foreground: "#111111" },
  },
];

const oscliTokenColorsDark: NonNullable<ThemeRegistration["tokenColors"]> = [
  {
    scope: "punctuation.definition.rail.corner.oscli",
    settings: { foreground: "#3a3a3a" },
  },
  {
    scope: "punctuation.definition.rail.pipe.oscli",
    settings: { foreground: "#3a3a3a" },
  },
  {
    scope: "constant.other.success.oscli",
    settings: { foreground: "#4ade80" },
  },
  {
    scope: "constant.other.error.oscli",
    settings: { foreground: "#f87171" },
  },
  {
    scope: "constant.other.warning.oscli",
    settings: { foreground: "#fbbf24" },
  },
  {
    scope: "constant.other.info.oscli",
    settings: { foreground: "#60a5fa" },
  },
  {
    scope: "constant.language.radio.active.oscli",
    settings: { foreground: "#22d3ee" },
  },
  {
    scope: "constant.language.radio.inactive.oscli",
    settings: { foreground: "#555555" },
  },
  {
    scope: "punctuation.separator.oscli",
    settings: { foreground: "#555555" },
  },
  {
    scope: "punctuation.cursor.arrow.oscli",
    settings: { foreground: "#22d3ee" },
  },
  {
    scope: "entity.name.prompt-label.oscli",
    settings: { foreground: "#F3F1EB", fontStyle: "bold" },
  },
  {
    scope: "string.unquoted.value.oscli",
    settings: { foreground: "#a8a8a8" },
  },
  {
    scope: "punctuation.cursor.oscli",
    settings: { foreground: "#22d3ee" },
  },
  {
    scope: "comment.hint.oscli",
    settings: { foreground: "#444444" },
  },
  {
    scope: "comment.keyboard-hint.oscli",
    settings: { foreground: "#444444" },
  },
  {
    scope: "variable.other.summary-label.oscli",
    settings: { foreground: "#666666" },
  },
  {
    scope: "variable.other.summary-value.oscli",
    settings: { foreground: "#F3F1EB" },
  },
];

function withOscliTokens(
  theme: ThemeRegistration,
  name: string,
  tokens: NonNullable<ThemeRegistration["tokenColors"]>,
): ThemeRegistration {
  return {
    ...theme,
    name,
    displayName: name,
    tokenColors: [...(theme.tokenColors ?? []), ...tokens],
  };
}

export const oscliLightTheme = withOscliTokens(
  githubLight,
  "github-light-oscli",
  oscliTokenColorsLight,
);

export const oscliDarkTheme = withOscliTokens(
  githubDark,
  "github-dark-oscli",
  oscliTokenColorsDark,
);
