// Fetches monthly-average U.S. Treasury constant-maturity yields from FRED
// and writes them to src/data/yields.json. No API key needed.
// Usage: node scripts/fetch-yields.mjs
import { writeFile, mkdir } from "node:fs/promises";

const TENORS = [
  ["3M", "DGS3MO"],
  ["6M", "DGS6MO"],
  ["1Y", "DGS1"],
  ["2Y", "DGS2"],
  ["3Y", "DGS3"],
  ["5Y", "DGS5"],
  ["7Y", "DGS7"],
  ["10Y", "DGS10"],
  ["20Y", "DGS20"],
  ["30Y", "DGS30"],
];
const START = "1990-01-01";

async function series(id) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${START}&fq=Monthly&fam=avg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const rows = (await res.text()).trim().split("\n").slice(1);
  const out = new Map();
  for (const row of rows) {
    const [date, value] = row.split(",");
    const v = Number.parseFloat(value);
    out.set(date.slice(0, 7), Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
  }
  return out;
}

const all = await Promise.all(TENORS.map(([, id]) => series(id)));
const dates = [...all[TENORS.findIndex(([t]) => t === "10Y")].keys()].sort();
const values = dates.map((d) => all.map((s) => s.get(d) ?? null));

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../src/data/yields.json", import.meta.url),
  JSON.stringify({
    source: "FRED, Federal Reserve Bank of St. Louis",
    fetched: new Date().toISOString().slice(0, 10),
    tenors: TENORS.map(([t]) => t),
    series: TENORS.map(([, id]) => id),
    dates,
    values,
  }),
);
console.log(`wrote ${dates.length} months × ${TENORS.length} tenors (${dates[0]} → ${dates.at(-1)})`);
