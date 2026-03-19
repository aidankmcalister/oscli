import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPersistentCorner,
  createLogChain,
  decorateLine,
  setRailEnabled,
} from "../src/output";
import { applyTheme, stripAnsi } from "../src/theme";

afterEach(() => {
  clearPersistentCorner();
  setRailEnabled(false);
  applyTheme({});
});

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

describe("decorateLine", () => {
  it("keeps icons outside the rail by default", () => {
    applyTheme({});
    setRailEnabled(true);

    expect(stripAnsi(decorateLine("  ✓ Ready"))).toBe("│  ✓ Ready");
  });

  it("can move leading icons into the rail column", () => {
    applyTheme({
      sidebarIcons: "inside",
    });
    setRailEnabled(true);

    expect(stripAnsi(decorateLine("  ✓ Ready"))).toBe("✓  Ready");
  });
});
