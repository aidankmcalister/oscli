"use client";

import Link from "next/link";
import { useState } from "react";
import { OscliDemo } from "@oscli-dev/react";
import { cli as createAppCli } from "../../examples/create-app";

const installCommand = "npm install @oscli-dev/oscli";

type ActiveTab = "code" | "preview";

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-fd-border bg-fd-background px-4 py-[0.55rem] text-[0.85rem] leading-none font-medium text-fd-muted-foreground transition-colors duration-75 hover:border-fd-foreground hover:text-fd-foreground"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
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
    <div className="inline-flex items-center gap-0.5 rounded-full border border-fd-border bg-fd-background p-[3px]">
      {(["preview", "code"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={[
            "rounded-full px-3 py-[5px] text-[11px] font-medium capitalize transition-all duration-100",
            activeTab === tab
              ? "bg-fd-foreground text-fd-background shadow-sm"
              : "text-fd-muted-foreground hover:text-fd-foreground",
          ].join(" ")}
        >
          {tab === "preview" ? "Demo" : "Code"}
        </button>
      ))}
    </div>
  );
}

function TerminalDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="block h-[10px] w-[10px] rounded-full bg-fd-border" />
      <span className="block h-[10px] w-[10px] rounded-full bg-fd-border" />
      <span className="block h-[10px] w-[10px] rounded-full bg-fd-border" />
    </div>
  );
}

function ShikiPanel({ html }: { html: string }) {
  return (
    <div
      className={[
        "[&_pre]:!m-0 [&_pre]:!overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-0",
        "[&_pre]:text-[11.5px] [&_pre]:leading-[1.6]",
        "[&_code]:!bg-transparent [&_code]:!font-mono",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeHeroClient({
  setupHtmlLight,
  setupHtmlDark,
}: {
  setupHtmlLight: string;
  setupHtmlDark: string;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

  return (
    <section className="min-h-[100svh] overflow-hidden bg-fd-background px-[clamp(1rem,2vw,1.75rem)] py-6 text-fd-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-[1400px] items-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">

          {/* ── Left: hero copy ── */}
          <div className="flex items-center lg:min-h-[72svh]">
            <div className="w-full max-w-xl space-y-6 text-left">

              <div className="space-y-3">
                <h1 className="text-[clamp(2.6rem,6vw,5rem)] font-semibold leading-[0.93] tracking-[-0.04em] text-balance text-fd-foreground">
                  The last CLI framework
                  <br />
                  you&apos;ll reach for.
                </h1>
                <p className="max-w-sm text-[clamp(0.9rem,1.4vw,1.05rem)] leading-relaxed text-fd-muted-foreground">
                  TypeScript-first. One builder API for prompts, flags, and output. Typed values everywhere.
                </p>
              </div>

              {/* Install command */}
              <div className="w-full max-w-md rounded-xl border border-fd-border bg-fd-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <code className="overflow-x-auto text-sm font-medium tracking-tight text-fd-foreground">
                    {installCommand}
                  </code>
                  <CopyButton text={installCommand} />
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href="/docs"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-fd-foreground bg-fd-foreground px-5 py-[0.6rem] text-[0.88rem] leading-none font-medium text-fd-background transition-colors duration-75 hover:bg-fd-card hover:text-fd-foreground"
                >
                  Get started
                </Link>
                <Link
                  href="https://github.com/aidankmcalister/oscli"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-fd-border bg-fd-card px-5 py-[0.6rem] text-[0.88rem] leading-none font-medium text-fd-foreground transition-colors duration-75 hover:border-fd-foreground"
                >
                  GitHub
                </Link>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {["Typed prompts", "Flag bypass", "JSON mode", "Test harness"].map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-fd-border bg-fd-card px-3 py-1 text-[11px] font-medium tracking-wide text-fd-muted-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: demo panel ── */}
          <div className="mx-auto w-full max-w-[540px] lg:max-w-none">
            <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">

              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-fd-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <TerminalDots />
                  <span className="text-[12px] font-medium tracking-wide text-fd-muted-foreground">
                    {activeTab === "preview" ? "terminal" : "setup.ts"}
                  </span>
                </div>
                <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
              </div>

              {/* Panel content */}
              <div className="relative min-h-[340px] p-5">
                {/* Code view */}
                <div
                  className={[
                    "absolute inset-0 p-5 transition-opacity duration-200",
                    activeTab === "code" ? "opacity-100" : "pointer-events-none opacity-0",
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

                {/* Demo view */}
                <div
                  className={[
                    "absolute inset-0 p-5 transition-opacity duration-200",
                    activeTab === "preview" ? "opacity-100" : "pointer-events-none opacity-0",
                  ].join(" ")}
                  aria-hidden={activeTab !== "preview"}
                >
                  <div className="block dark:hidden">
                    <OscliDemo
                      cli={createAppCli}
                      theme="light"
                      timing={{ typeDelay: 90, promptDelay: 720, completionDelay: 180 }}
                      replayDelay={2800}
                    />
                  </div>
                  <div className="hidden dark:block">
                    <OscliDemo
                      cli={createAppCli}
                      theme="dark"
                      timing={{ typeDelay: 90, promptDelay: 720, completionDelay: 180 }}
                      replayDelay={2800}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
