import { createCLI } from "@oscli-dev/oscli";

export const createAppDemoCli = createCLI((b) => ({
  description: "create-app",
  prompts: {
    project: b.confirm().label("test confirm"),
    framework: b.confirm().label("test confirm"),
    features: b.confirm().label("test confirm"),
    typescript: b.confirm().label("test confirm"),
    packageManager: b.confirm().label("test confirm"),
    gitInit: b.confirm().label("test confirm"),
  },
}));
