"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { TerminalBody } from "@/components/terminal-preview";

const INSTALL_COMMAND = "npm install @oscli-dev/oscli";

// ---------------------------------------------------------------------------
// Animation frames — each frame is what the terminal shows at that point.
// These match exactly what the code on the left would produce when run.
// ---------------------------------------------------------------------------

const ANIMATION_FRAMES: { code: string; duration: number }[] = [
  // intro appears
  {
    code: `╭  deploy`,
    duration: 700,
  },
  // env prompt shown (cursor on staging)
  {
    code: `╭  deploy
│
│  ? Environment
│  › staging
│    production`,
    duration: 900,
  },
  // cursor moves to production
  {
    code: `╭  deploy
│
│  ? Environment
│    staging
│  › production`,
    duration: 500,
  },
  // env answered
  {
    code: `╭  deploy
│
│  ✓ Environment  production`,
    duration: 700,
  },
  // region prompt shown
  {
    code: `╭  deploy
│
│  ✓ Environment  production
│  ? Region
│  › us-east-1
│    eu-west-1`,
    duration: 900,
  },
  // region answered
  {
    code: `╭  deploy
│
│  ✓ Environment  production
│  ✓ Region       us-east-1`,
    duration: 700,
  },
  // success + outro
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
      setFrame((prev) => {
        const next = (prev + 1) % ANIMATION_FRAMES.length;
        return next;
      });
    }

    timerRef.current = setTimeout(tick, ANIMATION_FRAMES[frame].duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [frame]);

  return (
    <div className="min-h-[200px]">
      <TerminalBody code={ANIMATION_FRAMES[frame].code} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Complete code example — shows createCLI schema + cli.run usage
// ---------------------------------------------------------------------------

const CODE_SNIPPET_TEXT = `import { createCLI } from "@oscli-dev/oscli";

const cli = createCLI((b) => ({
  title: "deploy",
  prompts: {
    env: b.select().label("Environment")
      .choices(["staging", "production"]),
    region: b.select().label("Region")
      .choices(["us-east-1", "eu-west-1"]),
    confirm: b.confirm().label("Confirm deploy?"),
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
    "\n    confirm", [U, ":"], " ", [P, "b"], ".", [F, "confirm"], "().", [F, "label"], "(", [S, '"Confirm deploy?"'], ")", [U, ","],
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
// Home hero
// ---------------------------------------------------------------------------

export function HomeHeroClient() {
  return (
    <section
      className="bg-fd-background text-fd-foreground"
      style={{ minHeight: "calc(100svh - var(--fd-nav-height, 3.5rem))" }}
    >
      <div className="mx-auto flex w-full max-w-[960px] flex-col items-center gap-5 px-[clamp(1.25rem,3vw,2.5rem)] py-10 sm:min-h-[inherit] sm:justify-center">

        {/* Headline */}
        <h1 className="text-center text-[clamp(2.5rem,5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.038em] text-balance text-fd-foreground">
          Build polished CLIs with TypeScript.
        </h1>

        {/* Subheadline */}
        <p className="max-w-[540px] text-center text-[clamp(1rem,1.8vw,1.125rem)] leading-relaxed text-fd-muted-foreground text-balance">
          Prompts, spinners, progress bars, and themes — from a single{" "}
          <code className="rounded bg-fd-accent px-1.5 py-0.5 font-mono text-[0.9em] text-fd-foreground">
            createCLI
          </code>{" "}
          call.
        </p>

        {/* Install command — front and center */}
        <div className="flex items-center gap-3 rounded-lg border border-fd-border bg-fd-card px-4 py-2.5">
          <span className="shrink-0 select-none font-mono text-[13px] text-fd-muted-foreground">$</span>
          <code className="font-mono text-[13px] font-medium tracking-tight text-fd-foreground">
            {INSTALL_COMMAND}
          </code>
          <CopyButton text={INSTALL_COMMAND} />
        </div>

        {/* Side-by-side: code → animated terminal output */}
        <div className="grid w-full gap-4 lg:grid-cols-2">
          {/* Code snippet */}
          <div className="home-panel overflow-hidden rounded-xl">
            <div className="home-panel-header flex items-center justify-between px-4 py-2.5">
              <span className="font-mono text-[11px] font-medium">src/cli.ts</span>
              <CopyButton text={CODE_SNIPPET_TEXT} />
            </div>
            <div className="overflow-x-auto px-4 py-3 sm:px-5 sm:py-4">
              <SyntaxCode />
            </div>
          </div>

          {/* Animated terminal output */}
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

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link
            href="/docs"
            className="group flex items-center gap-1.5 text-[0.9rem] font-medium text-fd-foreground transition-opacity hover:opacity-70"
          >
            Get started
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="transition-transform duration-100 group-hover:translate-x-0.5" aria-hidden>
              <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="text-fd-border" aria-hidden>·</span>
          <Link href="/builder" className="text-[0.9rem] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground">
            Builder
          </Link>
          <span className="text-fd-border" aria-hidden>·</span>
          <Link href="https://github.com/aidankmcalister/oscli" target="_blank" rel="noreferrer" className="text-[0.9rem] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground">
            GitHub
          </Link>
          <span className="text-fd-border" aria-hidden>·</span>
          <Link href="https://www.npmjs.com/package/@oscli-dev/oscli" target="_blank" rel="noreferrer" className="text-[0.9rem] font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground">
            npm
          </Link>
        </div>

      </div>
    </section>
  );
}
