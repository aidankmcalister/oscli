"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OscliDemo } from "@oscli-dev/react";
import { homeDemos } from "@/lib/home-demos";

const installCommand = "npm install @oscli-dev/oscli";
const DEMO_HOLD_DELAY = 1800;
const DEMO_TRANSITION_DURATION = 240;

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
  const dots = ["#FF5F57", "#FEBC2E", "#28C840"] as const;

  return (
    <div className="flex items-center gap-2">
      {dots.map((color) => (
        <span
          key={color}
          className="block h-[10px] w-[10px] rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
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
            "h-2.5 rounded-full transition-all duration-200",
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
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const activeDemoIndexRef = useRef(0);
  const advanceTimeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const enterFrameRef = useRef<number | null>(null);
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
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(enterFrameRef.current);
      }
    };
  }, []);

  function clearAdvanceTimeout() {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }

  function clearTransitionHandlers() {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (enterFrameRef.current !== null) {
      window.cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }
  }

  function transitionToDemo(index: number) {
    if (index === activeDemoIndexRef.current) {
      return;
    }

    clearAdvanceTimeout();
    clearTransitionHandlers();
    setIsPanelVisible(false);

    transitionTimeoutRef.current = window.setTimeout(() => {
      setActiveDemoIndex(index);
      transitionTimeoutRef.current = null;
      enterFrameRef.current = window.requestAnimationFrame(() => {
        setIsPanelVisible(true);
        enterFrameRef.current = null;
      });
    }, DEMO_TRANSITION_DURATION);
  }

  function queueNextDemo() {
    clearAdvanceTimeout();
    advanceTimeoutRef.current = window.setTimeout(() => {
      transitionToDemo((activeDemoIndexRef.current + 1) % homeDemos.length);
      advanceTimeoutRef.current = null;
    }, DEMO_HOLD_DELAY);
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
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <div className="space-y-6">
            <h1 className="text-4xl leading-8 font-semibold leading-[0.92] tracking-[-0.04em] text-balance text-fd-foreground sm:text-5xl lg:text-6xl">
              Build polished CLIs with TypeScript.
            </h1>

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
              <div className="flex items-center justify-between border-b border-fd-border px-4 py-3">
                <TerminalDots />
                <DemoPager
                  activeIndex={activeDemoIndex}
                  onSelect={selectDemo}
                />
              </div>

              <div className="h-[min(58svh,480px)] overflow-hidden p-5">
                <div
                  className="h-full"
                  style={{
                    opacity: isPanelVisible ? 1 : 0,
                    transform: isPanelVisible
                      ? "translate3d(0, 0, 0) scale(1)"
                      : "translate3d(0, 10px, 0) scale(0.985)",
                    transition: `opacity ${DEMO_TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${DEMO_TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                    willChange: "opacity, transform",
                  }}
                >
                  <OscliDemo
                    key={activeDemo.id}
                    cli={activeDemo.cli}
                    answers={activeDemo.answers}
                    theme={activeDemo.terminalTheme ?? "auto"}
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
