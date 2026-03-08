import { createBuilder } from "../src";

const b = createBuilder();

console.log(b.text().label("Name").default("oscli").config());
console.log(b.number().label("Budget").prefix("$").min(0).max(1000).config());
