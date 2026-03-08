import { renderSelectPrompt } from "../src/primitives/prompt";

const projectType = await renderSelectPrompt({
  label: "Project type",
  choices: ["personal", "school", "work"] as const,
});

console.log({ projectType });
