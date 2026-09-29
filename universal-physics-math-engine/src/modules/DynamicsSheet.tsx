import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle as CircleIcon, Eraser, Hand, Minus, Pause, Play, RotateCcw, Slash, Square, Trash2, type LucideIcon,
} from "lucide-react";
import { fmt } from "../lib/num";
import { Label, Panel } from "../components/ui";
import { cn } from "../utils/cn";

/* ==================================================================== */
/* Physics model — a compact impulse engine (y-up, metres, 40 px/m)     */
/* ==================================================================== */

const S = 40; // pixels per metre
const PHYS_DT = 1 / 240;

interface Body {
  id: number;
  kind: "ball" | "box";
  x: number; y: number;       // metres, centre
  vx: number; vy: number;     // m/s
  r: number;                  // ball radius (m)
  w: number; h: number;       // box extents (m)
  mass: number;
  invM: number;
  e: number;                  // restitution
  mu: number;                 // friction
  color: string;
  fixed: boolean;
  spin: number;               // cosmetic rolling angle
}

interface Chain { id: number; pts: [number, number][]; color: string }

type Tool = "move" | "ball" | "box" | "ramp" | "terrain" | "erase";

const COLORS = ["#3ae2ff", "#ffb454", "#b78cff", "#7dfccf", "#ff7d9c", "#9befff"];

const MATERIALS = [
  { id: "rubber", label: "Rubber", e: 0.88, mu: 0.55 },
  { id: "steel", label: "Steel", e: 0.62, mu: 0.08 },
  { id: "wood", label: "Wood", e: 0.34, mu: 0.42 },
  { id: "ice", label: "Ice", e: 0.12, mu: 0.02 },
];

const PLANETS = [
  { id: "moon", label: "Moon", g: 1.62 },
  { id: "earth", label: "Earth", g: 9.81 },
  { id: "mars", label: "Mars", g: 3.71 },
  { id: "jup", label: "Jupiter", g: 24.79 },
  { id: "void", label: "0-g", g: 0 },
];

const invM = (mass: number, fixed: boolean) => (fixed ? 0 : 1 / Math.max(0.01, mass));

function makeBody(kind: "ball" | "box", id: number, x: number, y: number, dim: { r?: number; w?: number; h?: number }, mat = MATERIALS[0]): Body {
  const r = dim.r ?? 0;
  const w = dim.w ?? 0, h = dim.h ?? 0;
  const area = kind === "ball" ? Math.PI * r * r : w * h;
  const mass = Math.max(0.1, area * 220); // 220 kg/m² "sheet density"
  return {
    id, kind, x, y, vx: 0, vy: 0, r, w, h,
    mass, invM: invM(mass, false),
    e: mat.e, mu: mat.mu,
    color: COLORS[id % COLORS.length],
    fixed: false, spin: Math.random() * Math.PI * 2,
  };
}

/* ------------------ collision helpers (impulse resolution) ------------------ */

function resolvePair(a: Body, b: Body) {
  if (a.invM + b.invM === 0) return;
  let nx = 0, ny = 0, pen = 0;

  if (a.kind === "ball" && b.kind === "ball") {
    const dx = b.x - a.x, dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2);
    nx = dx / d; ny = dy / d; pen = rr - d;
  } else if (a.kind === "box" && b.kind === "box") {
    const ox = (a.w + b.w) / 2 - Math.abs(b.x - a.x);
    if (ox <= 0) return;
    const oy = (a.h + b.h) / 2 - Math.abs(b.y - a.y);
    if (oy <= 0) return;
    if (ox < oy) { nx = Math.sign(b.x - a.x) || 1; pen = ox; }
    else { ny = Math.sign(b.y - a.y) || 1; pen = oy; }
  } else {
    const circ: Body = a.kind === "ball" ? a : b;
    const box: Body = a.kind === "ball" ? b : a;
    const sgn = a.kind === "ball" ? 1 : -1;
    const cx = Math.max(box.x - box.w / 2, Math.min(circ.x, box.x + box.w / 2));
    const cy = Math.max(box.y - box.h / 2, Math.min(circ.y, box.y + box.h / 2));
    let dx = circ.x - cx, dy = circ.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 > circ.r * circ.r) return;
    if (d2 === 0) {
      // centre inside box — push along smallest exit axis
      const exL = circ.x - (box.x - box.w / 2) + circ.r;
      const exR = (box.x + box.w / 2) - circ.x + circ.r;
      const exB = circ.y - (box.y - box.h / 2) + circ.r;
      const exT = (box.y + box.h / 2) - circ.y + circ.r;
      const m = Math.min(exL, exR, exB, exT);
      if (m === exL) { dx = -1; dy = 0; } else if (m === exR) { dx = 1; dy = 0; }
      else if (m === exB) { dx = 0; dy = -1; } else { dx = 0; dy = 1; }
      pen = m;
    } else {
      const d = Math.sqrt(d2);
      dx /= d; dy /= d; pen = circ.r - d;
    }
    nx = dx * sgn; ny = dy * sgn;
  }

  const invSum = a.invM + b.invM;
  // positional correction
  const corr = Math.max(pen - 0.004, 0) * 0.75 / invSum;
  a.x -= nx * corr * a.invM; a.y -= ny * corr * a.invM;
  b.x += nx * corr * b.invM; b.y += ny * corr * b.invM;

  // relative velocity along normal
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn > 0) return;
  const e = Math.min(a.e, b.e);
  const j = (-(1 + e) * vn) / invSum;
  a.vx -= j * nx * a.invM; a.vy -= j * ny * a.invM;
  b.vx += j * nx * b.invM; b.vy += j * ny * b.invM;

  // friction
  const tx = -ny, ty = nx;
  const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
  const mu = Math.sqrt(a.mu * b.mu);
  let jt = -vt / invSum;
  const maxJt = j * mu;
  jt = Math.max(-maxJt, Math.min(maxJt, jt));
  a.vx -= jt * tx * a.invM; a.vy -= jt * ty * a.invM;
  b.vx += jt * tx * b.invM; b.vy += jt * ty * b.invM;
}

function collideChain(body: Body, chain: Chain) {
  if (body.invM === 0) return;
  const pts = chain.pts;
  const TH = 0.06; // chain half-thickness (m)
  const test = (px: number, py: number, rad: number) => {
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy || 1e-9;
      let t = ((px - x1) * dx + (py - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const qx = x1 + t * dx, qy = y1 + t * dy;
      let nx = px - qx, ny = py - qy;
      const d2 = nx * nx + ny * ny;
      const rr = rad + TH;
      if (d2 >= rr * rr || d2 < 1e-12) continue;
      const d = Math.sqrt(d2);
      nx /= d; ny /= d;
      const pen = rr - d;
      px += nx * pen; py += ny * pen;
      const vn = body.vx * nx + body.vy * ny;
      if (vn < 0) {
        const j = -(1 + body.e) * vn;
        body.vx += j * nx; body.vy += j * ny;
        const tx2 = -ny, ty2 = nx;
        const vt = body.vx * tx2 + body.vy * ty2;
        let jt = -vt;
        jt = Math.max(-Math.abs(j) * body.mu, Math.min(Math.abs(j) * body.mu, jt));
        body.vx += jt * tx2; body.vy += jt * ty2;
      }
    }
    return [px, py] as const;
  };
  if (body.kind === "ball") {
    const [nx, ny] = test(body.x, body.y, body.r) ?? [body.x, body.y];
    body.x = nx; body.y = ny;
  } else {
    // collide the 4 corners as small probe circles
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const px = body.x + (ox * body.w) / 2, py = body.y + (oy * body.h) / 2;
      const r = test(px, py, 0.02);
      if (r) {
        body.x += r[0] - px; body.y += r[1] - py;
      }
    }
  }
}

function collideWalls(body: Body, W: number, H: number) {
  if (body.invM === 0) return;
  const res = (nx: number, ny: number, pen: number) => {
    if (pen <= 0) return;
    body.x += nx * pen; body.y += ny * pen;
    const vn = body.vx * nx + body.vy * ny;
    if (vn < 0) {
      const j = -(1 + body.e) * vn;
      body.vx += j * nx; body.vy += j * ny;
      const tx = -ny, ty = nx;
      const vt = body.vx * tx + body.vy * ty;
      let jt = -vt;
      jt = Math.max(-Math.abs(j) * body.mu, Math.min(Math.abs(j) * body.mu, jt));
      body.vx += jt * tx; body.vy += jt * ty;
    }
  };
  const ex = body.kind === "ball" ? body.r : body.w / 2;
  const ey = body.kind === "ball" ? body.r : body.h / 2;
  res(0, 1, -(body.y - ey));          // floor y=0
  res(1, 0, -(body.x - ex));          // left wall
  res(-1, 0, body.x + ex - W);        // right wall
  if (H > 0) res(0, -1, body.y + ey - H); // ceiling
}

/* ==================================================================== */
/* Component                                                            */
/* ==================================================================== */

export default function DynamicsSheet() {
  const [tool, setTool] = useState<Tool>("ball");
  const [running, setRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [g, setG] = useState(9.81);
  const [drag, setDrag] = useState(0.02);
  const [vectors, setVectors] = useState(true);
  const [matId, setMatId] = useState("rubber");
  const [selected, setSelected] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [ver, setVer] = useState(0);
  const [tick, setTick] = useState(0);
  const [preview, setPreview] = useState<{ kind: Tool; x0: number; y0: number; x1: number; y1: number; pts: [number, number][] } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const chainsRef = useRef<Chain[]>([]);
  const snapshotRef = useRef<Body[] | null>(null);
  const idRef = useRef(1);
  const runningRef = useRef(running);
  const dragStateRef = useRef<{
    kind: "body"; id: number; ox: number; oy: number; lastX: number; lastY: number; lastT: number; flingX: number; flingY: number;
  } | { kind: "draw"; pts: [number, number][]; x0: number; y0: number } | null>(null);
  const paramsRef = useRef({ g, drag, timeScale });
  runningRef.current = running;
  paramsRef.current = { g, drag, timeScale };

  const mat = MATERIALS.find((m) => m.id === matId) ?? MATERIALS[0];

  /* world size in metres */
  const W = size.w / S;
  const H = (size.h - 46) / S;

  /* sizing */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(60, r.width), h: Math.max(60, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* seed scene once */
  useEffect(() => {
    if (bodiesRef.current.length) return;
    const b1 = makeBody("ball", idRef.current++, 3.5, 6.5, { r: 0.55 });
    b1.vx = 4.5;
    const b2 = makeBody("ball", idRef.current++, 8, 7.5, { r: 0.75 }, MATERIALS[1]);
    b2.vx = -2.5;
    const b3 = makeBody("box", idRef.current++, 5.8, 3, { w: 1.3, h: 0.8 }, MATERIALS[2]);
    bodiesRef.current = [b1, b2, b3];
    chainsRef.current = [
      { id: idRef.current++, color: "#5b6d90", pts: [[10.5, 5.2], [14.5, 2.4]] },
    ];
    setVer((v) => v + 1);
  }, []);

  /* physics step */
  const stepWorld = useCallback((dt: number) => {
    const { g: gg, drag: dd } = paramsRef.current;
    const Wm = wrapRef.current ? wrapRef.current.clientWidth / S : 20;
    const Hm = wrapRef.current ? (wrapRef.current.clientHeight - 46) / S : 12;
    const bodies = bodiesRef.current;
    for (const b of bodies) {
      if (b.fixed) { b.vx = 0; b.vy = 0; continue; }
      b.vy -= gg * dt;
      // quadratic-ish air drag
      const sp = Math.hypot(b.vx, b.vy);
      const f = Math.max(0, 1 - dd * sp * dt);
      b.vx *= f; b.vy *= f;
      const vmax = 55;
      const v = Math.hypot(b.vx, b.vy);
      if (v > vmax) { b.vx *= vmax / v; b.vy *= vmax / v; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === "ball") b.spin += (b.vx / Math.max(0.05, b.r)) * dt;
    }
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++)
        resolvePair(bodies[i], bodies[j]);
    for (const b of bodies) {
      for (const c of chainsRef.current) collideChain(b, c);
      collideWalls(b, Wm, Hm);
    }
  }, []);

  /* loop + render */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dtReal = Math.min(0.06, (now - last) / 1000);
      last = now;
      if (runningRef.current) {
        acc += dtReal * paramsRef.current.timeScale;
        let n = 0;
        while (acc >= PHYS_DT && n < 40) { stepWorld(PHYS_DT); acc -= PHYS_DT; n++; }
      } else acc = 0;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) render(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, preview, running, vectors, selected, ver, g, stepWorld]);

  /* ---------------- render ---------------- */
  const X = useCallback((wx: number) => wx * S, []);
  const Y = useCallback((wy: number) => size.h - 46 - wy * S, [size.h]);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const { w, h } = size;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    if (canvasRef.current && (canvasRef.current.width !== Math.round(w * DPR) || canvasRef.current.height !== Math.round(h * DPR))) {
      canvasRef.current.width = Math.round(w * DPR); canvasRef.current.height = Math.round(h * DPR);
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // bg
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a1220"); grad.addColorStop(1, "#070c16");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(110,150,220,0.07)";
    for (let gx = 21; gx < w; gx += 26) for (let gy = 21; gy < h; gy += 26) ctx.fillRect(gx, gy, 1.4, 1.4);

    // metre ticks on floor
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.strokeStyle = "rgba(140,165,210,0.28)"; ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(140,165,210,0.5)";
    for (let i = 1; i < w / S; i++) {
      ctx.beginPath(); ctx.moveTo(X(i), Y(0)); ctx.lineTo(X(i), Y(0) + (i % 5 === 0 ? 10 : 5)); ctx.stroke();
      if (i % 5 === 0) ctx.fillText(`${i}`, X(i) - 3, Y(0) + 20);
    }

    // floor + border
    ctx.strokeStyle = "rgba(140,165,210,0.5)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
    ctx.strokeStyle = "rgba(140,165,210,0.2)"; ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 16) { ctx.beginPath(); ctx.moveTo(gx, Y(0)); ctx.lineTo(gx - 6, Y(0) + 9); ctx.stroke(); }
    ctx.strokeStyle = "rgba(58,226,255,0.18)";
    ctx.strokeRect(0.5, 0.5, w - 1, Y(0));

    // chains (ramps + terrain)
    for (const c of chainsRef.current) {
      ctx.strokeStyle = "rgba(125,140,170,0.95)"; ctx.lineWidth = THICK_PX; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      c.pts.forEach(([px, py], i) => { const sx = X(px), sy = Y(py); i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy); });
      ctx.stroke();
      ctx.strokeStyle = "rgba(58,226,255,0.25)"; ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // bodies
    for (const b of bodiesRef.current) {
      const bx = X(b.x), by = Y(b.y);
      const isSel = b.id === selected;
      if (b.kind === "ball") {
        const rr = b.r * S;
        const g2 = ctx.createRadialGradient(bx - rr * 0.35, by - rr * 0.4, rr * 0.15, bx, by, rr);
        g2.addColorStop(0, "#e8f6ff"); g2.addColorStop(0.25, b.color); g2.addColorStop(1, "#0b1322");
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fill();
        // spin marker
        ctx.strokeStyle = "rgba(7,11,20,0.85)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(b.spin) * rr * 0.85, by + Math.sin(b.spin) * rr * 0.85); ctx.stroke();
      } else {
        const ww = b.w * S, hh = b.h * S;
        const g2 = ctx.createLinearGradient(bx - ww / 2, by - hh / 2, bx + ww / 2, by + hh / 2);
        g2.addColorStop(0, "#e8f6ff"); g2.addColorStop(0.3, b.color); g2.addColorStop(1, "#0b1322");
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.roundRect(bx - ww / 2, by - hh / 2, ww, hh, 5); ctx.fill();
        ctx.strokeStyle = "rgba(7,11,20,0.5)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(bx - ww / 2 + 4, by); ctx.lineTo(bx + ww / 2 - 4, by); ctx.stroke();
      }
      if (b.fixed) {
        ctx.fillStyle = "rgba(232,238,251,0.85)";
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (isSel) {
        ctx.strokeStyle = "#3ae2ff"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
        const pad = 5;
        if (b.kind === "ball") { ctx.beginPath(); ctx.arc(bx, by, b.r * S + pad, 0, Math.PI * 2); ctx.stroke(); }
        else { const ww = b.w * S + pad * 2, hh = b.h * S + pad * 2; ctx.strokeRect(bx - ww / 2, by - hh / 2, ww, hh); }
        ctx.setLineDash([]);
      }
      // velocity vector
      if (vectors && (Math.abs(b.vx) > 0.15 || Math.abs(b.vy) > 0.15)) {
        const len = Math.min(70, 12 + Math.hypot(b.vx, b.vy) * 9);
        const v = Math.hypot(b.vx, b.vy);
        drawArrow2(ctx, bx, by, bx + (b.vx / v) * len, by - (b.vy / v) * len, "rgba(255,180,84,0.85)");
      }
    }

    // preview
    if (preview) {
      ctx.strokeStyle = "rgba(58,226,255,0.85)"; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6;
      if (preview.kind === "ball") {
        const p0 = w2s(preview.x0, preview.y0), p1 = w2s(preview.x1, preview.y1);
        ctx.beginPath(); ctx.arc(X(p0[0]), Y(p0[1]), Math.max(4, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * S), 0, Math.PI * 2); ctx.stroke();
      } else if (preview.kind === "box") {
        const p0 = w2s(preview.x0, preview.y0), p1 = w2s(preview.x1, preview.y1);
        const x0 = Math.min(X(p0[0]), X(p1[0])), x1 = Math.max(X(p0[0]), X(p1[0]));
        const y0 = Math.min(Y(p0[1]), Y(p1[1])), y1 = Math.max(Y(p0[1]), Y(p1[1]));
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      } else if (preview.kind === "ramp") {
        const p0 = w2s(preview.x0, preview.y0), p1 = w2s(preview.x1, preview.y1);
        ctx.beginPath(); ctx.moveTo(X(p0[0]), Y(p0[1])); ctx.lineTo(X(p1[0]), Y(p1[1])); ctx.stroke();
      } else if (preview.kind === "terrain" && preview.pts.length > 1) {
        ctx.beginPath();
        preview.pts.forEach(([px, py], i) => { i === 0 ? ctx.moveTo(X(px), Y(py)) : ctx.lineTo(X(px), Y(py)); });
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // HUD
    ctx.font = "10px 'JetBrains Mono', monospace";
    const bodies = bodiesRef.current;
    let ke = 0, pe = 0;
    for (const b of bodies) {
      ke += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
      pe += b.mass * paramsRef.current.g * (b.y - (b.kind === "ball" ? b.r : b.h / 2));
    }
    const hud = `Σ KE ${fmt(Math.max(0, ke), 4)} J   Σ PE ${fmt(Math.max(0, pe), 4)} J   g ${paramsRef.current.g} m/s²`;
    ctx.fillStyle = "rgba(120,145,190,0.85)";
    ctx.fillText(hud, 12, 18);
    const status = running ? "LIVE" : "EDIT — drag objects, draw bodies, press RUN";
    const sw = ctx.measureText(status).width + 20;
    ctx.fillStyle = "rgba(8,13,24,0.88)";
    ctx.strokeStyle = running ? "rgba(125,252,207,0.4)" : "rgba(58,226,255,0.4)";
    ctx.beginPath(); ctx.roundRect(w - sw - 12, 8, sw, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = running ? "#7dfccf" : "#3ae2ff";
    ctx.fillText(status, w - sw - 2, 22);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, preview, running, vectors, selected, g, ver, X, Y]);

  const w2s = useCallback((px: number, py: number): [number, number] => [px / S, (size.h - 46 - py) / S], [size.h]);

  /* ---------------- pointer ---------------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const hitBody = (wx: number, wy: number): Body | null => {
    const bodies = bodiesRef.current;
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      if (b.kind === "ball") { if (Math.hypot(wx - b.x, wy - b.y) <= b.r) return b; }
      else if (Math.abs(wx - b.x) <= b.w / 2 && Math.abs(wy - b.y) <= b.h / 2) return b;
    }
    return null;
  };

  const hitChain = (wx: number, wy: number): Chain | null => {
    for (const c of chainsRef.current) {
      for (let i = 1; i < c.pts.length; i++) {
        const [x1, y1] = c.pts[i - 1], [x2, y2] = c.pts[i];
        const dx = x2 - x1, dy = y2 - y1;
        const l2 = dx * dx + dy * dy || 1e-9;
        const t = Math.max(0, Math.min(1, ((wx - x1) * dx + (wy - y1) * dy) / l2));
        if (Math.hypot(wx - (x1 + t * dx), wy - (y1 + t * dy)) < 0.22) return c;
      }
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { sx, sy } = local(e);
    const [wx, wy] = w2s(sx, sy);
    if (tool === "move") {
      const b = hitBody(wx, wy);
      setSelected(b ? b.id : null);
      if (b) {
        dragStateRef.current = { kind: "body", id: b.id, ox: wx - b.x, oy: wy - b.y, lastX: wx, lastY: wy, lastT: performance.now(), flingX: 0, flingY: 0 };
      }
    } else if (tool === "erase") {
      const b = hitBody(wx, wy);
      if (b) {
        bodiesRef.current = bodiesRef.current.filter((q) => q.id !== b.id);
        if (selected === b.id) setSelected(null);
        setVer((v) => v + 1);
        return;
      }
      const c = hitChain(wx, wy);
      if (c) { chainsRef.current = chainsRef.current.filter((q) => q.id !== c.id); setVer((v) => v + 1); }
    } else {
      dragStateRef.current = { kind: "draw", pts: [[wx, wy]], x0: sx, y0: sy };
      setPreview({ kind: tool, x0: sx, y0: sy, x1: sx, y1: sy, pts: [[wx, wy]] });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = local(e);
    const [wx, wy] = w2s(sx, sy);
    const drag = dragStateRef.current;
    if (!drag) return;
    if (drag.kind === "body") {
      const b = bodiesRef.current.find((q) => q.id === drag.id);
      if (!b) return;
      const now = performance.now();
      const dt = Math.max(1e-3, (now - drag.lastT) / 1000);
      drag.flingX = 0.75 * drag.flingX + 0.25 * ((wx - drag.lastX) / dt);
      drag.flingY = 0.75 * drag.flingY + 0.25 * ((wy - drag.lastY) / dt);
      drag.lastX = wx; drag.lastY = wy; drag.lastT = now;
      b.x = wx - drag.ox;
      b.y = wy - drag.oy;
      b.x = Math.max((b.kind === "ball" ? b.r : b.w / 2), Math.min(W - (b.kind === "ball" ? b.r : b.w / 2), b.x));
      b.y = Math.max(b.kind === "ball" ? b.r : b.h / 2, Math.min(H - (b.kind === "ball" ? b.r : b.h / 2), b.y));
      b.vx = 0; b.vy = 0;
    } else {
      if (tool === "terrain") {
        const pts = drag.pts;
        const last = pts[pts.length - 1];
        if (Math.hypot(wx - last[0], wy - last[1]) > 0.12) pts.push([wx, wy]);
        setPreview({ kind: "terrain", x0: drag.x0, y0: drag.y0, x1: sx, y1: sy, pts: [...pts] });
      } else {
        setPreview({ kind: tool, x0: drag.x0, y0: drag.y0, x1: sx, y1: sy, pts: drag.pts });
      }
    }
  };

  const onPointerUp = () => {
    const drag = dragStateRef.current;
    if (drag?.kind === "body") {
      const b = bodiesRef.current.find((q) => q.id === drag.id);
      if (b && !b.fixed) {
        const vmax = 24;
        b.vx = Math.max(-vmax, Math.min(vmax, drag.flingX));
        b.vy = Math.max(-vmax, Math.min(vmax, drag.flingY));
      }
    } else if (drag?.kind === "draw" && preview) {
      if (tool === "ball") {
        const p0 = w2s(preview.x0, preview.y0), p1 = w2s(preview.x1, preview.y1);
        const r = Math.max(0.18, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
        const nb = makeBody("ball", idRef.current++, p0[0], Math.max(r + 0.02, p0[1]), { r }, mat);
        bodiesRef.current.push(nb); setSelected(nb.id);
      } else if (tool === "box") {
        const p0 = w2s(preview.x0, preview.y0), p1 = w2s(preview.x1, preview.y1);
        const w = Math.max(0.3, Math.abs(p1[0] - p0[0])), h = Math.max(0.3, Math.abs(p1[1] - p0[1]));
        const nb = makeBody("box", idRef.current++, (p0[0] + p1[0]) / 2, Math.max(h / 2 + 0.02, (p0[1] + p1[1]) / 2), { w, h }, mat);
        bodiesRef.current.push(nb); setSelected(nb.id);
      } else if (tool === "ramp") {
        const p0 = w2s(preview.x0, preview.y0), p1 = w2s(preview.x1, preview.y1);
        if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.4)
          chainsRef.current.push({ id: idRef.current++, color: "#5b6d90", pts: [p0, p1] });
      } else if (tool === "terrain" && preview.pts.length > 1) {
        chainsRef.current.push({ id: idRef.current++, color: "#5b6d90", pts: preview.pts });
      }
      setVer((v) => v + 1);
    }
    dragStateRef.current = null;
    setPreview(null);
  };

  /* ---------------- run controls ---------------- */
  const run = () => {
    snapshotRef.current = JSON.parse(JSON.stringify(bodiesRef.current)) as Body[];
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    if (snapshotRef.current) bodiesRef.current = JSON.parse(JSON.stringify(snapshotRef.current)) as Body[];
    setRunning(false);
    setVer((v) => v + 1);
  };
  const clearAll = () => {
    bodiesRef.current = []; chainsRef.current = [];
    snapshotRef.current = null;
    setSelected(null);
    setVer((v) => v + 1);
  };

  /* inspector tick */
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(iv);
  }, []);
  void tick;

  const sel = bodiesRef.current.find((b) => b.id === selected) ?? null;
  const updateSel = (fn: (b: Body) => void) => {
    const b = bodiesRef.current.find((q) => q.id === selected);
    if (!b) return;
    fn(b);
    b.invM = invM(b.mass, b.fixed);
    setVer((v) => v + 1);
  };

  const TOOLS: { id: Tool; icon: LucideIcon; hint: string }[] = [
    { id: "move", icon: Hand, hint: "Move / fling" },
    { id: "ball", icon: CircleIcon, hint: "Draw ball" },
    { id: "box", icon: Square, hint: "Draw block" },
    { id: "ramp", icon: Slash, hint: "Static ramp" },
    { id: "terrain", icon: Minus, hint: "Freehand terrain" },
    { id: "erase", icon: Eraser, hint: "Erase" },
  ];

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.hint}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-xl border px-3 font-mono text-[10px] transition-all",
                  tool === t.id
                    ? "border-cyan/50 bg-cyan/10 text-cyan shadow-[0_0_14px_rgba(58,226,255,0.15)]"
                    : "border-edge bg-ink/70 text-fog hover:border-edge2 hover:text-ghost"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{t.hint.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-edge bg-ink/70 px-3 py-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fog">time ×</span>
            <input type="range" min={0.1} max={3} step={0.1} value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))} className="w-20 accent-cyan" />
            <span className="w-8 font-mono text-[11px] text-cyan-soft tnum">{timeScale.toFixed(1)}</span>
          </div>
          <button
            onClick={() => (running ? pause() : run())}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-cyan px-4 font-display text-[13px] font-semibold text-void transition-shadow hover:shadow-glow"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pause" : "Run"}
          </button>
          <button onClick={reset} title="Reset to launch state" className="inline-flex h-9 items-center gap-2 rounded-xl border border-edge2 bg-panel/60 px-3.5 font-display text-[13px] font-semibold text-ghost transition-colors hover:border-cyan/40 hover:text-cyan">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={clearAll} title="Clear sheet" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-edge bg-panel/60 text-fog transition-colors hover:border-rose/40 hover:text-rose">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* canvas */}
        <Panel className="overflow-hidden">
          <div ref={wrapRef} className="relative h-[500px] w-full touch-none select-none sm:h-[580px]">
            <canvas
              ref={canvasRef}
              className={cn("h-full w-full", tool === "move" ? "cursor-grab active:cursor-grabbing" : tool === "erase" ? "cursor-cell" : "cursor-crosshair")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>
        </Panel>

        {/* right column */}
        <div className="space-y-3">
          {/* environment */}
          <Panel className="p-4">
            <Label>Environment</Label>
            <div className="mt-2.5 grid grid-cols-5 gap-1.5">
              {PLANETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setG(p.g)}
                  className={cn(
                    "rounded-lg border px-1 py-1.5 font-mono text-[9px] transition-all",
                    Math.abs(g - p.g) < 1e-9 ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-edge bg-ink/60 text-fog hover:text-ghost"
                  )}
                >
                  {p.label}
                  <span className="block text-[8px] opacity-70">{p.g}</span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">air drag</span>
                <span className="font-mono text-[11px] text-cyan-soft tnum">{fmt(drag, 3)}</span>
              </div>
              <input type="range" min={0} max={0.3} step={0.005} value={drag} onChange={(e) => setDrag(parseFloat(e.target.value))} className="mt-1 w-full accent-cyan" />
            </div>
            <button
              onClick={() => setVectors((v) => !v)}
              className={cn(
                "mt-3 w-full rounded-lg border px-3 py-2 text-left font-mono text-[10px] transition-all",
                vectors ? "border-amber/50 bg-amber/10 text-amber" : "border-edge bg-ink/60 text-fog hover:text-ghost"
              )}
            >
              VELOCITY VECTORS {vectors ? "· ON" : "· OFF"}
            </button>
          </Panel>

          {/* material for new bodies */}
          <Panel className="p-4">
            <Label>New-body material</Label>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMatId(m.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left font-mono text-[10px] transition-all",
                    matId === m.id ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-edge bg-ink/60 text-fog hover:text-ghost"
                  )}
                >
                  {m.label}
                  <span className="block text-[8.5px] opacity-70">e={m.e} · μ={m.mu}</span>
                </button>
              ))}
            </div>
          </Panel>

          {/* inspector */}
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <Label>Object inspector</Label>
              {sel && (
                <button
                  onClick={() => { bodiesRef.current = bodiesRef.current.filter((q) => q.id !== sel.id); setSelected(null); setVer((v) => v + 1); }}
                  className="font-mono text-[9.5px] text-fog transition-colors hover:text-rose"
                >
                  DELETE
                </button>
              )}
            </div>
            {!sel ? (
              <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-fog">
                Draw a ball or block, then select it with the MOVE tool to edit its physical quantities. Drag with MOVE to fling it — release velocity becomes its launch vector.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-7 w-1.5 rounded-full" style={{ background: sel.color }} />
                  <span className="font-mono text-[12px] text-paper">
                    {sel.kind === "ball" ? `Ball · r = ${fmt(sel.r, 3)} m` : `Block · ${fmt(sel.w, 2)} × ${fmt(sel.h, 2)} m`}
                  </span>
                  <span className="font-mono text-[9px] text-fog">#{sel.id}</span>
                </div>

                <InspSlider label="mass" unit="kg" value={sel.mass} min={0.1} max={60} step={0.1} onChange={(v) => updateSel((b) => { b.mass = v; })} />
                <InspSlider label="restitution e" unit="" value={sel.e} min={0} max={1} step={0.01} onChange={(v) => updateSel((b) => { b.e = v; })} />
                <InspSlider label="friction μ" unit="" value={sel.mu} min={0} max={1} step={0.01} onChange={(v) => updateSel((b) => { b.mu = v; })} />

                <div className="grid grid-cols-2 gap-1.5">
                  <NumField label="vx · m/s" value={sel.vx} onChange={(v) => updateSel((b) => { b.vx = v; })} />
                  <NumField label="vy · m/s" value={sel.vy} onChange={(v) => updateSel((b) => { b.vy = v; })} />
                </div>

                <button
                  onClick={() => updateSel((b) => { b.fixed = !b.fixed; })}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left font-mono text-[10px] transition-all",
                    sel.fixed ? "border-amber/50 bg-amber/10 text-amber" : "border-edge bg-ink/60 text-fog hover:text-ghost"
                  )}
                >
                  PINNED {sel.fixed ? "· static body" : "· off"}
                </button>

                <div className="space-y-1.5 rounded-xl border border-edge/70 bg-ink/40 p-3">
                  <ReadRow k="speed |v|" v={`${fmt(Math.hypot(sel.vx, sel.vy), 4)} m/s`} tone="cyan" />
                  <ReadRow k="momentum p" v={`${fmt(sel.mass * Math.hypot(sel.vx, sel.vy), 4)} kg·m/s`} />
                  <ReadRow k="kinetic energy" v={`${fmt(0.5 * sel.mass * (sel.vx ** 2 + sel.vy ** 2), 4)} J`} tone="cyan" />
                  <ReadRow k="potential energy" v={`${fmt(Math.max(0, sel.mass * g * (sel.y - (sel.kind === "ball" ? sel.r : sel.h / 2))), 4)} J`} />
                  <ReadRow k="height above floor" v={`${fmt(Math.max(0, sel.y - (sel.kind === "ball" ? sel.r : sel.h / 2)), 3)} m`} />
                </div>
              </div>
            )}
          </Panel>

          {/* hint */}
          <Panel className="p-4">
            <Label>How to play</Label>
            <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-fog">
              1 · Sketch balls, blocks, ramps and terrain hills.
              2 · Select a body and set its mass, restitution, friction, vx/vy — or pin it static.
              3 · Press RUN: gravity takes over. Grab bodies mid-flight with MOVE and fling them.
              4 · RESET rewinds to the exact launch state you ran from.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const THICK_PX = 5;

function drawArrow2(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 7 * Math.cos(ang - 0.45), y1 - 7 * Math.sin(ang - 0.45));
  ctx.lineTo(x1 - 7 * Math.cos(ang + 0.45), y1 - 7 * Math.sin(ang + 0.45));
  ctx.closePath(); ctx.fill();
}

function InspSlider({ label, unit, value, min, max, step, onChange }: {
  label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fog">{label}</span>
        <span className="font-mono text-[11px] font-semibold text-cyan-soft tnum">{fmt(value, 4)}{unit && ` ${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1 w-full accent-cyan" />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-fog">{label}</div>
      <input
        defaultValue={fmt(value, 5)}
        key={fmt(value, 5)}
        onBlur={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(n); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full rounded-md border border-edge bg-ink/70 px-2 py-1.5 font-mono text-[11.5px] text-paper outline-none transition-colors focus:border-cyan/50 tnum"
      />
    </div>
  );
}

function ReadRow({ k, v, tone }: { k: string; v: string; tone?: "cyan" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog">{k}</span>
      <span className={cn("font-mono text-[11px] font-semibold tnum", tone === "cyan" ? "text-cyan-soft" : "text-paper")}>{v}</span>
    </div>
  );
}
