import { createStorage } from "../src";

type DemoStorage = {
  project: string;
  teamSize: number;
};

const storage = createStorage<DemoStorage>();

storage.set("project", "oscli");
storage.set("teamSize", 3);

console.log(storage.get("project"));
console.log(storage.get("teamSize"));
console.log(storage.data);
