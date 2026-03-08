import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-fd-muted-foreground">
          oscli
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Build CLIs with typed prompts, flags, and terminal primitives.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-fd-muted-foreground sm:text-lg">
          `oscli` is a Bun-first TypeScript CLI framework built on Commander and
          picocolors. Open the docs to see prompt builders, theme presets,
          JSON mode, and the testing harness.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/docs"
          className="rounded-full bg-fd-primary px-5 py-2 text-sm font-medium text-fd-primary-foreground"
        >
          Open docs
        </Link>
        <Link
          href="https://github.com/aidankmcalister/oscli"
          className="rounded-full border border-fd-border px-5 py-2 text-sm font-medium"
        >
          GitHub
        </Link>
      </div>
    </div>
  );
}
