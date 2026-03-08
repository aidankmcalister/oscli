"use client";

import Link from "next/link";
import { useState } from "react";

const installCommand = "npm install @oscli-dev/oscli";

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  async function copyInstallCommand() {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="grid min-h-[calc(100svh-4rem)] flex-1 px-[clamp(1rem,2vw,1.75rem)] py-6 text-center">
      <div className="mx-auto my-auto grid w-full max-w-3xl justify-items-center gap-[clamp(0.9rem,2vw,1.35rem)] text-center">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fd-muted-foreground">
            oscli
          </p>
          <h1 className="mx-auto max-w-4xl text-[clamp(2.45rem,6.3vw,5.1rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance text-fd-foreground">
            The last CLI framework
            <br />
            you&apos;ll reach for.
          </h1>
          <p className="mx-auto max-w-2xl mt-8 font-sans text-[clamp(1.02rem,2vw,1.35rem)] leading-[1.2] text-balance text-fd-muted-foreground italic">
            Everything your TypeScript CLI needs, in one runtime.
          </p>
        </div>

        <div className="w-full max-w-2xl rounded-[1rem] border border-fd-border bg-fd-card p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="overflow-x-auto text-left text-sm font-medium text-fd-foreground sm:text-[0.95rem]">
              {installCommand}
            </code>
            <button
              type="button"
              onClick={copyInstallCommand}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-fd-border bg-fd-background px-[1.02rem] py-[0.64rem] text-[0.9rem] leading-none font-[500] text-fd-muted-foreground transition-colors duration-75 hover:border-fd-foreground hover:text-fd-foreground"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-[0.1rem] flex flex-wrap items-center justify-center gap-[0.62rem]">
          <Link
            href="/docs"
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-fd-foreground bg-fd-foreground px-[1.02rem] py-[0.64rem] text-[0.9rem] leading-none font-[500] text-fd-background transition-colors duration-75 hover:bg-fd-card hover:text-fd-foreground"
          >
            Getting Started
          </Link>
          <Link
            href="https://github.com/aidankmcalister/oscli"
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-fd-border bg-fd-card px-[1.02rem] py-[0.64rem] text-[0.9rem] leading-none font-[500] text-fd-foreground transition-colors duration-75 hover:border-fd-foreground hover:bg-fd-accent"
          >
            GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
