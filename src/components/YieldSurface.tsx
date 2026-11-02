"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_YIELD,
  MONTHS,
  TENOR_POS,
  TENORS,
  formatMonth,
  type Month,
} from "@/lib/yields";

/**
 * A 3D surface of U.S. Treasury yields (tenor × time × yield) rasterised into
 * a character grid. Each sample is projected, depth-tested per cell, lit with a
 * Lambert term, then mapped to a glyph ramp. Inverted-curve months use their
 * own glyph set and colour, so the inversions read without a legend.
 */

const RAMP = " .·:;=+*#%@";
const INV_RAMP = " /x/XX";
const SUB = 12; // interpolated samples between neighbouring tenors
const FONT_PX = 9;

const C = {
  bone: "rgba(242,237,228,1)",
  boneDim: "rgba(242,237,228,0.5)",
  ink: "rgba(6,7,12,1)",
  hl: "rgba(255,226,92,1)",
};

type Sample = {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  h: number; // 0..1 yield height, drives glyph density
  t: number;
  inv: boolean;
  rib: boolean;
};

function buildSamples(): Sample[] {
  const T = MONTHS.length;
  const cols: number[] = [];
  for (let j = 0; j < TENOR_POS.length - 1; j++)
    for (let s = 0; s < SUB; s++)
      cols.push(TENOR_POS[j] + (s / SUB) * (TENOR_POS[j + 1] - TENOR_POS[j]));
  cols.push(1);

  // Light a time-smoothed copy so month-to-month wiggle doesn't speckle the shading.
  const SM = 5;
  const smooth = MONTHS.map((_, t) => {
    const acc = new Array(MONTHS[0].curve.length).fill(0);
    let n = 0;
    for (let k = Math.max(0, t - SM); k <= Math.min(T - 1, t + SM); k++, n++)
      MONTHS[k].curve.forEach((v, j) => (acc[j] += v));
    return acc.map((v) => v / n);
  });
  const interp = (c: number[], u: number) => {
    let j = 0;
    while (j < TENOR_POS.length - 2 && TENOR_POS[j + 1] < u) j++;
    const f = (u - TENOR_POS[j]) / (TENOR_POS[j + 1] - TENOR_POS[j]);
    return c[j] + f * (c[j + 1] - c[j]);
  };
  const smoothAt = (t: number, u: number) =>
    interp(smooth[Math.min(T - 1, Math.max(0, t))], u);
  const yieldAt = (t: number, u: number) => {
    const c = MONTHS[Math.min(T - 1, Math.max(0, t))].curve;
    let j = 0;
    while (j < TENOR_POS.length - 2 && TENOR_POS[j + 1] < u) j++;
    const f = (u - TENOR_POS[j]) / (TENOR_POS[j + 1] - TENOR_POS[j]);
    return c[j] + f * (c[j + 1] - c[j]);
  };

  // World space: x = maturity, z = time (long axis), y = yield.
  const W = 1.7;
  const D = 2.6;
  const H = 0.9;
  const out: Sample[] = [];
  for (let t = 0; t < T; t++) {
    for (const u of cols) {
      const y = (yieldAt(t, u) / MAX_YIELD) * H;
      const du = 0.02;
      const dyu =
        ((smoothAt(t, Math.min(1, u + du)) - smoothAt(t, Math.max(0, u - du))) /
          MAX_YIELD) *
        H;
      const dyt =
        ((smoothAt(t + 2, u) - smoothAt(t - 2, u)) / MAX_YIELD) * H;
      // tangents: (2du*W, dyu, 0) and (0, dyt, 4/T*D)
      const ax = 2 * du * W;
      const bz = (4 / T) * D;
      let nx = -dyu * bz;
      let ny = ax * bz;
      let nz = -ax * dyt;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      out.push({
        x: (u - 0.5) * W,
        y,
        z: (t / (T - 1) - 0.5) * D,
        nx,
        ny,
        nz,
        h: yieldAt(t, u) / MAX_YIELD,
        t,
        inv: MONTHS[t].inverted,
        rib: MONTHS[t].date.endsWith("-01") && Number(MONTHS[t].date.slice(0, 4)) % 2 === 0,
      });
    }
  }
  return out;
}

export default function YieldSurface({
  onHover,
}: {
  onHover?: (m: Month | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverT = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const [labels, setLabels] = useState<
    { text: string; x: number; y: number; kind: "year" | "tenor" }[]
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const samples = buildSamples();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0,
      h = 0,
      cw = 0,
      ch = 0,
      cols = 0,
      rows = 0;
    let depth = new Float32Array(0);
    let shade = new Float32Array(0);
    let tIdx = new Int16Array(0);
    let kind = new Uint8Array(0); // 0 empty, 1 normal, 2 inverted
    const font = `${FONT_PX}px "Fragment Mono", ui-monospace, monospace`;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font;
      cw = ctx.measureText("M").width;
      ch = Math.round(FONT_PX * 1.18);
      cols = Math.floor(w / cw);
      rows = Math.floor(h / ch);
      const n = cols * rows;
      depth = new Float32Array(n);
      shade = new Float32Array(n);
      tIdx = new Int16Array(n);
      kind = new Uint8Array(n);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const light = (() => {
      const l = [-0.45, 0.85, 0.35];
      const m = Math.hypot(...l);
      return l.map((v) => v / m);
    })();

    let raf = 0;
    let frame = 0;
    const start = performance.now();
    let lastLabels = 0;

    const draw = (now: number) => {
      const time = reduce ? 0 : (now - start) / 1000;
      const px = pointer.current.active ? pointer.current.x : 0;
      const py = pointer.current.active ? pointer.current.y : 0;
      const yaw = -1.08 + Math.sin(time * 0.11) * 0.1 + px * 0.1;
      const pitch = 0.55 + Math.sin(time * 0.07) * 0.03 - py * 0.05;
      const cy = Math.cos(yaw),
        sy = Math.sin(yaw),
        cp = Math.cos(pitch),
        sp = Math.sin(pitch);

      // Fit the rotated bounding box to the canvas every frame.
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const bx of [-0.85, 0.85])
        for (const by of [0, 0.9])
          for (const bz of [-1.3, 1.3]) {
            const x1 = bx * cy - bz * sy;
            const z1 = bx * sy + bz * cy;
            const y2 = (by - 0.3) * cp - z1 * sp;
            minX = Math.min(minX, x1);
            maxX = Math.max(maxX, x1);
            minY = Math.min(minY, y2);
            maxY = Math.max(maxY, y2);
          }
      const scale = 1.28 * Math.min((w * 0.96) / (maxX - minX), (h * 0.94) / (maxY - minY));
      const ox = w / 2 - ((minX + maxX) / 2) * scale;
      const oy = h * 0.6 + ((minY + maxY) / 2) * scale;

      depth.fill(Infinity);
      kind.fill(0);
      const hov = hoverT.current;

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        // yaw around Y, then pitch around X
        const x1 = s.x * cy - s.z * sy;
        const z1 = s.x * sy + s.z * cy;
        const y1 = s.y - 0.3;
        const y2 = y1 * cp - z1 * sp;
        const z2 = y1 * sp + z1 * cp;
        const persp = 1 / (1 + z2 * 0.18);
        const sx = ox + x1 * scale * persp;
        const syy = oy - y2 * scale * persp;
        const c = (sx / cw) | 0;
        const r = (syy / ch) | 0;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const k = r * cols + c;
        if (z2 >= depth[k]) continue;
        depth[k] = z2;
        // rotate normal
        const nx1 = s.nx * cy - s.nz * sy;
        const nz1 = s.nx * sy + s.nz * cy;
        const ny2 = s.ny * cp - nz1 * sp;
        const nz2 = s.ny * sp + nz1 * cp;
        const lam = Math.max(
          0,
          nx1 * light[0] + ny2 * light[1] - nz2 * light[2],
        );
        shade[k] = Math.min(1, 0.04 + 0.78 * s.h + 0.3 * lam);
        tIdx[k] = s.t;
        kind[k] = s.rib ? 3 : s.inv ? 2 : 1;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.font = font;
      ctx.textBaseline = "top";
      const dim: string[] = [],
        bright: string[] = [],
        inv: string[] = [],
        hl: string[] = [];
      for (let r = 0; r < rows; r++) {
        let a = "",
          b = "",
          c2 = "",
          d = "";
        for (let c = 0; c < cols; c++) {
          const k = r * cols + c;
          const kd = kind[k];
          let ga = " ",
            gb = " ",
            gc = " ",
            gd = " ";
          if (kd) {
            const sh = shade[k];
            if (hov != null && Math.abs(tIdx[k] - hov) <= 2) {
              gd = "#";
            } else if (kd === 2) {
              gc = INV_RAMP[1 + Math.min(4, (sh * 5) | 0)];
            } else if (kd === 3) {
              gb = "-";
            } else {
              const g = RAMP[1 + Math.min(9, (sh * 10) | 0)];
              if (sh < 0.45) ga = g;
              else gb = g;
            }
          }
          a += ga;
          b += gb;
          c2 += gc;
          d += gd;
        }
        dim.push(a);
        bright.push(b);
        inv.push(c2);
        hl.push(d);
      }
      const pass = (lines: string[], color: string) => {
        ctx.fillStyle = color;
        for (let r = 0; r < rows; r++)
          if (lines[r].trim()) ctx.fillText(lines[r], 0, r * ch);
      };
      pass(dim, C.boneDim);
      pass(bright, C.bone);
      pass(inv, C.ink);
      pass(hl, C.hl);

      // Axis labels: project a few anchor points, throttled into React state.
      if (now - lastLabels > 120) {
        lastLabels = now;
        const project = (x: number, y: number, z: number) => {
          const x1 = x * cy - z * sy;
          const z1 = x * sy + z * cy;
          const y1 = y - 0.3;
          const y2 = y1 * cp - z1 * sp;
          const z2 = y1 * sp + z1 * cp;
          const persp = 1 / (1 + z2 * 0.18);
          return { x: ox + x1 * scale * persp, y: oy - y2 * scale * persp };
        };
        const T = MONTHS.length;
        const next: typeof labels = [];
        for (const year of [1990, 2000, 2008, 2020, 2026]) {
          const t = MONTHS.findIndex((m) => m.date.startsWith(String(year)));
          if (t < 0) continue;
          const p = project(-0.88, 0, (t / (T - 1) - 0.5) * 2.6);
          if (p.x > 24 && p.x < w - 340 && p.y > 0 && p.y < h - 90)
            next.push({ text: String(year), x: p.x, y: p.y, kind: "year" });
        }
        TENORS.forEach((tn, j) => {
          if (![0, 3, 7, 9].includes(j)) return;
          const p = project((TENOR_POS[j] - 0.5) * 1.7, 0, 1.36);
          if (p.x > 24 && p.x < w - 340 && p.y > 0 && p.y < h - 90)
            next.push({ text: tn, x: p.x, y: p.y, kind: "tenor" });
        });
        setLabels(next);
      }

      frame++;
      if (!reduce || frame < 2) raf = requestAnimationFrame(draw);
    };

    const fontReady = document.fonts?.load(font) ?? Promise.resolve();
    fontReady.then(() => {
      resize();
      raf = requestAnimationFrame(draw);
    });

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current = {
        x: ((e.clientX - r.left) / r.width) * 2 - 1,
        y: ((e.clientY - r.top) / r.height) * 2 - 1,
        active: true,
      };
      const c = ((e.clientX - r.left) / cw) | 0;
      const rr = ((e.clientY - r.top) / ch) | 0;
      const k = rr * cols + c;
      const t = k >= 0 && k < kind.length && kind[k] ? tIdx[k] : null;
      hoverT.current = t;
      onHover?.(t == null ? null : MONTHS[t]);
      if (reduce) raf = requestAnimationFrame(draw);
    };
    const onLeave = () => {
      pointer.current.active = false;
      hoverT.current = null;
      onHover?.(null);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [onHover]);

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        aria-label={`ASCII surface of U.S. Treasury yields from ${formatMonth(
          MONTHS[0].date,
        )} to ${formatMonth(MONTHS.at(-1)!.date)}. Inverted-curve periods are drawn in dark slashes.`}
        role="img"
      />
      {labels.map((l) => (
        <span
          key={l.kind + l.text}
          className="pointer-events-none absolute font-mono text-[10px] tracking-[0.12em] text-bone/70"
          style={{
            left: l.x,
            top: l.y,
            transform: l.kind === "year" ? "translate(-50%,8px)" : "translate(10px,-50%)",
          }}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}
