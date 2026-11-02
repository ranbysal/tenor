"use client";

import { useCallback, useState } from "react";
import YieldSurface from "./YieldSurface";
import { MONTHS, TENORS, formatMonth, type Month } from "@/lib/yields";

const LATEST = MONTHS.at(-1)!;
const nav = ["Product", "Specimens", "Briefing", "Pricing"];

function pct(v: number, signed = false) {
  const s = v.toFixed(2);
  return signed && v > 0 ? `+${s}` : s;
}

function MiniCurve({ m }: { m: Month }) {
  const max = 9;
  const pts = m.curve
    .map((v, i) => `${(i / (m.curve.length - 1)) * 100},${40 - (v / max) * 40}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-10 w-full overflow-visible" preserveAspectRatio="none">
      <line x1="0" y1="40" x2="100" y2="40" stroke="currentColor" strokeOpacity=".25" vectorEffect="non-scaling-stroke" />
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function Hero() {
  const [hover, setHover] = useState<Month | null>(null);
  const onHover = useCallback((m: Month | null) => setHover(m), []);
  const m = hover ?? LATEST;

  return (
    <section className="grain relative isolate min-h-[100svh] overflow-hidden bg-blue text-bone">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_100%,var(--blue-deep)_0%,transparent_60%)]" />

      <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-6 pt-6 md:px-10">
        <span className="font-display text-[26px] leading-none tracking-[0.02em]">TENOR</span>
        <nav className="hidden gap-9 font-mono text-[11px] uppercase tracking-[0.14em] text-bone/75 md:flex">
          {nav.map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`} className="transition-colors hover:text-bone">
              {n}
            </a>
          ))}
        </nav>
        <a
          href="#pricing"
          className="rounded-full bg-bone px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-transform hover:-translate-y-px"
        >
          Request access
        </a>
      </header>

      <div className="pointer-events-none relative z-10 mx-auto grid max-w-[1440px] gap-8 px-6 pt-14 md:grid-cols-[1fr_auto] md:items-end md:px-10 md:pt-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone/70">
            Regime intelligence for fixed income
          </p>
          <h1 className="mt-5 max-w-[14ch] font-serif text-[clamp(46px,6.4vw,100px)] leading-[0.95] tracking-[-0.025em]">
            Know when the market changes its mind.
          </h1>
        </div>
        <div className="pointer-events-auto max-w-[30ch] pb-3">
          <p className="text-[17px] leading-[1.5] text-bone/80">
            Tenor reads rates, volatility and credit every morning, and tells
            your desk the day the regime turns.
          </p>
          <div className="mt-6 flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em]">
            <a href="#pricing" className="whitespace-nowrap rounded-full bg-bone px-4 py-2.5 text-ink transition-transform hover:-translate-y-px">
              Request access
            </a>
            <a href="#briefing" className="whitespace-nowrap text-bone/80 transition-colors hover:text-bone">
              Read a briefing →
            </a>
          </div>
        </div>
      </div>

      {/* The surface: full-bleed, sits under the copy on the right. */}
      <div className="absolute inset-x-0 bottom-0 top-[40%]">
        <YieldSurface onHover={onHover} />
      </div>

      {/* HUD: figure caption, bottom-left */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 font-mono text-[10px] uppercase leading-[1.7] tracking-[0.14em] text-bone/65 md:left-10">
        <div>Fig. 01 — U.S. Treasury constant maturity</div>
        <div>
          {formatMonth(MONTHS[0].date)} → {formatMonth(LATEST.date)} · {MONTHS.length} months × {TENORS.length} tenors
        </div>
        <div className="mt-1 flex items-center gap-2 text-bone/80">
          <span className="text-ink">/x/</span> inverted curve
          <span className="ml-3 text-signal">##</span> hover to scrub
        </div>
      </div>

      {/* HUD: readout card, bottom-right */}
      <aside className="absolute bottom-6 right-6 z-10 hidden w-[260px] md:block border border-bone/25 bg-ink/35 p-4 font-mono text-[11px] uppercase tracking-[0.1em] backdrop-blur-md md:right-10">
        <div className="flex items-center justify-between text-bone/60">
          <span>{hover ? "Scrubbing" : "Last print"}</span>
          <span>{formatMonth(m.date)}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-display text-[22px] normal-case leading-none tracking-[0.02em]">
            {m.regime}
          </span>
          <span className={m.inverted ? "text-signal" : "text-bone/60"}>
            {m.inverted ? "Inverted" : "Normal"}
          </span>
        </div>
        <div className="mt-3 text-bone/85">
          <MiniCurve m={m} />
          <div className="mt-1 flex justify-between text-[9px] text-bone/50">
            <span>3M</span>
            <span>2Y</span>
            <span>10Y</span>
            <span>30Y</span>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-y-1.5 border-t border-bone/20 pt-3 text-bone/60">
          <dt>10Y</dt>
          <dd className="text-right text-bone">{pct(m.curve[7])}%</dd>
          <dt>2s10s</dt>
          <dd className="text-right text-bone">{pct(m.s2s10, true)}</dd>
          <dt>VIX</dt>
          <dd className="text-right text-bone">{m.vix != null ? m.vix.toFixed(1) : "—"}</dd>
          <dt>3M</dt>
          <dd className="text-right text-bone">{pct(m.curve[0])}%</dd>
        </dl>
      </aside>
    </section>
  );
}
