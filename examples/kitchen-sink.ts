import { createBuilder } from "../src";

const b = createBuilder();

console.log(b.text().label("Project name").default("my-app").config());
console.log(b.number().label("Team size").min(1).max(20).config());
console.log(b.password().label("Admin password").config());
console.log(
  b
    .select({ choices: ["personal", "school", "work"] as const })
    .label("Project type")
    .rule("personal", "side project")
    .rule("school", "class assignment")
    .rule("work", "team project")
    .config(),
);
console.log(
  b
    .multiselect({ choices: ["api", "ui", "docs", "tests"] as const })
    .label("Focus areas")
    .min(1)
    .max(3)
    .config(),
);
console.log(b.confirm().label("Start setup now?").config());
