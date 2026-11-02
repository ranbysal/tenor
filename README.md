# Tenor

Marketing site for **Tenor**, a fictional regime-intelligence desk for fixed-income portfolio managers. A design study by Sal Ismail.

The hero is a 3D surface of U.S. Treasury yields from 1990 to today, rendered entirely in ASCII on a hand-written canvas renderer. Inverted-curve periods use a separate glyph set.

## Develop

```bash
npm install
npm run dev
```

## Data

Monthly-average constant-maturity Treasury yields (3M–30Y) from [FRED](https://fred.stlouisfed.org/). Refresh with:

```bash
node scripts/fetch-yields.mjs
```

This writes `src/data/yields.json`, which is committed so builds don't depend on FRED being up.
