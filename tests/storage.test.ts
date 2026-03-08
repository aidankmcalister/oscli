import { describe, expect, it } from "vitest";
import { createStorage } from "../src/storage";

describe("createStorage", () => {
  it("stores and retrieves typed values", () => {
    const storage = createStorage<{ project: string; teamSize: number }>();

    storage.set("project", "clios");
    storage.set("teamSize", 3);

    expect(storage.get("project")).toBe("clios");
    expect(storage.get("teamSize")).toBe(3);
    expect(storage.data).toEqual({ project: "clios", teamSize: 3 });
  });
});
