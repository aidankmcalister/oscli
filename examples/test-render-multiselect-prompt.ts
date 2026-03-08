import { renderMultiselectPrompt } from "../src/primitives/prompt";

const focusAreas = await renderMultiselectPrompt({
  label: "Focus areas",
  choices: ["api", "ui", "docs", "tests"] as const,
  min: 1,
  max: 3,
});

console.log({ focusAreas });
