"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OscliDemo } from "@oscli-dev/react";
import { homeDemos } from "@/lib/home-demos";

const installCommand = "bun add @oscli-dev/oscli";
const DEMO_ADVANCE_DELAY = 2200;
const DEMO_EXIT_DURATION = 320;
const DEMO_ENTER_DURATION = 500;
const DEMO_ENTER_ANIMATION =
  "animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95 duration-500 ease-out";
const DEMO_EXIT_ANIMATION =
  "animate-out fade-out-0 zoom-out-95 duration-300 ease-in";

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

function DemoPager({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {homeDemos.map((demo, index) => (
        <button
          key={demo.id}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Show ${demo.title} demo`}
          className={[
            "h-2.5 rounded-full transition-all duration-150",
            activeIndex === index
              ? "w-5 bg-fd-foreground"
              : "w-2.5 bg-fd-border hover:bg-fd-muted-foreground",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function HomeHeroClient() {
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const advanceTimeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionResetRef = useRef<number | null>(null);
  const activeDemoIndexRef = useRef(0);
  const [panelAnimation, setPanelAnimation] = useState("");
  const activeDemo = homeDemos[activeDemoIndex]!;
  activeDemoIndexRef.current = activeDemoIndex;

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current !== null) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (transitionResetRef.current !== null) {
        window.clearTimeout(transitionResetRef.current);
      }
    };
  }, []);

  function clearAdvanceTimeout() {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }

  function clearTransitionTimeouts() {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (transitionResetRef.current !== null) {
      window.clearTimeout(transitionResetRef.current);
      transitionResetRef.current = null;
    }
  }

  function transitionToDemo(index: number) {
    if (index === activeDemoIndexRef.current) {
      return;
    }

    clearAdvanceTimeout();
    clearTransitionTimeouts();
    setPanelAnimation(DEMO_EXIT_ANIMATION);

    transitionTimeoutRef.current = window.setTimeout(() => {
      setActiveDemoIndex(index);
      setPanelAnimation(DEMO_ENTER_ANIMATION);
      transitionResetRef.current = window.setTimeout(() => {
        setPanelAnimation("");
        transitionResetRef.current = null;
      }, DEMO_ENTER_DURATION);
      transitionTimeoutRef.current = null;
    }, DEMO_EXIT_DURATION);
  }

  function queueNextDemo() {
    clearAdvanceTimeout();
    advanceTimeoutRef.current = window.setTimeout(() => {
      transitionToDemo((activeDemoIndexRef.current + 1) % homeDemos.length);
      advanceTimeoutRef.current = null;
    }, DEMO_ADVANCE_DELAY);
  }

  function selectDemo(index: number) {
    transitionToDemo(index);
  }

  return (
    <section
      className="overflow-hidden bg-fd-background text-fd-foreground"
      style={{ height: "calc(100svh - var(--fd-nav-height, 3.5rem))" }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1380px] items-center px-[clamp(1.25rem,3vw,2.5rem)]">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          <div className="space-y-7">
            <h1 className="text-[clamp(2.5rem,5.8vw,5rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-balance text-fd-foreground">
              Build polished CLIs
              <br />
              with TypeScript.
            </h1>

            <p className="max-w-[30ch] text-[clamp(0.95rem,1.3vw,1.1rem)] leading-snug text-fd-muted-foreground">
              Prompts, logs, tables, trees, diffs, spinners, and progress from
              one builder API.
            </p>

            <div className="flex items-center gap-4 rounded-lg border border-fd-border bg-fd-card px-4 py-3">
              <code className="flex-1 overflow-x-auto text-[13px] font-medium tracking-tight text-fd-foreground">
                {installCommand}
              </code>
              <CopyButton text={installCommand} />
            </div>

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

          <div className="flex items-center">
            <div className="w-full overflow-hidden rounded-xl border border-fd-border bg-fd-card">
              <div className="flex items-center justify-between border-b border-fd-border px-4 py-[10px]">
                <div className="flex min-w-0 items-center gap-3">
                  <TerminalDots />
                  <span className="text-[11px] font-medium tracking-wide text-fd-muted-foreground">
                    terminal
                  </span>
                </div>
                <DemoPager
                  activeIndex={activeDemoIndex}
                  onSelect={selectDemo}
                />
              </div>

              <div className="h-[min(56svh,460px)] overflow-hidden p-5">
                <div className={`h-full ${panelAnimation}`.trim()}>
                  <OscliDemo
                    key={activeDemo.id}
                    cli={activeDemo.cli}
                    answers={activeDemo.answers}
                    replay={false}
                    fade={false}
                    speed="fast"
                    onRunComplete={queueNextDemo}
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
