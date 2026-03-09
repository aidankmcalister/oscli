"use client";

import Link from "next/link";
import { useState } from "react";

const installCommand = "npm install @oscli-dev/oscli";

type ActiveTab = "code" | "preview";

function HeroPanel({
  title,
  activeTab,
  onTabChange,
  children,
}: {
  title: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-visible rounded-[8px] border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between gap-4 border-b border-fd-border px-4 py-3">
        <span className="text-[13px] font-medium tracking-[0.01em] text-fd-muted-foreground">
          {title}
        </span>

        <div className="inline-flex items-center gap-1 rounded-full border border-fd-border bg-fd-background p-1">
          <button
            type="button"
            onClick={() => onTabChange("code")}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-75",
              activeTab === "code"
                ? "bg-fd-foreground text-fd-background"
                : "text-fd-muted-foreground hover:text-fd-foreground",
            ].join(" ")}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => onTabChange("preview")}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-75",
              activeTab === "preview"
                ? "bg-fd-foreground text-fd-background"
                : "text-fd-muted-foreground hover:text-fd-foreground",
            ].join(" ")}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function ShikiPanel({ html }: { html: string }) {
  return (
    <div
      className={[
        "[&_pre]:!m-0",
        "[&_pre]:!overflow-x-auto",
        "[&_pre]:!bg-transparent",
        "[&_pre]:!p-0",
        "[&_pre]:text-[14px]",
        "[&_pre]:leading-[1.6]",
        "[&_code]:!bg-transparent",
        "[&_code]:!font-mono",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function HomeHeroClient({
  setupHtmlLight,
  setupHtmlDark,
  terminalHtmlLight,
  terminalHtmlDark,
}: {
  setupHtmlLight: string;
  setupHtmlDark: string;
  terminalHtmlLight: string;
  terminalHtmlDark: string;
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

  async function copyInstallCommand() {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const panelTitle = activeTab === "code" ? "setup.ts" : "terminal";

  return (
    <section className="min-h-[100svh] overflow-hidden bg-fd-background px-[clamp(1rem,2vw,1.75rem)] py-6 text-fd-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-[1400px] items-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex items-center lg:min-h-[70svh]">
            <div className="w-full max-w-2xl space-y-[clamp(0.9rem,2vw,1.35rem)] text-left">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fd-muted-foreground">
                  oscli
                </p>
                <h1 className="max-w-4xl text-[clamp(2.45rem,6.3vw,5.1rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance text-fd-foreground">
                  The last CLI framework
                  <br />
                  you&apos;ll reach for.
                </h1>
                <p className="mt-8 max-w-2xl font-sans text-[clamp(1.02rem,2vw,1.35rem)] leading-[1.2] text-balance text-fd-muted-foreground italic">
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

              <div className="mt-[0.1rem] flex flex-wrap items-center gap-[0.62rem]">
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
          </div>

          <div className="mx-auto flex w-full max-w-[600px] items-center lg:max-w-none lg:pl-6">
            <div className="w-full">
              <HeroPanel
                title={panelTitle}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              >
                <div className="grid">
                  <div
                    className={[
                      "col-start-1 row-start-1",
                      activeTab === "code"
                        ? "visible"
                        : "invisible pointer-events-none",
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
                  <div
                    className={[
                      "col-start-1 row-start-1",
                      activeTab === "preview"
                        ? "visible"
                        : "invisible pointer-events-none",
                    ].join(" ")}
                    aria-hidden={activeTab !== "preview"}
                  >
                    <div className="block dark:hidden">
                      <ShikiPanel html={terminalHtmlLight} />
                    </div>
                    <div className="hidden dark:block">
                      <ShikiPanel html={terminalHtmlDark} />
                    </div>
                  </div>
                </div>
              </HeroPanel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
