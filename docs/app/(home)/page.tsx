import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { createHighlighter } from "shiki";
import { HomeHeroClient } from "@/components/home-hero-client";
import {
  oscliDarkTheme,
  oscliLanguage,
  oscliLightTheme,
} from "@/lib/shiki-oscli";

const getHighlighter = cache(async () =>
  createHighlighter({
    themes: [oscliLightTheme, oscliDarkTheme],
    langs: ["ts", oscliLanguage],
  }),
);

const getSetupCode = cache(async () => {
  const filePath = path.join(process.cwd(), "lib", "create-app-demo.ts");
  return readFile(filePath, "utf8");
});

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
  const setupCode = await getSetupCode();
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
