import raw from "@/data/yields.json";

export type Regime =
  | "STRESSED"
  | "INVERTED"
  | "TIGHTENING"
  | "EASING"
  | "STEEP"
  | "FLAT"
  | "CALM";

export interface Month {
  date: string; // YYYY-MM
  curve: number[]; // one yield per tenor, gaps filled
  s2s10: number; // 10Y − 2Y
  s3m10: number; // 10Y − 3M
  inverted: boolean;
  vix: number | null;
  hyOas: number | null;
  regime: Regime;
}

export const TENORS = raw.tenors as string[];
/** Maturity of each tenor in months, used for log-spaced placement. */
export const MATURITY_MONTHS = [3, 6, 12, 24, 36, 60, 84, 120, 240, 360];

const logMin = Math.log(MATURITY_MONTHS[0]);
const logMax = Math.log(MATURITY_MONTHS.at(-1)!);
/** 0..1 position of each tenor on a log-maturity axis. */
export const TENOR_POS = MATURITY_MONTHS.map(
  (m) => (Math.log(m) - logMin) / (logMax - logMin),
);

function fillGaps(row: (number | null)[]): number[] {
  const out = [...row];
  for (let j = 0; j < out.length; j++) {
    if (out[j] != null) continue;
    let a = j - 1;
    while (a >= 0 && out[a] == null) a--;
    let b = j + 1;
    while (b < out.length && row[b] == null) b++;
    if (a >= 0 && b < out.length) {
      const f = (TENOR_POS[j] - TENOR_POS[a]) / (TENOR_POS[b] - TENOR_POS[a]);
      out[j] = (out[a] as number) + f * ((row[b] as number) - (out[a] as number));
    } else {
      out[j] = (a >= 0 ? out[a] : row[b]) ?? 0;
    }
  }
  return out as number[];
}

const i2 = TENORS.indexOf("2Y");
const i10 = TENORS.indexOf("10Y");
const i3m = TENORS.indexOf("3M");

function classify(curves: number[][], k: number, vix: number | null): Regime {
  const c = curves[k];
  const prev = curves[Math.max(0, k - 12)];
  const d3m = c[i3m] - prev[i3m];
  if (vix != null && vix >= 30) return "STRESSED";
  if (c[i10] - c[i3m] < 0) return "INVERTED";
  if (d3m >= 1) return "TIGHTENING";
  if (d3m <= -1) return "EASING";
  const s = c[i10] - c[i2];
  if (s >= 1.5) return "STEEP";
  if (s <= 0.4) return "FLAT";
  return "CALM";
}

const curves = (raw.values as (number | null)[][]).map(fillGaps);

export const MONTHS: Month[] = raw.dates.map((date, k) => {
  const c = curves[k];
  const vix = raw.signals.vix[k] as number | null;
  return {
    date,
    curve: c,
    s2s10: c[i10] - c[i2],
    s3m10: c[i10] - c[i3m],
    inverted: c[i10] - c[i3m] < 0 || c[i10] - c[i2] < 0,
    vix,
    hyOas: raw.signals.hyOas[k] as number | null,
    regime: classify(curves, k, vix),
  };
});

export const MAX_YIELD = Math.max(...curves.flat());
export const SOURCE = raw.source;

export function formatMonth(date: string) {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
