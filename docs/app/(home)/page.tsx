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
  "export const cli = createCLI((b) => ({",
  '  description: "create-app",',
  '  theme: "basic",',
  "  prompts: {",
  '    project: b.text().label("Project").default("my-app"),',
  "    framework: b.select({",
  '      choices: ["next", "remix", "astro", "vite"] as const,',
  '    }).label("Framework").default("next"),',
  "    features: b.multiselect({",
  '      choices: ["tailwind", "eslint", "testing", "auth"] as const,',
  '    }).label("Features").default(["tailwind", "eslint"]),',
  '    typescript: b.confirm().label("Use TypeScript?").default(true),',
  "    packageManager: b.select({",
  '      choices: ["npm", "bun", "pnpm", "yarn"] as const,',
  '    }).label("Package manager").default("bun"),',
  '    gitInit: b.confirm().label("Initialize git?").default(true),',
  "  },",
  "}))",
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
  const [setupHtmlLight, setupHtmlDark] = await Promise.all([
    highlight(setupCode, "ts", "github-light-oscli"),
    highlight(setupCode, "ts", "github-dark-oscli"),
  ]);

  return (
    <HomeHeroClient
      setupHtmlLight={setupHtmlLight}
      setupHtmlDark={setupHtmlDark}
    />
  );
}
