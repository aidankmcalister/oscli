import readline from "node:readline";

export async function progress<TStep extends string>(
  label: string,
  steps: readonly TStep[],
  fn: (step: TStep, index: number) => Promise<void>,
): Promise<void> {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const total = steps.length;

  if (total === 0) {
    process.stdout.write(`✓ ${label}\n`);
    return;
  }

  if (!process.stdout.isTTY) {
    process.stdout.write(`${label}\n`);
    for (const [index, step] of steps.entries()) {
      process.stdout.write(`... [${index + 1}/${total}] ${step}\n`);
      await fn(step, index);
      process.stdout.write(`✓ [${index + 1}/${total}] ${step}\n`);
    }
    return;
  }

  process.stdout.write(`${label}\n`);

  const renderLine = (text: string) => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(text);
  };

  for (const [index, step] of steps.entries()) {
    const prefix = `[${index + 1}/${total}]`;
    let frameIndex = 0;

    renderLine(`${frames[frameIndex]} ${prefix} ${step}`);

    const timer = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      renderLine(`${frames[frameIndex]} ${prefix} ${step}`);
    }, 80);

    try {
      await fn(step, index);
    } catch (error) {
      clearInterval(timer);
      renderLine(`✗ ${prefix} ${step}\n`);
      throw error;
    }

    clearInterval(timer);

    if (index === total - 1) {
      renderLine(`✓ ${prefix} ${step}\n`);
    }
  }
}
