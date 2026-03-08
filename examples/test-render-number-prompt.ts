import { renderNumberPrompt } from "../src/primitives/prompt";

const budget = await renderNumberPrompt({
  label: "Budget",
  prefix: "$",
  min: 0,
  max: 10000,
  defaultValue: 500,
});

console.log({ budget });
