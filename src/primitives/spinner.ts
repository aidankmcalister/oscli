export async function spin<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  if (!process.stdout.isTTY) {
    process.stdout.write(`... ${label}\n`);
    try {
      const result = await fn();
      process.stdout.write(`✓ ${label}\n`);
      return result;
    } catch (error) {
      process.stdout.write(`✗ ${label}\n`);
      throw error;
    }
  }

  let index = 0;
  process.stdout.write(`${frames[index]} ${label}`);

  const timer = setInterval(() => {
    index = (index + 1) % frames.length;
    process.stdout.write(`\r${frames[index]} ${label}`);
  }, 80);

  try {
    const result = await fn();
    clearInterval(timer);
    process.stdout.write(`\r✓ ${label}\n`);
    return result;
  } catch (error) {
    clearInterval(timer);
    process.stdout.write(`\r✗ ${label}\n`);
    throw error;
  }
}
