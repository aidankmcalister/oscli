"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INSTALL_COMMAND = "npm install @oscli-dev/oscli";

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy"
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-medium text-fd-muted-foreground transition-colors duration-100 hover:text-fd-foreground ${className}`}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 4V2.8A.8.8 0 0 0 7.2 2H1.8A.8.8 0 0 0 1 2.8v5.4A.8.8 0 0 0 1.8 9H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export function HomeHeroClient({ codeHtml, codeText, cardHtmls }: { codeHtml: string; codeText: string; cardHtmls: string[] }) {
  return (
    <div className="bg-fd-background text-fd-foreground">

      {/* ── Hero ── */}
      <section className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-12 px-[clamp(1.25rem,3vw,2.5rem)] py-20 lg:grid-cols-[minmax(0,1fr)_max-content] lg:gap-12 lg:py-32">

        {/* Left: text */}
        <div className="flex flex-col items-start gap-7">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fd-muted-foreground">
              TypeScript CLI Framework
            </span>
            <h1
              className="text-[clamp(2.2rem,3.2vw,3.4rem)] leading-[1.08] tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              <span className="block font-bold text-fd-foreground">Build polished CLIs</span>
              <span className="block font-light italic text-fd-muted-foreground">with TypeScript.</span>
            </h1>
          </div>

          <div className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-fd-border bg-fd-card px-4 py-2.5">
            <span className="shrink-0 select-none font-mono text-[13px] text-fd-muted-foreground">$</span>
            <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] font-medium tracking-tight text-fd-foreground" style={{ scrollbarWidth: "none" }}>
              {INSTALL_COMMAND}
            </code>
            <CopyButton text={INSTALL_COMMAND} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/docs"
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "px-5")}
            >
              Get started
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 7h8M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="https://github.com/aidankmcalister/oscli"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-5")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </Link>
          </div>
        </div>

        {/* Right: code */}
        <div className="home-panel rounded-xl">
          <div className="home-panel-header flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-[11px] font-medium">src/cli.ts</span>
            <CopyButton text={codeText} />
          </div>
          <div className="home-shiki-wrap px-5 py-4"
            dangerouslySetInnerHTML={{ __html: codeHtml }}
          />
        </div>

      </section>

      {/* ── Feature grid ── */}
      <section className="mx-auto w-full max-w-[1120px] px-[clamp(1.25rem,3vw,2.5rem)] pb-16 pt-2">
        <div className="overflow-hidden rounded-xl border border-fd-border">
          <div className="grid grid-cols-1 gap-px bg-fd-border sm:grid-cols-2 lg:grid-cols-3">
            {([
              { title: "Run your prompts",   body: "Await any prompt. The typed value is stored in cli.storage automatically." },
              { title: "Access stored data", body: "Read any answered prompt by name. Fully typed, available anywhere in your run handler." },
              { title: "Spin async work",    body: "Wrap any async function in a spinner. Shows elapsed time on completion." },
              { title: "Type-safe flags",    body: "Define flags in the same schema as your prompts. Read via cli.flags, fully typed." },
              { title: "Themeable",          body: "Choose a built-in preset or customize colors and symbols via the theme property." },
              { title: "Rich display",       body: "Boxes, notes, tables, trees, and progress bars. All styled by your theme." },
            ]).map((card, i) => (
              <div key={card.title} className="flex flex-col gap-5 bg-fd-card px-5 py-5 sm:gap-6">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="home-shiki-wrap home-shiki-card"
                    dangerouslySetInnerHTML={{ __html: cardHtmls[i] }}
                  />
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-fd-muted-foreground/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.9rem] font-semibold text-fd-foreground" style={{ fontFamily: "var(--font-fraunces)" }}>{card.title}</span>
                  <span className="text-[0.78rem] leading-relaxed text-fd-muted-foreground">{card.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-fd-border">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center justify-between gap-4 px-[clamp(1.25rem,3vw,2.5rem)] py-8 sm:flex-row">
          <span className="font-mono text-xs tracking-widest text-fd-muted-foreground uppercase">
            oscli · TypeScript CLI Framework
          </span>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/aidankmcalister/oscli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              GitHub
            </a>
            <a
              href="/docs"
              className="text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              Docs
            </a>
            <a
              href="https://www.npmjs.com/package/@oscli-dev/oscli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              npm
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
