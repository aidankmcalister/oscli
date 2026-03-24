"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { TerminalBody } from "@/components/terminal-preview";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INSTALL_COMMAND = "npm install @oscli-dev/oscli";

// ---------------------------------------------------------------------------
// Animation frames — the terminal output of a minimal deploy CLI
// ---------------------------------------------------------------------------

const ANIMATION_FRAMES: { code: string; duration: number }[] = [
  {
    code: `╭  deploy
│
│  ? Environment
│  › staging
│    production`,
    duration: 900,
  },
  {
    code: `╭  deploy
│
│  ? Environment
│    staging
│  › production`,
    duration: 500,
  },
  {
    code: `╭  deploy
│
│  ✓ Environment  production`,
    duration: 700,
  },
  {
    code: `╭  deploy
│
│  ✓ Environment  production
│  ? Region
│  › us-east-1
│    eu-west-1`,
    duration: 900,
  },
  {
    code: `╭  deploy
│
│  ✓ Environment  production
│  ✓ Region       us-east-1`,
    duration: 700,
  },
  {
    code: `╭  deploy
│
│  ✓ Environment  production
│  ✓ Region       us-east-1
│
│  ✓ Deployed!
│
╰  Done.`,
    duration: 2800,
  },
];

function AnimatedTerminal() {
  const [frame, setFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function tick() {
      setFrame((prev) => (prev + 1) % ANIMATION_FRAMES.length);
    }
    timerRef.current = setTimeout(tick, ANIMATION_FRAMES[frame].duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [frame]);

  return (
    <div className="min-h-[180px]">
      <TerminalBody code={ANIMATION_FRAMES[frame].code} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Syntax-highlighted code — short, focused on the API shape
// ---------------------------------------------------------------------------

const CODE_SNIPPET_TEXT = `import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  title: "deploy",
  prompts: {
    env: b.select().label("Environment")
      .choices(["staging", "production"]),
    region: b.select().label("Region")
      .choices(["us-east-1", "eu-west-1"]),
  },
}));

await cli.run(async () => {
  cli.intro("deploy");
  await cli.prompt.env();
  await cli.prompt.region();
  cli.success("Deployed!");
  cli.outro("Done.");
});`;

function SyntaxCode() {
  type Token = [cls: string, text: string] | string;
  const K = "token-keyword";
  const S = "token-string";
  const F = "token-fn";
  const P = "token-prop";
  const U = "token-punct";

  const tokens: Token[] = [
    [K, "import"], " ", [U, "{"], " ", [F, "createCLI"], " ", [U, "}"], " ", [K, "from"], " ", [S, '"@oscli-dev/oscli"'], [U, ";"],
    "\n",
    "\n", [K, "const"], " cli = ", [F, "createCLI"], "(", [U, "("], [P, "b"], [U, ")"], " ", [U, "=>"], " ", [U, "({"],
    "\n  title", [U, ":"], " ", [S, '"deploy"'], [U, ","],
    "\n  prompts", [U, ":"], " ", [U, "{"],
    "\n    env", [U, ":"], " ", [P, "b"], ".", [F, "select"], "().", [F, "label"], "(", [S, '"Environment"'], ")",
    "\n      .", [F, "choices"], "(", [U, "["], [S, '"staging"'], [U, ","], " ", [S, '"production"'], [U, "]"], ")", [U, ","],
    "\n    region", [U, ":"], " ", [P, "b"], ".", [F, "select"], "().", [F, "label"], "(", [S, '"Region"'], ")",
    "\n      .", [F, "choices"], "(", [U, "["], [S, '"us-east-1"'], [U, ","], " ", [S, '"eu-west-1"'], [U, "]"], ")", [U, ","],
    "\n  ", [U, "},"],
    "\n", [U, "}));"],
    "\n",
    "\n", [K, "await"], " cli.", [F, "run"], "(", [K, "async"], " ", [U, "()"], " ", [U, "=>"], " ", [U, "{"],
    "\n  cli.", [F, "intro"], "(", [S, '"deploy"'], ")", [U, ";"],
    "\n  ", [K, "await"], " cli.prompt.", [F, "env"], "()", [U, ";"],
    "\n  ", [K, "await"], " cli.prompt.", [F, "region"], "()", [U, ";"],
    "\n  cli.", [F, "success"], "(", [S, '"Deployed!"'], ")", [U, ";"],
    "\n  cli.", [F, "outro"], "(", [S, '"Done."'], ")", [U, ";"],
    "\n", [U, "});"],
  ];

  return (
    <pre className="home-code-pre font-mono leading-relaxed">
      <code>
        {tokens.map((tok, i) =>
          typeof tok === "string" ? (
            <span key={i}>{tok}</span>
          ) : (
            <span key={i} className={tok[0]}>{tok[1]}</span>
          )
        )}
      </code>
    </pre>
  );
}

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
// Home hero — clean two-panel layout
// ---------------------------------------------------------------------------

export function HomeHeroClient() {
  return (
    <section
      className="bg-fd-background text-fd-foreground"
      style={{ minHeight: "calc(100svh - var(--fd-nav-height, 3.5rem))" }}
    >
      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-8 px-[clamp(1.25rem,3vw,2.5rem)] py-16 sm:min-h-[inherit] sm:justify-center">

        {/* Headline */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-center text-[clamp(2.5rem,5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.038em] text-balance text-fd-foreground">
            Build polished CLIs{" "}
            <span className="text-fd-muted-foreground">with TypeScript.</span>
          </h1>
          <p className="max-w-[480px] text-center text-[clamp(0.95rem,1.6vw,1.05rem)] leading-relaxed text-fd-muted-foreground text-balance">
            Type-safe prompts, spinners, progress bars, and themes — from a single{" "}
            <code className="rounded bg-fd-accent px-1.5 py-0.5 font-mono text-[0.88em] text-fd-foreground">
              createCLI
            </code>{" "}
            call.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
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

        {/* Install command */}
        <div className="flex items-center gap-3 rounded-lg border border-fd-border bg-fd-card px-4 py-2">
          <span className="shrink-0 select-none font-mono text-[13px] text-fd-muted-foreground">$</span>
          <code className="font-mono text-[13px] font-medium tracking-tight text-fd-foreground">
            {INSTALL_COMMAND}
          </code>
          <CopyButton text={INSTALL_COMMAND} />
        </div>

        {/* Two-panel showcase: code + terminal output */}
        <div className="grid w-full gap-4 lg:grid-cols-[1fr_1fr]">
          {/* Code */}
          <div className="home-panel overflow-hidden rounded-xl">
            <div className="home-panel-header flex items-center justify-between px-4 py-2.5">
              <span className="font-mono text-[11px] font-medium">src/cli.ts</span>
              <CopyButton text={CODE_SNIPPET_TEXT} />
            </div>
            <div className="overflow-x-auto px-4 py-3 sm:px-5 sm:py-4">
              <SyntaxCode />
            </div>
          </div>

          {/* Terminal output */}
          <div className="home-panel overflow-hidden rounded-xl">
            <div className="home-panel-header flex items-center gap-3 px-4 py-2.5">
              <div className="flex items-center gap-[7px]">
                <span className="block h-[11px] w-[11px] rounded-full" style={{ backgroundColor: "#FF5F57", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 0.5px rgba(0,0,0,0.12)" }} />
                <span className="block h-[11px] w-[11px] rounded-full" style={{ backgroundColor: "#FEBC2E", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 0.5px rgba(0,0,0,0.12)" }} />
                <span className="block h-[11px] w-[11px] rounded-full" style={{ backgroundColor: "#28C840", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 0.5px rgba(0,0,0,0.12)" }} />
              </div>
              <span className="font-mono text-[11px] font-medium">output</span>
            </div>
            <div className="overflow-x-auto px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-[280px]">
                <AnimatedTerminal />
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
