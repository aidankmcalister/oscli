import { afterEach, expect, test, vi } from "vitest";

import { createCLI } from "../src/index.js";

async function captureStdout(run: () => Promise<void>): Promise<string> {
  let buffer = "";
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(((chunk: string | Uint8Array) => {
      buffer += String(chunk);
      return true;
    }) as typeof process.stdout.write);

  try {
    await run();
  } finally {
    writeSpy.mockRestore();
  }

  return buffer;
}

afterEach(() => {
  delete process.env.CI;
  delete process.env.TERM;
});

test("all builders resolve from argv", async () => {
  const cli = createCLI((b) => ({
    prompts: {
      text: b.text(),
      number: b.number(),
      password: b.password(),
      select: b.select({ choices: ["a", "b"] }),
      multi: b.multi({ choices: ["x", "y", "z"] }),
      confirm: b.confirm(),
    },
  }));

  await cli.run(
    async () => {
      await cli.prompt.text();
      await cli.prompt.number();
      await cli.prompt.password();
      await cli.prompt.select();
      await cli.prompt.multi();
      await cli.prompt.confirm();
    },
    {
      argv: [
        "node",
        "test",
        "--text",
        "hello",
        "--number",
        "3.14",
        "--password",
        "secret",
        "--select",
        "b",
        "--multi",
        "x,z",
        "--confirm",
        "true",
      ],
    },
  );

  expect(cli.storage.text).toBe("hello");
  expect(cli.storage.number).toBe(3.14);
  expect(cli.storage.password).toBe("secret");
  expect(cli.storage.select).toBe("b");
  expect(cli.storage.multi).toEqual(["x", "z"]);
  expect(cli.storage.confirm).toBe(true);
});

test("defaults are used when argv values are missing", async () => {
  const cli = createCLI((b) => ({
    prompts: {
      weight: b.number().default(70),
      service: b
        .select({ choices: ["standard", "express"] })
        .default("standard"),
    },
  }));

  await cli.run(
    async () => {
      await cli.prompt.weight();
      await cli.prompt.service();
    },
    { argv: ["node", "test"] },
  );

  expect(cli.storage.weight).toBe(70);
  expect(cli.storage.service).toBe("standard");
});

test("validate blocks invalid values and surfaces custom message", async () => {
  const cli = createCLI((b) => ({
    prompts: {
      age: b
        .number()
        .validate((value) => (value >= 18 ? true : "Age must be 18 or above.")),
    },
  }));

  await expect(
    cli.run(
      async () => {
        await cli.prompt.age();
      },
      { argv: ["node", "test", "--age", "10"] },
    ),
  ).rejects.toThrow(/Age must be 18 or above\./);
});

test("optional prompt resolves to undefined in non-interactive mode", async () => {
  process.env.CI = "1";

  const cli = createCLI((b) => ({
    prompts: {
      notes: b.text().optional(),
    },
  }));

  await cli.run(
    async () => {
      await cli.prompt.notes();
    },
    { argv: ["node", "test"] },
  );

  expect(cli.storage.notes).toBeUndefined();
});

test("min/max bounds enforce number and multi constraints", async () => {
  const numberCli = createCLI((b) => ({
    prompts: {
      age: b.number().min(10).max(20),
    },
  }));

  await expect(
    numberCli.run(
      async () => {
        await numberCli.prompt.age();
      },
      { argv: ["node", "test", "--age", "9"] },
    ),
  ).rejects.toThrow(/>= 10/);

  const multiCli = createCLI((b) => ({
    prompts: {
      tags: b
        .multi({ choices: ["js", "ts", "rust"] })
        .min(1)
        .max(2),
    },
  }));

  await expect(
    multiCli.run(
      async () => {
        await multiCli.prompt.tags();
      },
      { argv: ["node", "test", "--tags", "js,ts,rust"] },
    ),
  ).rejects.toThrow(/at most 2/);
});

test("b.number accepts integers and floats", async () => {
  const intCli = createCLI((b) => ({
    prompts: { amount: b.number() },
  }));

  await intCli.run(
    async () => {
      await intCli.prompt.amount();
    },
    { argv: ["node", "test", "--amount", "42"] },
  );
  expect(intCli.storage.amount).toBe(42);

  const floatCli = createCLI((b) => ({
    prompts: { amount: b.number() },
  }));

  await floatCli.run(
    async () => {
      await floatCli.prompt.amount();
    },
    { argv: ["node", "test", "--amount", "42.5"] },
  );
  expect(floatCli.storage.amount).toBe(42.5);
});

test("cli.exit stops execution", async () => {
  const cli = createCLI((b) => ({
    prompts: { age: b.number() },
  }));

  let afterExitRan = false;
  const result = await cli.run(
    async () => {
      await cli.prompt.age();
      cli.exit("Stop now");
      afterExitRan = true;
    },
    { argv: ["node", "test", "--age", "12"] },
  );

  expect(result.cancelled).toBe(true);
  expect(afterExitRan).toBe(false);
});

test("cli.outro stops execution as successful completion", async () => {
  const cli = createCLI((b) => ({
    prompts: { age: b.number() },
  }));

  let afterOutroRan = false;

  process.env.OSCLI_DISABLE_PROCESS_EXIT = "1";
  try {
    const result = await cli.run(
      async () => {
        await cli.prompt.age();
        cli.outro("Done");
        afterOutroRan = true;
      },
      { argv: ["node", "test", "--age", "12"] },
    );

    expect(result.cancelled).toBe(false);
    expect(afterOutroRan).toBe(false);
  } finally {
    delete process.env.OSCLI_DISABLE_PROCESS_EXIT;
  }
});

test("display methods print plain output", async () => {
  const output = await captureStdout(async () => {
    const cli = createCLI(() => ({ prompts: {} }));
    cli.intro("intro");
    cli.warn("warn");
    cli.success("success");
    cli.log("info", "log");
  });

  expect(output).toMatch(/intro/);
  expect(output).toMatch(/warn/);
  expect(output).toMatch(/success/);
  expect(output).toMatch(/\[info\] log/);
  expect(/\u001b\[/.test(output)).toBe(false);
});

test("ascii symbols are used when TERM=dumb", async () => {
  process.env.TERM = "dumb";

  const output = await captureStdout(async () => {
    const cli = createCLI(() => ({ prompts: {} }));
    cli.warn("warning");
  });

  expect(output).toMatch(/^\[!\]/);
});

test("multiselect alias resolves like multi", async () => {
  const cli = createCLI((b) => ({
    prompts: {
      tags: b.multiselect({ choices: ["js", "ts", "rust"] }),
    },
  }));

  await cli.run(
    async () => {
      await cli.prompt.tags();
    },
    { argv: ["node", "test", "--tags", "js,rust"] },
  );

  expect(cli.storage.tags).toEqual(["js", "rust"]);
});

test("transform is applied to resolved value", async () => {
  const cli = createCLI((b) => ({
    prompts: {
      name: b.text().transform((value) => value.trim().toUpperCase()),
    },
  }));

  await cli.run(
    async () => {
      await cli.prompt.name();
    },
    { argv: ["node", "test", "--name", "  hello  "] },
  );

  expect(cli.storage.name).toBe("HELLO");
});
