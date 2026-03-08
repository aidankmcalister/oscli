import { renderConfirmPrompt } from "../src/primitives/prompt";

const startSetup = await renderConfirmPrompt({
  label: "Start setup now?",
  defaultValue: false,
});

console.log({ startSetup });
