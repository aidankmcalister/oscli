import { renderTextPrompt } from "../src/primitives/prompt";

const project = await renderTextPrompt({
  label: "Project name",
  placeholder: "my-app",
  defaultValue: "my-app",
});

console.log({ project });
