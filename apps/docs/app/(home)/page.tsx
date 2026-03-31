import { codeToHtml } from "shiki";
import { HomeHeroClient } from "@/components/home-hero-client";

const SHIKI_OPTIONS = {
  lang: "typescript",
  themes: { light: "gruvbox-light-soft", dark: "gruvbox-dark-soft" },
  defaultColor: false,
} as const;

const CODE = `import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  title: "deploy",
  prompts: {
    env: b.select({ choices: ["staging", "production"] })
      .label("Environment"),
  },
}));

await cli.run(async () => {
  cli.intro("deploy");
  await cli.prompt.env();
  cli.success(\`Deployed to \${cli.storage.env}!\`);
  cli.outro("Done.");
});`;

const CARD_SNIPPETS = [
  `await cli.prompt.name();`,
  `cli.storage.name;`,
  `await cli.spin("Installing...", fn);`,
  `cli.flags.verbose;`,
  `theme: "rounded";`,
  `cli.note("Heads up", message);`,
];

export default async function HomePage() {
  const [codeHtml, ...cardHtmls] = await Promise.all([
    codeToHtml(CODE, SHIKI_OPTIONS),
    ...CARD_SNIPPETS.map((s) => codeToHtml(s, SHIKI_OPTIONS)),
  ]);

  return <HomeHeroClient codeHtml={codeHtml} codeText={CODE} cardHtmls={cardHtmls} />;
}
