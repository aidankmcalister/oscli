"use client";

import Link from "next/link";
import { useState } from "react";
import { TerminalBody } from "@/components/terminal-preview";

const INSTALL_COMMAND = "npm install @oscli-dev/oscli";

// A rich mid-run snapshot: completed prompts, a live-animated spinner with
// a progress bar in-flight, and an active select — shows the breadth of
// oscli output in a single frame. The ⠋ glyph renders as a live SpinnerGlyph
// inside TerminalBody, so it actually animates in the browser.
const DEMO_OUTPUT = `╭  deploy

  ✓  Environment  production
  ✓  Region       us-east-1

  ✓  Build   [████████████] [00:02] 100%
  ⠋  Upload  [████████░░░░] [00:01]  67%

│  ? Confirm deploy to production?
│  › ● Yes  ○ No
│    ↑↓ navigate   enter select`;

function CopyButton({ text }: { text: string }) {
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
      aria-label="Copy install command"
      className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-medium text-fd-muted-foreground transition-colors duration-100 hover:text-fd-foreground"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M8 4V2.8A.8.8 0 0 0 7.2 2H1.8A.8.8 0 0 0 1 2.8v5.4A.8.8 0 0 0 1.8 9H3"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function TerminalDots() {
  const dots = ["#FF5F57", "#FEBC2E", "#28C840"] as const;
  return (
    <div className="flex items-center gap-2">
      {dots.map((color) => (
        <span
          key={color}
          className="block h-[10px] w-[10px] rounded-full"
          style={{
            backgroundColor: color,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(0,0,0,0.18)",
          }}
        />
      ))}
    </div>
  );
}

export function HomeHeroClient() {
  return (
    <section
      className="bg-fd-background text-fd-foreground"
      style={{ minHeight: "calc(100svh - var(--fd-nav-height, 3.5rem))" }}
    >
      <div className="mx-auto flex min-h-[inherit] w-full max-w-[880px] flex-col items-center justify-center gap-10 px-[clamp(1.25rem,3vw,2.5rem)] py-16">

        {/* Headline — nothing else, let it breathe */}
        <h1 className="text-center text-[clamp(2.75rem,5.5vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.038em] text-balance text-fd-foreground">
          Build polished CLIs with TypeScript.
        </h1>

        {/* Terminal — the product story, full width, centerstage */}
        <div className="w-full overflow-hidden rounded-xl border border-fd-border bg-fd-card">
          <div className="flex items-center gap-3 border-b border-fd-border px-4 py-3">
            <TerminalDots />
            <span className="font-mono text-[11px] font-medium text-fd-muted-foreground">
              oscli — deploy
            </span>
          </div>
          <div className="overflow-hidden p-5">
            <TerminalBody code={DEMO_OUTPUT} />
          </div>
        </div>

        {/* Install + CTAs — anchored below the terminal */}
        <div className="flex w-full flex-wrap items-center gap-y-4 gap-x-6 border-t border-fd-border pt-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 select-none font-mono text-[13px] text-fd-muted-foreground">
              $
            </span>
            <code className="flex-1 overflow-x-auto text-[13px] font-medium tracking-tight text-fd-foreground">
              {INSTALL_COMMAND}
            </code>
            <CopyButton text={INSTALL_COMMAND} />
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <Link
              href="/docs"
              className="group flex items-center gap-1.5 text-[0.9rem] font-medium text-fd-foreground transition-opacity hover:opacity-70"
            >
              Get started
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                className="transition-transform duration-100 group-hover:translate-x-0.5"
                aria-hidden
              >
                <path
                  d="M2.5 6.5h8M7 3l3.5 3.5L7 10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <span className="text-fd-border" aria-hidden>·</span>
            <Link
              href="https://github.com/aidankmcalister/oscli"
              target="_blank"
              rel="noreferrer"
              className="text-[0.9rem] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              GitHub
            </Link>
            <span className="text-fd-border" aria-hidden>·</span>
            <Link
              href="https://www.npmjs.com/package/@oscli-dev/oscli"
              target="_blank"
              rel="noreferrer"
              className="text-[0.9rem] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              npm
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
