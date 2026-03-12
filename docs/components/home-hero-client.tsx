"use client";

import Link from "next/link";
import { useState } from "react";
import { OscliDemo } from "@oscli-dev/react";
import { cli as createAppDemoCli } from "@/lib/create-app-demo";

const installCommand = "bun add @oscli-dev/oscli";

type ActiveTab = "code" | "preview";

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-medium text-fd-muted-foreground transition-colors duration-75 hover:text-fd-foreground"
    >
      {copied ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
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
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <rect
              x="4"
              y="4"
              width="7"
              height="7"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.2"
            />
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
  return (
    <div className="flex items-center gap-[5px]">
      <span className="block h-[9px] w-[9px] rounded-full border border-fd-border bg-fd-background" />
      <span className="block h-[9px] w-[9px] rounded-full border border-fd-border bg-fd-background" />
      <span className="block h-[9px] w-[9px] rounded-full border border-fd-border bg-fd-background" />
    </div>
  );
}

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-fd-border bg-fd-background p-[3px]">
      {(["preview", "code"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={[
            "rounded-full px-3 py-[5px] text-[11px] font-medium capitalize transition-all duration-100",
            activeTab === tab
              ? "bg-fd-foreground text-fd-background"
              : "text-fd-muted-foreground hover:text-fd-foreground",
          ].join(" ")}
        >
          {tab === "preview" ? "Demo" : "Code"}
        </button>
      ))}
    </div>
  );
}

function ShikiPanel({ html }: { html: string }) {
  return (
    <div
      className="[&_pre]:!m-0 [&_pre]:!overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:text-[11.5px] [&_pre]:leading-[1.65] [&_code]:!bg-transparent [&_code]:!font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HomeHeroClient({
  setupHtmlLight,
  setupHtmlDark,
}: {
  setupHtmlLight: string;
  setupHtmlDark: string;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

  return (
    <section
      className="overflow-hidden bg-fd-background text-fd-foreground"
      style={{ height: "calc(100svh - var(--fd-nav-height, 3.5rem))" }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1380px] items-center px-[clamp(1.25rem,3vw,2.5rem)]">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          {/* ── Left: hero copy ── */}
          <div className="space-y-7">
            <h1 className="text-[clamp(2.5rem,5.8vw,5rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-balance text-fd-foreground">
              Build polished CLIs
              <br />
              with TypeScript.
            </h1>

            <p className="max-w-[30ch] text-[clamp(0.95rem,1.3vw,1.1rem)] leading-snug text-fd-muted-foreground">
              Typed prompts, flags, and output with one builder API.
            </p>

            {/* Install command */}
            <div className="flex items-center gap-4 rounded-lg border border-fd-border bg-fd-card px-4 py-3">
              <code className="flex-1 overflow-x-auto text-[13px] font-medium tracking-tight text-fd-foreground">
                {installCommand}
              </code>
              <CopyButton text={installCommand} />
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-5">
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
              <span className="text-fd-border">·</span>
              <Link
                href="https://github.com/aidankmcalister/oscli"
                target="_blank"
                rel="noreferrer"
                className="text-[0.9rem] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                GitHub
              </Link>
              <span className="text-fd-border">·</span>
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

          {/* ── Right: demo panel ── */}
          <div className="flex items-center">
            <div className="w-full overflow-hidden rounded-xl border border-fd-border bg-fd-card">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-fd-border px-4 py-[10px]">
                <div className="flex items-center gap-3">
                  <TerminalDots />
                  <span className="text-[11px] font-medium tracking-wide text-fd-muted-foreground">
                    {activeTab === "preview" ? "terminal" : "cli.ts"}
                  </span>
                </div>
                <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              {/* Panel content — fixed height, scrollable internally */}
              <div className="relative h-[min(52svh,440px)] overflow-hidden">
                {/* Code */}
                <div
                  className={[
                    "absolute inset-0 overflow-y-auto p-5 transition-opacity duration-200",
                    activeTab === "code"
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  ].join(" ")}
                  aria-hidden={activeTab !== "code"}
                >
                  <div className="block dark:hidden">
                    <ShikiPanel html={setupHtmlLight} />
                  </div>
                  <div className="hidden dark:block">
                    <ShikiPanel html={setupHtmlDark} />
                  </div>
                </div>

                {/* Demo */}
                <div
                  className={[
                    "absolute inset-0 overflow-hidden p-5 transition-opacity duration-200",
                    activeTab === "preview"
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  ].join(" ")}
                  aria-hidden={activeTab !== "preview"}
                >
                  <OscliDemo
                    cli={createAppDemoCli}
                    answers={{ framework: "next" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
