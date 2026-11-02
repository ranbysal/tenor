const nav = ["Product", "Specimens", "Briefing", "Pricing"];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 font-mono text-[13px] uppercase tracking-[0.08em]">
        <span className="font-medium">Tenor</span>
        <nav className="hidden gap-8 text-ink-soft sm:flex">
          {nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </nav>
        <span className="border border-ink px-3 py-1.5">Request access</span>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 pt-16 pb-24">
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-soft">
          Regime intelligence for fixed income
        </p>
        <h1 className="mt-6 max-w-4xl text-[clamp(44px,7vw,96px)] leading-[0.98] tracking-[-0.02em]">
          Know when the market <em>changes its mind.</em>
        </h1>
        <p className="mt-8 max-w-xl text-xl leading-relaxed text-ink-soft">
          Tenor watches rates, volatility and credit, and tells portfolio
          managers the morning the market moves into a new regime.
        </p>

        <figure className="mt-16 border-t border-rule pt-4">
          <div className="flex h-[420px] items-center justify-center border border-dashed border-rule font-mono text-[12px] uppercase tracking-[0.12em] text-ink-soft">
            U.S. Treasury yield surface · 1990–2026 · in progress
          </div>
          <figcaption className="mt-3 flex justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
            <span>Fig. 1 — Constant-maturity yields, 3M to 30Y</span>
            <span>Source: FRED, Federal Reserve Bank of St. Louis</span>
          </figcaption>
        </figure>
      </section>
    </main>
  );
}
