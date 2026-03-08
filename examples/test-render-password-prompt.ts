import { renderPasswordPrompt } from "../src/primitives/prompt";

const password = await renderPasswordPrompt({
  label: "Admin password",
  placeholder: "enter password",
});

console.log({ passwordLength: password.length });
