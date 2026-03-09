import { cache } from "react";
import { createHighlighter } from "shiki";
import { HomeHeroClient } from "@/components/home-hero-client";
import {
  oscliDarkTheme,
  oscliLanguage,
  oscliLightTheme,
} from "@/lib/shiki-oscli";

const setupCode = [
  'import { createCLI } from "@oscli-dev/oscli"',
  "",
  "const cli = createCLI((b) => ({",
  '  description: "create-app",',
  '  theme: "basic",',
  "  prompts: {",
  '    project: b.text().label("Project").default("my-app"),',
  "    template: b.select({",
  '      choices: ["next", "remix", "astro"] as const,',
  '    }).label("Template"),',
  '    install: b.confirm().label("Install dependencies?").default(true),',
  "  },",
  "}))",
  "",
  "await cli.run(async () => {",
  "  await cli.prompt.project()",
  "  await cli.prompt.template()",
  "  await cli.prompt.install()",
  "  cli.success(`Created ${cli.storage.project}`)",
  "})",
].join("\n");

const terminalCode = [
  "┌  create-app",
  "│",
  "│  Project",
  "│  › my-app_",
  "│",
  "│  Template",
  "│  ● next   ○ remix   ○ astro",
  "│",
  "│  Install dependencies?",
  "│  ● Yes  /  ○ No",
  "│",
  "│ ✓  Project      my-app",
  "│ ✓  Template     next",
  "│ ✓  Install      yes",
  "│",
  "└  Created my-app",
].join("\n");

const getHighlighter = cache(async () =>
  createHighlighter({
    themes: [oscliLightTheme, oscliDarkTheme],
    langs: ["ts", oscliLanguage],
  }),
);

async function highlight(
  code: string,
  lang: "ts" | "oscli",
  theme: "github-light-oscli" | "github-dark-oscli",
) {
  const highlighter = await getHighlighter();

  return highlighter.codeToHtml(code, {
    lang,
    theme,
  });
}

export default async function HomePage() {
  const [
    setupHtmlLight,
    setupHtmlDark,
    terminalHtmlLight,
    terminalHtmlDark,
  ] = await Promise.all([
    highlight(setupCode, "ts", "github-light-oscli"),
    highlight(setupCode, "ts", "github-dark-oscli"),
    highlight(terminalCode, "oscli", "github-light-oscli"),
    highlight(terminalCode, "oscli", "github-dark-oscli"),
  ]);

  return (
    <HomeHeroClient
      setupHtmlLight={setupHtmlLight}
      setupHtmlDark={setupHtmlDark}
      terminalHtmlLight={terminalHtmlLight}
      terminalHtmlDark={terminalHtmlDark}
    />
  );
}
