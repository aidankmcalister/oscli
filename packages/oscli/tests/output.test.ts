import { describe, expect, it, vi } from "vitest";
import { createLogChain } from "../src/output";

describe("createLogChain", () => {
  it("does not require process.stdout in browser-like environments", async () => {
    const originalProcess = globalThis.process;
    const writeFn = vi.fn();

    Object.defineProperty(globalThis, "process", {
      configurable: true,
      value: {
        ...originalProcess,
        stdout: undefined,
        stderr: undefined,
      } as unknown as NodeJS.Process,
    });

    try {
      const chain = createLogChain("info", "Using the App Router.", writeFn);
      chain.flush();
      await Promise.resolve();

      expect(writeFn).toHaveBeenCalledWith("Using the App Router.");
    } finally {
      Object.defineProperty(globalThis, "process", {
        configurable: true,
        value: originalProcess,
      });
    }
  });
});
