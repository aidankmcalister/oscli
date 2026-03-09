import { describe, expect, it } from "vitest";
import { createStorage } from "../packages/oscli/src/storage";

describe("createStorage", () => {
  it("stores and retrieves typed values", () => {
    const storage = createStorage<{ project: string; teamSize: number }>();

    storage.set("project", "oscli");
    storage.set("teamSize", 3);

    expect(storage.get("project")).toBe("oscli");
    expect(storage.get("teamSize")).toBe(3);
    expect(storage.data).toEqual({ project: "oscli", teamSize: 3 });
  });
});
