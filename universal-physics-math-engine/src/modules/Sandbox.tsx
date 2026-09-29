import { useCallback, useEffect, useRef, useState } from "react";
import {
  Orbit, Pause, Play, Rocket, RotateCcw, Spline, Timer, Waves, Wind, type LucideIcon,
} from "lucide-react";
import { fmt, pretty } from "../lib/num";
import { Label, Panel, SegTabs } from "../components/ui";
import { cn } from "../utils/cn";

/* ==================================================================== */
/* Types                                                                */
/* ==================================================================== */

type SimId = "projectile" | "pendulum" | "spring" | "orbit";
interface Metrics { w: number; h: number }
interface TeleItem { k: string; v: string; tone?: "cyan" | "amber" }

interface Runtime {
  t: number;
  done: boolean;
  step: (dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D, m: Metrics) => void;
  telemetry: () => TeleItem[];
}

const G_PRESETS = [
  { id: "moon", label: "Moon", g: 1.62 },
  { id: "earth", label: "Earth", g: 9.81 },
  { id: "mars", label: "Mars", g: 3.71 },
  { id: "jupiter", label: "Jupiter", g: 24.79 },
];

/* ==================================================================== */
/* Canvas drawing helpers                                               */
/* ==================================================================== */

function drawArrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, dashed = false) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 8 * Math.cos(ang - 0.42), y1 - 8 * Math.sin(ang - 0.42));
  ctx.lineTo(x1 - 8 * Math.cos(ang + 0.42), y1 - 8 * Math.sin(ang + 0.42));
  ctx.closePath(); ctx.fill();
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c1: string, c2: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.stroke();
}

function energyHud(ctx: CanvasRenderingContext2D, x: number, y: number, rows: { label: string; frac: number; color: string; val: string }[]) {
  ctx.font = "10px 'JetBrains Mono', monospace";
  rows.forEach((row, i) => {
    const yy = y + i * 22;
    ctx.fillStyle = "rgba(120,145,190,0.9)";
    ctx.fillText(row.label, x, yy + 9);
    ctx.fillStyle = "rgba(30,44,72,0.8)";
    ctx.beginPath(); ctx.roundRect(x + 34, yy, 120, 10, 4); ctx.fill();
    ctx.fillStyle = row.color;
    ctx.beginPath(); ctx.roundRect(x + 34, yy, Math.max(4, 120 * Math.min(1, Math.abs(row.frac))), 10, 4); ctx.fill();
    ctx.fillStyle = "rgba(210,224,246,0.95)";
    ctx.fillText(row.val, x + 162, yy + 9);
  });
}

function chip(ctx: CanvasRenderingContext2D, text: string, tone: "cyan" | "amber" = "cyan") {
  ctx.font = "11px 'JetBrains Mono', monospace";
  const w = ctx.measureText(text).width + 24;
  const x = 12, y = 12;
  ctx.fillStyle = "rgba(8,13,24,0.9)";
  ctx.strokeStyle = tone === "cyan" ? "rgba(58,226,255,0.45)" : "rgba(255,180,84,0.5)";
  ctx.beginPath(); ctx.roundRect(x, y, w, 24, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = tone === "cyan" ? "#3ae2ff" : "#ffb454";
  ctx.fillText(text, x + 12, y + 16);
}

function eqnLabel(ctx: CanvasRenderingContext2D, m: Metrics, text: string) {
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(167,139,250,0.65)";
  const w = ctx.measureText(text).width;
  ctx.fillText(text, m.w - w - 12, 20);
}

/* ==================================================================== */
/* Runtimes                                                             */
/* ==================================================================== */

interface ProjParams { v0: number; angle: number; g: number; drag: boolean; mass: number; dia: number; sweep: boolean }

function createProjectile(p: ProjParams): Runtime {
  const th = (p.angle * Math.PI) / 180;
  let x = 0, y = 0;
  let vx = p.v0 * Math.cos(th), vy = p.v0 * Math.sin(th);
  const trail: [number, number][] = [[0, 0]];
  const R = (p.v0 * p.v0 * Math.sin(2 * th)) / p.g;
  const H = (p.v0 * Math.sin(th)) ** 2 / (2 * p.g);
  const kDrag = p.drag ? (0.5 * 1.225 * 0.47 * Math.PI * (p.dia / 2) ** 2) / p.mass : 0;
  let scale = 40, maxX = Math.max(R, 10) * 1.18, maxY = Math.max(H, 3) * 1.3;
  const rt: Runtime = {
    t: 0, done: false,
    step(dt) {
      if (this.done) return;
      this.t += dt;
      if (kDrag > 0) {
        const v = Math.hypot(vx, vy);
        vx += -kDrag * v * vx * dt;
        vy += (-p.g - kDrag * v * vy) * dt;
      } else vy -= p.g * dt;
      x += vx * dt; y += vy * dt;
      trail.push([x, y]);
      maxX = Math.max(maxX, Math.abs(x) * 1.18);
      maxY = Math.max(maxY, y * 1.25 + 1);
      if (y <= 0 && this.t > 0.05) { y = 0; this.done = true; }
    },
    draw(ctx, m) {
      const target = Math.max(0.5, Math.min((m.w - 180) / maxX, (m.h - 190) / maxY));
      scale += (target - scale) * 0.06;
      const ox = 80, oy = m.h - 90;
      const X = (wx: number) => ox + wx * scale;
      const Y = (wy: number) => oy - wy * scale;

      /* angle sweep ghosts */
      if (p.sweep) {
        for (const a of [15, 30, 45, 60, 75]) {
          const ar = (a * Math.PI) / 180;
          const rA = (p.v0 * p.v0 * Math.sin(2 * ar)) / p.g;
          ctx.strokeStyle = "rgba(167,139,250,0.3)"; ctx.lineWidth = 1;
          ctx.setLineDash([3, 5]); ctx.beginPath();
          for (let i = 0; i <= 40; i++) {
            const gx = (i / 40) * rA;
            const gy = Math.tan(ar) * gx - (p.g * gx * gx) / (2 * p.v0 * p.v0 * Math.cos(ar) ** 2);
            const px = X(gx), py = Y(gy);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "rgba(167,139,250,0.55)";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillText(`${a}°`, X(rA) - 8, Y(0) - 6);
        }
      }

      /* vacuum prediction marker */
      ctx.strokeStyle = "rgba(120,145,190,0.6)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(R), Y(0) - 14); ctx.lineTo(X(R), Y(0) + 14); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(120,145,190,0.8)"; ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText("vacuum", X(R) - 20, Y(0) - 22);

      /* ground */
      ctx.strokeStyle = "rgba(140,165,210,0.5)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(m.w, Y(0)); ctx.stroke();
      ctx.strokeStyle = "rgba(140,165,210,0.22)"; ctx.lineWidth = 1;
      for (let gx = 0; gx < m.w; gx += 18) {
        ctx.beginPath(); ctx.moveTo(gx, Y(0)); ctx.lineTo(gx - 7, Y(0) + 9); ctx.stroke();
      }

      /* launcher */
      ctx.fillStyle = "rgba(58,226,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0) - 2);
      ctx.lineTo(X(0) - 14 * Math.cos(th), Y(0) - 2 + 14 * Math.sin(th) + 10);
      ctx.lineTo(X(0) - 14 * Math.cos(th), Y(0) - 2 + 14 * Math.sin(th) - 6);
      ctx.closePath(); ctx.fill();

      /* trail */
      if (trail.length > 1) {
        ctx.strokeStyle = "#3ae2ff"; ctx.lineWidth = 2; ctx.shadowColor = "#3ae2ff"; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(X(trail[0][0]), Y(trail[0][1]));
        for (const pt of trail) ctx.lineTo(X(pt[0]), Y(pt[1]));
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      /* velocity vector + components */
      const px = X(x), py = Y(y);
      if (!this.done || trail.length > 2) {
        const vabs = Math.hypot(vx, vy) || 1;
        const len = Math.min(80, 26 + vabs * (scale * 0.16));
        drawArrow(ctx, px, py, px + (vx / vabs) * len, py - (vy / vabs) * len, "#ffb454");
        drawArrow(ctx, px, py, px + (vx / vabs) * len, py, "rgba(125,252,207,0.55)", true);
        drawArrow(ctx, px, py, px, py - (vy / vabs) * len, "rgba(255,125,156,0.55)", true);
      }
      ball(ctx, px, py, 9, "#9befff", "#1d6f8a");

      eqnLabel(ctx, m, "x = v₀cosθ·t   y = v₀sinθ·t − ½gt²" + (p.drag ? "  (− ½ρC_dAv²)" : ""));
      const ke = 0.5 * p.mass * (vx * vx + vy * vy);
      const pe = p.mass * p.g * y;
      const e0 = Math.max(1e-9, ke + pe + (p.drag ? 0.5 * p.mass * p.v0 * p.v0 - ke - pe : 0));
      energyHud(ctx, 12, m.h - 64, [
        { label: "KE", frac: ke / e0, color: "#3ae2ff", val: `${fmt(ke, 3)} J` },
        { label: "PE", frac: pe / e0, color: "#ffb454", val: `${fmt(pe, 3)} J` },
      ]);
      if (this.done) chip(ctx, `LANDED — range ${fmt(x, 4)} m${kDrag ? ` · vacuum ${fmt(R, 4)} m (${fmt((x / R) * 100, 3)}%)` : ""}`, "amber");
    },
    telemetry() {
      const v = Math.hypot(vx, vy);
      const out: TeleItem[] = [
        { k: "time", v: `${fmt(this.t, 4)} s` },
        { k: "position", v: `(${fmt(x, 4)}, ${fmt(y, 4)}) m`, tone: "cyan" },
        { k: "velocity", v: `${fmt(v, 4)} m/s`, tone: "cyan" },
        { k: "v components", v: `${fmt(vx, 3)}, ${fmt(vy, 3)}` },
      ];
      if (this.done) out.push({ k: "range", v: `${fmt(x, 4)} m`, tone: "amber" }, { k: "flight time", v: `${fmt(this.t, 3)} s`, tone: "amber" });
      else out.push({ k: "apex track", v: y > H * 0.9 && vy > 0 ? "rising to apex" : vy < 0 ? "descending" : "climbing" });
      return out;
    },
  };
  return rt;
}

interface PendParams { L: number; theta0: number; g: number; damping: number }

function createPendulum(p: PendParams): Runtime {
  let th = (p.theta0 * Math.PI) / 180, om = 0;
  const trail: [number, number][] = [];
  let lastSign = Math.sign(th), lastCross = 0, tMeasured = 0, swings = 0;
  const T0 = 2 * Math.PI * Math.sqrt(p.L / p.g);
  const E0 = p.g * p.L * (1 - Math.cos((p.theta0 * Math.PI) / 180));
  const rt: Runtime = {
    t: 0, done: false,
    step(dt) {
      this.t += dt;
      const al = -(p.g / p.L) * Math.sin(th) - p.damping * om;
      om += al * dt; th += om * dt;
      const s = Math.sign(th || 1);
      if (s !== lastSign) {
        if (lastSign < 0 && om > 0) {
          if (lastCross > 0) { tMeasured = this.t - lastCross; swings++; }
          lastCross = this.t;
        }
        lastSign = s;
      }
    },
    draw(ctx, m) {
      const px = m.w / 2, py = 56;
      const s = Math.min((m.h * 0.62) / p.L, (m.w * 0.4) / p.L);
      const bx = px + p.L * Math.sin(th) * s, by = py + p.L * Math.cos(th) * s;

      /* guide circle + angle arc */
      ctx.strokeStyle = "rgba(110,150,220,0.18)"; ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, p.L * s, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(167,139,250,0.5)";
      ctx.beginPath();
      const a0 = Math.PI / 2, ac = a0 - th;
      ctx.arc(px, py, 40, Math.min(a0, ac), Math.max(a0, ac));
      ctx.stroke();
      ctx.fillStyle = "rgba(167,139,250,0.8)"; ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(`θ = ${fmt((th * 180) / Math.PI, 3)}°`, px + 46, py + 56);

      trail.push([bx, by]);
      if (trail.length > 220) trail.shift();
      for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = `rgba(58,226,255,${(i / trail.length) * 0.4})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      }

      /* rod + pivot + bob */
      ctx.strokeStyle = "rgba(200,214,240,0.75)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = "#2a3d61"; ctx.beginPath(); ctx.roundRect(px - 7, py - 7, 14, 14, 3); ctx.fill();
      ctx.strokeStyle = "#3ae2ff"; ctx.strokeRect(px - 7, py - 7, 14, 14);

      /* velocity vector (tangent) */
      const v = om * p.L;
      if (Math.abs(v) > 0.05) {
        const dir = Math.sign(om);
        const tx = Math.cos(th) * dir, ty = -Math.sin(th) * dir;
        drawArrow(ctx, bx, by, bx + tx * Math.min(90, 20 + Math.abs(v) * 18), by + ty * Math.min(90, 20 + Math.abs(v) * 18), "#ffb454");
      }
      ball(ctx, bx, by, 14, "#9befff", "#155e75");

      eqnLabel(ctx, m, "ω′ = −(g/L)·sinθ − b·ω");
      const ke = 0.5 * (om * p.L) ** 2;
      const pe = p.g * p.L * (1 - Math.cos(th));
      energyHud(ctx, 12, m.h - 64, [
        { label: "KE", frac: ke / E0, color: "#3ae2ff", val: `${fmt(ke, 3)} J/kg` },
        { label: "PE", frac: pe / E0, color: "#ffb454", val: `${fmt(pe, 3)} J/kg` },
      ]);
    },
    telemetry() {
      return [
        { k: "time", v: `${fmt(this.t, 3)} s` },
        { k: "angle θ", v: `${fmt((th * 180) / Math.PI, 3)}°`, tone: "cyan" },
        { k: "angular speed ω", v: `${fmt(Math.abs(om), 4)} rad/s`, tone: "cyan" },
        { k: "bob speed", v: `${fmt(Math.abs(om * p.L), 3)} m/s` },
        { k: "T theory", v: `${fmt(T0, 4)} s (small-angle)` },
        tMeasured > 0 ? { k: "T measured", v: `${fmt(tMeasured, 4)} s · ${swings} swings`, tone: "amber" } : { k: "T measured", v: "awaiting full swing" },
      ];
    },
  };
  return rt;
}

interface SpringParams { k: number; m: number; x0: number; damping: number }

function createSpring(p: SpringParams): Runtime {
  let x = p.x0, v = 0;
  const trail: number[] = [];
  let lastSign = Math.sign(x || 1), lastCross = 0, tMeasured = 0, cycles = 0;
  const T0 = 2 * Math.PI * Math.sqrt(p.m / p.k);
  const E0 = 0.5 * p.k * p.x0 * p.x0;
  const rt: Runtime = {
    t: 0, done: false,
    step(dt) {
      this.t += dt;
      const a = -(p.k / p.m) * x - (p.damping / p.m) * v;
      v += a * dt; x += v * dt;
      const s = Math.sign(x || 1);
      if (s !== lastSign) {
        if (lastSign < 0 && v > 0) {
          if (lastCross > 0) { tMeasured = this.t - lastCross; cycles++; }
          lastCross = this.t;
        }
        lastSign = s;
      }
    },
    draw(ctx, m) {
      const wall = 70, eqX = m.w * 0.44;
      const s = (m.w * 0.34) / Math.max(Math.abs(p.x0), 0.05);
      const cx = eqX + x * s;
      const cy = m.h * 0.44;

      /* equilibrium marker */
      ctx.strokeStyle = "rgba(140,165,210,0.35)"; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(eqX, cy - 90); ctx.lineTo(eqX, cy + 90); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(140,165,210,0.6)"; ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText("equilibrium", eqX - 28, cy + 106);

      trail.push(cx);
      if (trail.length > 160) trail.shift();
      trail.forEach((tx, i) => {
        ctx.fillStyle = `rgba(58,226,255,${(i / trail.length) * 0.14})`;
        ctx.beginPath(); ctx.roundRect(tx - 18, cy - 18, 36, 36, 7); ctx.fill();
      });

      /* wall */
      ctx.fillStyle = "#16223c"; ctx.fillRect(wall - 16, cy - 80, 16, 160);
      ctx.strokeStyle = "rgba(140,165,210,0.4)"; ctx.lineWidth = 1;
      for (let hy = cy - 76; hy < cy + 78; hy += 12) {
        ctx.beginPath(); ctx.moveTo(wall - 16, hy); ctx.lineTo(wall - 4, hy - 8); ctx.stroke();
      }

      /* spring coils */
      ctx.strokeStyle = "#b78cff"; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.beginPath();
      const coils = 14, x0 = wall, x1 = cx - 20;
      const amp = Math.min(16, Math.abs(x1 - x0) / coils / 2);
      ctx.moveTo(x0, cy);
      for (let i = 0; i <= coils * 2; i++) {
        const sx = x0 + ((x1 - x0) * i) / (coils * 2);
        const sy = cy + (i % 2 === 0 ? 0 : i % 4 === 1 ? -amp : amp);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(x1 + 2, cy);
      ctx.stroke();

      /* block */
      const grad = ctx.createLinearGradient(cx - 18, cy - 18, cx + 18, cy + 18);
      grad.addColorStop(0, "#9befff"); grad.addColorStop(1, "#155e75");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(cx - 18, cy - 18, 36, 36, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.stroke();

      /* floor */
      ctx.strokeStyle = "rgba(140,165,210,0.3)";
      ctx.beginPath(); ctx.moveTo(wall, cy + 24); ctx.lineTo(m.w - 30, cy + 24); ctx.stroke();

      if (Math.abs(v) > 0.02) {
        const dir = Math.sign(v);
        drawArrow(ctx, cx, cy - 34, cx + dir * Math.min(110, 14 + Math.abs(v) * 26), cy - 34, "#ffb454");
      }
      eqnLabel(ctx, m, "a = −(k/m)·x − (c/m)·v");
      const ke = 0.5 * p.m * v * v;
      const pe = 0.5 * p.k * x * x;
      energyHud(ctx, 12, m.h - 64, [
        { label: "KE", frac: ke / E0, color: "#3ae2ff", val: `${fmt(ke, 3)} J` },
        { label: "PE", frac: pe / E0, color: "#ffb454", val: `${fmt(pe, 3)} J` },
      ]);
    },
    telemetry() {
      return [
        { k: "time", v: `${fmt(this.t, 3)} s` },
        { k: "displacement x", v: `${fmt(x, 4)} m`, tone: "cyan" },
        { k: "velocity", v: `${fmt(v, 4)} m/s` },
        { k: "ω₀ natural", v: `${fmt(Math.sqrt(p.k / p.m), 4)} rad/s` },
        { k: "T theory", v: `${fmt(T0, 4)} s` },
        tMeasured > 0 ? { k: "T measured", v: `${fmt(tMeasured, 4)} s · ${cycles} cycles`, tone: "amber" } : { k: "T measured", v: "awaiting cycle" },
      ];
    },
  };
  return rt;
}

interface OrbitParams { r0: number; vFactor: number }

function createOrbit(p: OrbitParams): Runtime {
  const MU = 1.32712440018e11; // km³/s² — Heliocentric
  const r0 = p.r0 * 1e6; // km
  let rx = r0, ry = 0;
  const vc = Math.sqrt(MU / r0);
  let vx = 0, vy = p.vFactor * vc;
  const trail: [number, number][] = [[rx, ry]];
  let maxR = r0 * 1.25, scale = 1;
  const daysPerSec = 5;
  const rt: Runtime = {
    t: 0, done: false,
    step(dt) {
      const sim = dt * daysPerSec * 86400;
      const n = 10, sub = sim / n;
      for (let i = 0; i < n; i++) {
        const r = Math.hypot(rx, ry) || 1;
        const a = -MU / (r * r);
        vx += (a * rx / r) * sub; vy += (a * ry / r) * sub;
        rx += vx * sub; ry += vy * sub;
        this.t += sub;
      }
      trail.push([rx, ry]);
      if (trail.length > 2600) trail.shift();
      maxR = Math.max(maxR, Math.hypot(rx, ry) * 1.18);
    },
    draw(ctx, m) {
      const target = Math.min(m.w, m.h) * 0.5 / maxR;
      if (scale === 1) scale = target;
      scale += (target - scale) * 0.03;
      const cx = m.w / 2, cy = m.h / 2;
      const X = (wx: number) => cx + wx * scale;
      const Y = (wy: number) => cy + wy * scale;

      /* r0 reference circle */
      ctx.strokeStyle = "rgba(110,150,220,0.16)"; ctx.setLineDash([3, 7]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r0 * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      /* trail */
      if (trail.length > 1) {
        ctx.strokeStyle = "rgba(58,226,255,0.85)"; ctx.lineWidth = 1.6;
        ctx.shadowColor = "#3ae2ff"; ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(X(trail[0][0]), Y(trail[0][1]));
        for (const pt of trail) ctx.lineTo(X(pt[0]), Y(pt[1]));
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      /* star */
      const sg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
      sg.addColorStop(0, "rgba(255,214,140,0.95)"); sg.addColorStop(0.45, "rgba(255,180,84,0.55)"); sg.addColorStop(1, "rgba(255,180,84,0)");
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffce7a"; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();

      /* satellite + velocity */
      const sx = X(rx), sy = Y(ry);
      const v = Math.hypot(vx, vy) || 1;
      drawArrow(ctx, sx, sy, sx + (vx / v) * 42, sy + (vy / v) * 42, "#ffb454");
      ball(ctx, sx, sy, 8, "#9befff", "#0e7490");

      eqnLabel(ctx, m, "a = −μ·r̂/r²   μ☉ = 1.327×10¹¹ km³/s²");
    },
    telemetry() {
      const r = Math.hypot(rx, ry), v = Math.hypot(vx, vy);
      const eps = v * v / 2 - MU / r; // km²/s² ≡ MJ/kg
      const out: TeleItem[] = [
        { k: "mission t", v: `${fmt(this.t / 86400, 3)} days` },
        { k: "radius r", v: `${fmt(r / 1e6, 4)} ×10⁶ km`, tone: "cyan" },
        { k: "speed", v: `${fmt(v, 4)} km/s`, tone: "cyan" },
        { k: "specific energy ε", v: `${fmt(eps, 4)} MJ/kg` },
      ];
      if (eps < 0) {
        const a = -MU / (2 * eps);
        const T = 2 * Math.PI * Math.sqrt(a ** 3 / MU);
        out.push({ k: "semi-major a", v: `${fmt(a / 1e6, 4)} ×10⁶ km` }, { k: "orbital period", v: `${fmt(T / 86400, 3)} days`, tone: "amber" });
      } else out.push({ k: "trajectory", v: "unbound — escapes to infinity", tone: "amber" });
      return out;
    },
  };
  return rt;
}

/* ==================================================================== */
/* Component                                                            */
/* ==================================================================== */

const SIMS: { id: SimId; label: string; icon: LucideIcon }[] = [
  { id: "projectile", label: "PROJECTILE", icon: Rocket },
  { id: "pendulum", label: "PENDULUM", icon: Timer },
  { id: "spring", label: "SPRING", icon: Waves },
  { id: "orbit", label: "ORBIT", icon: Orbit },
];

export default function Sandbox() {
  const [sim, setSim] = useState<SimId>("projectile");
  const [playing, setPlaying] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [nonce, setNonce] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [tele, setTele] = useState<TeleItem[]>([]);

  const [proj, setProj] = useState<ProjParams>({ v0: 42, angle: 45, g: 9.81, drag: false, mass: 1, dia: 0.25, sweep: false });
  const [pend, setPend] = useState<PendParams>({ L: 2, theta0: 40, g: 9.81, damping: 0.04 });
  const [spring, setSpring] = useState<SpringParams>({ k: 60, m: 4, x0: 0.4, damping: 0.25 });
  const [orbit, setOrbit] = useState<OrbitParams>({ r0: 147.1, vFactor: 1.0 });

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const playingRef = useRef(playing);
  const timeScaleRef = useRef(timeScale);
  playingRef.current = playing;
  timeScaleRef.current = timeScale;

  /* (re)create runtime on sim/param/reset change */
  useEffect(() => {
    runtimeRef.current =
      sim === "projectile" ? createProjectile(proj)
      : sim === "pendulum" ? createPendulum(pend)
      : sim === "spring" ? createSpring(spring)
      : createOrbit(orbit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, proj, pend, spring, orbit, nonce]);

  /* sizing */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(50, r.width), h: Math.max(50, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* background grid */
  const bg = useCallback((ctx: CanvasRenderingContext2D, m: Metrics) => {
    const grad = ctx.createLinearGradient(0, 0, 0, m.h);
    grad.addColorStop(0, "#0a1220"); grad.addColorStop(1, "#070c16");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, m.w, m.h);
    ctx.fillStyle = "rgba(110,150,220,0.07)";
    for (let gx = 22; gx < m.w; gx += 26)
      for (let gy = 22; gy < m.h; gy += 26) {
        ctx.fillRect(gx, gy, 1.4, 1.4);
      }
  }, []);

  /* main loop */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const rt = runtimeRef.current;
      if (canvas && ctx) {
        const DPR = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== Math.round(size.w * DPR) || canvas.height !== Math.round(size.h * DPR)) {
          canvas.width = Math.round(size.w * DPR); canvas.height = Math.round(size.h * DPR);
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        bg(ctx, size);
        if (rt) {
          if (playingRef.current && !rt.done) {
            const sub = 6;
            const sdt = (dt * timeScaleRef.current) / sub;
            for (let i = 0; i < sub; i++) rt.step(sdt);
          }
          rt.draw(ctx, size);
        }
        if (!playingRef.current) {
          ctx.font = "11px 'JetBrains Mono', monospace";
          const t = "PAUSED";
          const w = ctx.measureText(t).width + 22;
          ctx.fillStyle = "rgba(8,13,24,0.9)";
          ctx.strokeStyle = "rgba(58,226,255,0.4)";
          ctx.beginPath(); ctx.roundRect(size.w - w - 12, size.h - 34, w, 24, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#3ae2ff";
          ctx.fillText(t, size.w - w, size.h - 18);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, bg]);

  /* telemetry pulse */
  useEffect(() => {
    const iv = setInterval(() => setTele(runtimeRef.current?.telemetry() ?? []), 140);
    return () => clearInterval(iv);
  }, []);

  const reset = () => setNonce((n) => n + 1);

  return (
    <div className="space-y-4">
      {/* control strip */}
      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <SegTabs
          options={SIMS.map((s) => ({ id: s.id, label: s.label }))}
          value={sim}
          onChange={setSim}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-edge bg-ink/70 px-3 py-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fog">time ×</span>
            <input
              type="range" min={0.1} max={4} step={0.1} value={timeScale}
              onChange={(e) => setTimeScale(parseFloat(e.target.value))}
              className="w-24 accent-cyan"
            />
            <span className="w-9 font-mono text-[11px] text-cyan-soft tnum">{timeScale.toFixed(1)}</span>
          </div>
          <button
            onClick={() => setPlaying((q) => !q)}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-cyan px-4 font-display text-[13px] font-semibold text-void transition-shadow hover:shadow-glow"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Run"}
          </button>
          <button
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-edge2 bg-panel/60 px-3.5 font-display text-[13px] font-semibold text-ghost transition-colors hover:border-cyan/40 hover:text-cyan"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        {/* canvas */}
        <Panel className="overflow-hidden">
          <div ref={wrapRef} className="relative h-[480px] w-full sm:h-[560px]">
            <canvas ref={canvasRef} className="h-full w-full" />
          </div>
        </Panel>

        {/* right column */}
        <div className="space-y-3">
          {/* parameters */}
          <Panel className="p-4">
            <Label>Initial conditions &amp; environment</Label>
            {sim === "projectile" && (
              <div className="mt-3 space-y-3">
                <Slider label="launch speed v₀" unit="m/s" value={proj.v0} min={5} max={120} step={1} onChange={(v) => setProj((q) => ({ ...q, v0: v }))} />
                <Slider label="launch angle θ" unit="°" value={proj.angle} min={5} max={85} step={1} onChange={(v) => setProj((q) => ({ ...q, angle: v }))} />
                <GravityPicker value={proj.g} onChange={(g) => setProj((q) => ({ ...q, g }))} />
                <Slider label="mass" unit="kg" value={proj.mass} min={0.1} max={10} step={0.1} onChange={(v) => setProj((q) => ({ ...q, mass: v }))} />
                <Slider label="diameter" unit="m" value={proj.dia} min={0.05} max={1} step={0.05} onChange={(v) => setProj((q) => ({ ...q, dia: v }))} />
                <Toggle icon={Wind} label="quadratic air drag" sub="ρ = 1.225 kg/m³ · C_d = 0.47" value={proj.drag} onChange={(v) => setProj((q) => ({ ...q, drag: v }))} />
                <Toggle icon={Spline} label="angle sweep 15–75°" sub="vacuum reference fan" value={proj.sweep} onChange={(v) => setProj((q) => ({ ...q, sweep: v }))} />
              </div>
            )}
            {sim === "pendulum" && (
              <div className="mt-3 space-y-3">
                <Slider label="length L" unit="m" value={pend.L} min={0.5} max={6} step={0.1} onChange={(v) => setPend((q) => ({ ...q, L: v }))} />
                <Slider label="release angle θ₀" unit="°" value={pend.theta0} min={5} max={170} step={1} onChange={(v) => setPend((q) => ({ ...q, theta0: v }))} />
                <GravityPicker value={pend.g} onChange={(g) => setPend((q) => ({ ...q, g }))} />
                <Slider label="damping b" unit="s⁻¹" value={pend.damping} min={0} max={1} step={0.01} onChange={(v) => setPend((q) => ({ ...q, damping: v }))} />
              </div>
            )}
            {sim === "spring" && (
              <div className="mt-3 space-y-3">
                <Slider label="stiffness k" unit="N/m" value={spring.k} min={5} max={200} step={1} onChange={(v) => setSpring((q) => ({ ...q, k: v }))} />
                <Slider label="mass m" unit="kg" value={spring.m} min={0.5} max={20} step={0.5} onChange={(v) => setSpring((q) => ({ ...q, m: v }))} />
                <Slider label="stretch x₀" unit="m" value={spring.x0} min={0.1} max={1} step={0.05} onChange={(v) => setSpring((q) => ({ ...q, x0: v }))} />
                <Slider label="damping c" unit="kg/s" value={spring.damping} min={0} max={5} step={0.05} onChange={(v) => setSpring((q) => ({ ...q, damping: v }))} />
              </div>
            )}
            {sim === "orbit" && (
              <div className="mt-3 space-y-3">
                <Slider label="initial radius r₀" unit="×10⁶ km" value={orbit.r0} min={40} max={400} step={1} onChange={(v) => setOrbit((q) => ({ ...q, r0: v }))} />
                <Slider label="velocity factor" unit="× v_circ" value={orbit.vFactor} min={0.5} max={1.55} step={0.01} onChange={(v) => setOrbit((q) => ({ ...q, vFactor: v }))} />
                <div className="rounded-xl border border-dashed border-edge2/70 bg-ink/30 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-fog">
                  tangential kick of <span className="text-cyan-soft">{fmt(orbit.vFactor * Math.sqrt(1.32712440018e11 / (orbit.r0 * 1e6)), 3)} km/s</span> — factor 1.00 gives
                  a circular orbit, &gt;1.41 escapes past √2·v_circ.
                </div>
              </div>
            )}
            <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-fog/70">
              changing parameters re-launches the experiment instantly.
            </p>
          </Panel>

          {/* telemetry */}
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <Label>Live telemetry</Label>
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-mint">
                <span className={cn("h-1.5 w-1.5 rounded-full", playing ? "animate-pulse bg-mint" : "bg-fog")} />
                {playing ? "STREAMING" : "HOLD"}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {tele.map((t) => (
                <div key={t.k} className="flex items-baseline justify-between gap-3 rounded-lg border border-edge/60 bg-ink/40 px-3 py-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fog">{t.k}</span>
                  <span className={cn(
                    "text-right font-mono text-[12px] font-semibold tnum",
                    t.tone === "cyan" ? "text-cyan-soft" : t.tone === "amber" ? "text-amber" : "text-paper"
                  )}>
                    {t.v}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* insight */}
          <Panel className="p-4">
            <Label>Reference numbers</Label>
            <div className="mt-2.5 space-y-1.5 font-mono text-[10.5px] leading-relaxed text-fog">
              {sim === "projectile" && (() => {
                const th = (proj.angle * Math.PI) / 180;
                const R = (proj.v0 ** 2 * Math.sin(2 * th)) / proj.g;
                const H = (proj.v0 * Math.sin(th)) ** 2 / (2 * proj.g);
                const T = (2 * proj.v0 * Math.sin(th)) / proj.g;
                return (
                  <>
                    <div>vacuum range <span className="text-amber">{pretty(R, 5)} m</span></div>
                    <div>max height <span className="text-amber">{pretty(H, 5)} m</span></div>
                    <div>flight time <span className="text-amber">{pretty(T, 5)} s</span></div>
                    <div className="pt-1 text-fog/70">enable drag to watch the trajectory sag short of the dashed vacuum marker.</div>
                  </>
                );
              })()}
              {sim === "pendulum" && (
                <>
                  <div>T = 2π√(L/g) = <span className="text-amber">{fmt(2 * Math.PI * Math.sqrt(pend.L / pend.g), 5)} s</span></div>
                  <div className="pt-1 text-fog/70">release above ~20° and the measured period drifts long of the small-angle theory — the sinθ term is doing its job.</div>
                </>
              )}
              {sim === "spring" && (
                <>
                  <div>T = 2π√(m/k) = <span className="text-amber">{fmt(2 * Math.PI * Math.sqrt(spring.m / spring.k), 5)} s</span></div>
                  <div className="pt-1 text-fog/70">energy shuttles spring ↔ kinetic; damping bleeds the total bar.</div>
                </>
              )}
              {sim === "orbit" && (
                <>
                  <div>μ☉ = <span className="text-amber">1.3271×10¹¹ km³/s²</span></div>
                  <div className="pt-1 text-fog/70">specific energy ε decides fate: ε &lt; 0 elliptical bound, ε ≥ 0 parabolic escape.</div>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Slider({ label, unit, value, min, max, step, onChange }: {
  label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{label}</span>
        <span className="font-mono text-[11.5px] font-semibold text-cyan-soft tnum">
          {fmt(value, 5)} <span className="font-normal text-fog">{unit}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-cyan"
      />
    </div>
  );
}

function GravityPicker({ value, onChange }: { value: number; onChange: (g: number) => void }) {
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">gravity</span>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {G_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.g)}
            className={cn(
              "rounded-lg border px-1 py-1.5 font-mono text-[9.5px] transition-all",
              Math.abs(value - p.g) < 1e-9
                ? "border-cyan/50 bg-cyan/10 text-cyan"
                : "border-edge bg-ink/60 text-fog hover:border-edge2 hover:text-ghost"
            )}
          >
            {p.label}
            <span className="block text-[8.5px] opacity-70">{p.g}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ icon: Icon, label, sub, value, onChange }: {
  icon: LucideIcon; label: string; sub: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        value ? "border-cyan/40 bg-cyan/[0.07]" : "border-edge bg-ink/40 hover:border-edge2"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", value ? "text-cyan" : "text-fog")} />
      <span className="flex-1">
        <span className={cn("block font-mono text-[10.5px]", value ? "text-cyan-soft" : "text-ghost")}>{label}</span>
        <span className="block font-mono text-[9px] text-fog/70">{sub}</span>
      </span>
      <span className={cn(
        "relative h-4.5 w-8 shrink-0 rounded-full border transition-colors",
        value ? "border-cyan/60 bg-cyan/25" : "border-edge2 bg-ink"
      )} style={{ height: 18 }}>
        <span
          className={cn("absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all", value ? "bg-cyan" : "bg-fog/60")}
          style={{ left: value ? 16 : 3 }}
        />
      </span>
    </button>
  );
}
