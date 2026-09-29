import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy, Crosshair, Eraser, Hand, Pencil, Trash2, Undo2, ZoomIn, ZoomOut, Focus, Check,
} from "lucide-react";
import { fmt, pretty } from "../lib/num";
import { Label, Panel, Select } from "../components/ui";
import { cn } from "../utils/cn";

/* ==================================================================== */
/* Calibration presets — the axis scale turns pixels into physics       */
/* ==================================================================== */

interface AxisCal { name: string; sym: string; unit: string; perDiv: number }
interface Cal {
  x: AxisCal;
  y: AxisCal;
  slopeName: string;
  slopeUnit: string;
  areaName: string;
  areaUnit: string;
}

interface Preset extends Cal { id: string; title: string }

const PRESETS: Preset[] = [
  { id: "velocity", title: "Kinematics · v(t)",
    x: { name: "Time", sym: "t", unit: "s", perDiv: 1 },
    y: { name: "Velocity", sym: "v", unit: "m/s", perDiv: 5 },
    slopeName: "Acceleration a", slopeUnit: "m/s²", areaName: "Distance travelled", areaUnit: "m" },
  { id: "position", title: "Kinematics · x(t)",
    x: { name: "Time", sym: "t", unit: "s", perDiv: 1 },
    y: { name: "Position", sym: "x", unit: "m", perDiv: 10 },
    slopeName: "Velocity v", slopeUnit: "m/s", areaName: "Displacement-seconds", areaUnit: "m·s" },
  { id: "scope", title: "Oscilloscope · V(t)",
    x: { name: "Time", sym: "t", unit: "ms", perDiv: 2 },
    y: { name: "Voltage", sym: "V", unit: "V", perDiv: 2 },
    slopeName: "Slew rate", slopeUnit: "V/ms", areaName: "Volt-seconds", areaUnit: "V·ms" },
  { id: "current", title: "Electrical · I(t)",
    x: { name: "Time", sym: "t", unit: "s", perDiv: 0.5 },
    y: { name: "Current", sym: "I", unit: "A", perDiv: 1 },
    slopeName: "Current rate", slopeUnit: "A/s", areaName: "Charge transferred", areaUnit: "C" },
  { id: "impulse", title: "Dynamics · F(t)",
    x: { name: "Time", sym: "t", unit: "s", perDiv: 0.2 },
    y: { name: "Force", sym: "F", unit: "N", perDiv: 20 },
    slopeName: "Force rate", slopeUnit: "N/s", areaName: "Impulse", areaUnit: "N·s" },
  { id: "energy", title: "Power · P(t)",
    x: { name: "Time", sym: "t", unit: "s", perDiv: 2 },
    y: { name: "Power", sym: "P", unit: "W", perDiv: 50 },
    slopeName: "Power ramp", slopeUnit: "W/s", areaName: "Energy", areaUnit: "J" },
  { id: "work", title: "Work · F(x)",
    x: { name: "Distance", sym: "x", unit: "m", perDiv: 0.5 },
    y: { name: "Force", sym: "F", unit: "N", perDiv: 10 },
    slopeName: "Stiffness k", slopeUnit: "N/m", areaName: "Work done", areaUnit: "J" },
  { id: "pv", title: "Thermo · p(V)",
    x: { name: "Volume", sym: "V", unit: "L", perDiv: 0.5 },
    y: { name: "Pressure", sym: "p", unit: "bar", perDiv: 1 },
    slopeName: "dp/dV", slopeUnit: "bar/L", areaName: "Boundary work", areaUnit: "bar·L" },
  { id: "temp", title: "Thermal · T(t)",
    x: { name: "Time", sym: "t", unit: "s", perDiv: 5 },
    y: { name: "Temperature", sym: "T", unit: "°C", perDiv: 10 },
    slopeName: "Heating rate", slopeUnit: "°C/s", areaName: "Degree-seconds", areaUnit: "°C·s" },
  { id: "custom", title: "Pure math · y(x)",
    x: { name: "Abscissa", sym: "x", unit: "", perDiv: 1 },
    y: { name: "Ordinate", sym: "y", unit: "", perDiv: 1 },
    slopeName: "Slope dy/dx", slopeUnit: "", areaName: "Integral ∫y dx", areaUnit: "" },
];

/* ==================================================================== */
/* Types & helpers                                                      */
/* ==================================================================== */

interface Stroke { id: number; name: string; color: string; pts: [number, number][] }
type Mode = "draw" | "measure" | "erase" | "pan";
interface Markers { a: number | null; b: number | null }

const PALETTE = ["#3ae2ff", "#ffb454", "#b78cff", "#7dfccf", "#ff7d9c"];
const DEFAULT_VIEW = { cx: 0, cy: 0, sx: 12, yz: 1 };

function niceStep(raw: number): number {
  if (raw <= 0 || !Number.isFinite(raw)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const f = raw / base;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * base;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ==================================================================== */
/* Component                                                            */
/* ==================================================================== */

export default function MeasureGraph() {
  const [presetId, setPresetId] = useState("velocity");
  const [cal, setCal] = useState<Cal>(() => {
    const p = PRESETS[0];
    return { x: { ...p.x }, y: { ...p.y }, slopeName: p.slopeName, slopeUnit: p.slopeUnit, areaName: p.areaName, areaUnit: p.areaUnit };
  });
  const [mode, setMode] = useState<Mode>("draw");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [markers, setMarkers] = useState<Markers>({ a: null, b: null });
  const [probe, setProbe] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const [copied, setCopied] = useState(false);

  const idRef = useRef(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<
    | { kind: "pan"; px: number; py: number; view: typeof view }
    | { kind: "marker"; which: "a" | "b" }
    | null
  >(null);

  const activeStroke = strokes.find((s) => s.id === activeId) ?? strokes[strokes.length - 1] ?? null;

  /* sorted samples of the active stroke for analysis */
  const samples = useMemo(() => {
    if (!activeStroke) return [] as [number, number][];
    return [...activeStroke.pts].sort((a, b) => a[0] - b[0]);
  }, [activeStroke]);

  /* ---------------- calibration ---------------- */
  const applyPreset = (id: string) => {
    const p = PRESETS.find((q) => q.id === id) ?? PRESETS[0];
    setPresetId(p.id);
    setCal({ x: { ...p.x }, y: { ...p.y }, slopeName: p.slopeName, slopeUnit: p.slopeUnit, areaName: p.areaName, areaUnit: p.areaUnit });
  };

  const xPer = Math.abs(cal.x.perDiv) > 1e-15 ? cal.x.perDiv : 1;
  const yPer = Math.abs(cal.y.perDiv) > 1e-15 ? cal.y.perDiv : 1;
  const xPhys = (d: number) => d * xPer;
  const yPhys = (d: number) => d * yPer;
  const slopePhys = (s: number) => s * (yPer / xPer);
  const areaPhys = (a: number) => a * xPer * yPer;

  /* ---------------- analysis math ---------------- */
  const slopeAt = useCallback((i: number): number => {
    const s = samples;
    if (s.length < 3) return NaN;
    const k = Math.min(3, Math.floor(s.length / 4) || 1);
    const a = s[clamp(i - k, 0, s.length - 1)];
    const b = s[clamp(i + k, 0, s.length - 1)];
    if (b[0] === a[0]) return NaN;
    return (b[1] - a[1]) / (b[0] - a[0]);
  }, [samples]);

  const interpY = useCallback((xv: number): number => {
    const s = samples;
    if (!s.length) return NaN;
    if (xv <= s[0][0]) return s[0][1];
    if (xv >= s[s.length - 1][0]) return s[s.length - 1][1];
    let lo = 0, hi = s.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (s[mid][0] < xv) lo = mid; else hi = mid; }
    const [x0, y0] = s[lo], [x1, y1] = s[hi];
    const t = x1 === x0 ? 0 : (xv - x0) / (x1 - x0);
    return y0 + t * (y1 - y0);
  }, [samples]);

  /** signed trapezoid integral (div²) of the active stroke between xa..xb */
  const integrate = useCallback((xa: number, xb: number): { area: number; mean: number; rms: number; min: number; max: number } | null => {
    const s = samples;
    if (s.length < 2 || xa === xb) return null;
    const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
    const pts: [number, number][] = [[lo, interpY(lo)]];
    for (const p of s) if (p[0] > lo && p[0] < hi) pts.push(p);
    pts.push([hi, interpY(hi)]);
    let area = 0, sq = 0, min = Infinity, max = -Infinity;
    for (const p of pts) { min = Math.min(min, p[1]); max = Math.max(max, p[1]); }
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const dx = x1 - x0;
      area += 0.5 * (y0 + y1) * dx;
      sq += (dx / 3) * (y0 * y0 + y0 * y1 + y1 * y1);
    }
    const span = hi - lo;
    return { area, mean: area / span, rms: Math.sqrt(Math.max(0, sq / span)), min, max };
  }, [samples, interpY]);

  /* probe evaluation at hover */
  const probeData = useMemo(() => {
    if (!probe || !samples.length || mode !== "measure") return null;
    const xw = probe.x;
    if (xw < samples[0][0] - 1e-9 || xw > samples[samples.length - 1][0] + 1e-9) return null;
    let best = 0, bd = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const d = Math.abs(samples[i][0] - xw);
      if (d < bd) { bd = d; best = i; }
    }
    const y = samples[best][1];
    return { x: samples[best][0], y, slope: slopeAt(best) };
  }, [probe, samples, slopeAt, mode]);

  /* interval evaluation between markers */
  const interval = useMemo(() => {
    const { a, b } = markers;
    if (a === null || b === null || a === b || !samples.length) return null;
    const integ = integrate(a, b);
    if (!integ) return null;
    const ya = interpY(a), yb = interpY(b);
    return {
      xa: Math.min(a, b), xb: Math.max(a, b),
      dx: Math.abs(b - a),
      dy: yb - ya,
      avgSlope: (yb - ya) / (b - a),
      ...integ,
      ya: interpY(Math.min(a, b)), yb: interpY(Math.max(a, b)),
    };
  }, [markers, samples, integrate, interpY]);

  /* ---------------- sizing ---------------- */
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

  /* ---------------- coordinate maps ---------------- */
  const getMaps = useCallback(() => {
    const { w, h } = size;
    const { cx, cy, sx, yz } = view;
    const sy = sx * (h / w) * yz;
    const xMin = cx - sx / 2, yMin = cy - sy / 2;
    return {
      w, h, sx, sy, xMin, yMin,
      px: (x: number) => ((x - xMin) / sx) * w,
      py: (y: number) => h - ((y - yMin) / sy) * h,
      wx: (p: number) => xMin + (p / w) * sx,
      wy: (p: number) => yMin + ((h - p) / h) * sy,
    };
  }, [size, view]);

  /* ---------------- drawing ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const { w, h, sx, sy, xMin, yMin, px, py } = getMaps();
    canvas.width = w * DPR; canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a1220"); grad.addColorStop(1, "#070c16");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    /* grid — always 0.2 div minor, adaptive labeled major */
    const step = niceStep(sx / 10);
    const stepY = niceStep(sy / 7);
    const grid = (st: number, vert: boolean, min: number, max: number, alpha: number) => {
      ctx.strokeStyle = `rgba(110,150,220,${alpha})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = Math.ceil(min / st); i <= Math.floor(max / st); i++) {
        const p = vert ? px(i * st) : py(i * st);
        if (vert) { ctx.moveTo(p, 0); ctx.lineTo(p, h); } else { ctx.moveTo(0, p); ctx.lineTo(w, p); }
      }
      ctx.stroke();
    };
    grid(step / 5, true, xMin, xMin + sx, 0.055);
    grid(stepY / 5, false, yMin, yMin + sy, 0.055);
    grid(step, true, xMin, xMin + sx, 0.13);
    grid(stepY, false, yMin, yMin + sy, 0.13);

    /* axes through origin */
    if (xMin <= 0 && xMin + sx >= 0) {
      ctx.strokeStyle = "rgba(58,226,255,0.45)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), h); ctx.stroke();
    }
    if (yMin <= 0 && yMin + sy >= 0) {
      ctx.strokeStyle = "rgba(58,226,255,0.45)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(w, py(0)); ctx.stroke();
    }

    /* tick labels — physical units */
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(120,145,190,0.9)";
    const lblY = yMin <= 0 && yMin + sy >= 0 ? Math.min(h - 6, py(0) + 14) : h - 6;
    for (let i = Math.ceil(xMin / step); i <= Math.floor((xMin + sx) / step); i++) {
      if (i === 0) continue;
      const t = fmt(xPhys(i * step), 3);
      ctx.fillText(t, px(i * step) - ctx.measureText(t).width / 2, lblY);
    }
    const lblX = xMin <= 0 && xMin + sx >= 0 ? clamp(px(0) + 6, 4, w - 48) : 4;
    for (let j = Math.ceil(yMin / stepY); j <= Math.floor((yMin + sy) / stepY); j++) {
      if (j === 0) continue;
      ctx.fillText(fmt(yPhys(j * stepY), 3), lblX, Math.max(12, py(j * stepY) - 4));
    }

    /* axis captions */
    ctx.fillStyle = "rgba(58,226,255,0.75)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    const xCap = `${cal.x.sym}${cal.x.unit ? ` [${cal.x.unit}]` : ""}`;
    ctx.fillText(xCap, w - ctx.measureText(xCap).width - 10, h - 8);
    const yCap = `${cal.y.sym}${cal.y.unit ? ` [${cal.y.unit}]` : ""}`;
    ctx.fillText(yCap, 8, 16);

    /* interval shading between markers */
    const { a, b } = markers;
    if (a !== null && b !== null && a !== b) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const x0 = px(lo), x1 = px(hi);
      ctx.fillStyle = "rgba(255,180,84,0.07)";
      ctx.fillRect(x0, 0, x1 - x0, h);
      /* filled area under curve */
      if (activeStroke && samples.length > 1) {
        ctx.beginPath();
        ctx.moveTo(px(lo), py(0));
        for (let xx = lo; xx <= hi; xx += (hi - lo) / 60) ctx.lineTo(px(xx), py(interpY(xx)));
        ctx.lineTo(px(hi), py(interpY(hi)));
        ctx.lineTo(px(hi), py(0));
        ctx.closePath();
        ctx.fillStyle = "rgba(255,180,84,0.14)";
        ctx.fill();
      }
      for (const [mv, color] of [[a, "#3ae2ff"], [b, "#ffb454"]] as [number, string][]) {
        const X = px(mv);
        ctx.strokeStyle = color; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, h); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#070b14"; ctx.strokeStyle = color;
        const flag = `${mv === a ? "A" : "B"}  ${fmt(xPhys(mv), 4)}${cal.x.unit ? " " + cal.x.unit : ""}`;
        ctx.font = "10px 'JetBrains Mono', monospace";
        const fw = ctx.measureText(flag).width + 14;
        const fx = clamp(X - fw / 2, 4, w - fw - 4);
        ctx.beginPath(); ctx.roundRect(fx, 6, fw, 18, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color; ctx.fillText(flag, fx + 7, 19);
      }
    }

    /* strokes */
    const drawStroke = (pts: [number, number][], color: string, glow: boolean) => {
      if (pts.length < 2) return;
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
      ctx.beginPath();
      ctx.moveTo(px(pts[0][0]), py(pts[0][1]));
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2;
        const my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(px(pts[i][0]), py(pts[i][1]), px(mx), py(my));
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(px(last[0]), py(last[1]));
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    for (const s of strokes) drawStroke(s.pts, s.color, s.id === (activeStroke?.id ?? -1));
    if (draft.length > 1) drawStroke(draft, PALETTE[strokes.length % PALETTE.length], true);

    /* probe crosshair */
    if (mode === "measure" && probe && probeData) {
      const X = px(probeData.x), Y = py(probeData.y);
      ctx.strokeStyle = "rgba(160,190,235,0.4)"; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(w, Y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#070b14"; ctx.strokeStyle = activeStroke?.color ?? "#3ae2ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X, Y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      /* slope tangent */
      if (Number.isFinite(probeData.slope)) {
        const mPix = (-probeData.slope * sx * h) / (sy * w); // dy_px/dx_px
        const len = 34;
        const dxPix = len / Math.hypot(1, mPix);
        ctx.strokeStyle = "#ffb454"; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(X - dxPix, Y - dxPix * mPix);
        ctx.lineTo(X + dxPix, Y + dxPix * mPix);
        ctx.stroke(); ctx.setLineDash([]);
      }

      /* tooltip */
      const lines = [
        `${cal.x.sym} = ${fmt(xPhys(probeData.x), 5)}${cal.x.unit ? " " + cal.x.unit : ""}`,
        `${cal.y.sym} = ${fmt(yPhys(probeData.y), 5)}${cal.y.unit ? " " + cal.y.unit : ""}`,
        Number.isFinite(probeData.slope)
          ? `${cal.slopeName} = ${fmt(slopePhys(probeData.slope), 4)}${cal.slopeUnit ? " " + cal.slopeUnit : ""}`
          : null,
      ].filter(Boolean) as string[];
      ctx.font = "11px 'JetBrains Mono', monospace";
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22;
      const bh = 16 + lines.length * 17;
      let bx = probe.sx + 14, by = probe.sy - bh - 12;
      if (bx + bw > w - 8) bx = probe.sx - bw - 14;
      if (by < 30) by = probe.sy + 16;
      ctx.fillStyle = "rgba(8,13,24,0.94)"; ctx.strokeStyle = "rgba(58,226,255,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill(); ctx.stroke();
      lines.forEach((l, i) => {
        ctx.fillStyle = i === 0 ? "rgba(150,170,205,0.95)" : i === 1 ? "#3ae2ff" : "#ffb454";
        ctx.fillText(l, bx + 11, by + 13 + i * 17);
      });
    }
  }, [getMaps, strokes, draft, markers, probe, probeData, activeStroke, samples, cal, mode, interpY]);

  /* ---------------- interactions ---------------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const markerHit = (sxp: number): "a" | "b" | null => {
    const { px } = getMaps();
    if (markers.a !== null && Math.abs(px(markers.a) - sxp) < 9) return "a";
    if (markers.b !== null && Math.abs(px(markers.b) - sxp) < 9) return "b";
    return null;
  };

  const strokeDist = (pts: [number, number][], sxp: number, syp: number): number => {
    const { px, py } = getMaps();
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const x1 = px(pts[i - 1][0]), y1 = py(pts[i - 1][1]);
      const x2 = px(pts[i][0]), y2 = py(pts[i][1]);
      const dx = x2 - x1, dy = y2 - y1;
      const t = clamp(((sxp - x1) * dx + (syp - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      best = Math.min(best, Math.hypot(sxp - (x1 + t * dx), syp - (y1 + t * dy)));
    }
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { sx: sxp, sy: syp } = local(e);
    const { wx, wy } = getMaps();
    if (mode === "pan") {
      dragRef.current = { kind: "pan", px: e.clientX, py: e.clientY, view };
    } else if (mode === "draw") {
      setDraft([[wx(sxp), wy(syp)]]);
    } else if (mode === "erase") {
      const hit = strokes.filter((s) => strokeDist(s.pts, sxp, syp) < 10);
      if (hit.length) setStrokes((p) => p.filter((s) => !hit.includes(s)));
    } else if (mode === "measure") {
      const hit = markerHit(sxp);
      if (hit) { dragRef.current = { kind: "marker", which: hit }; return; }
      const xw = wx(sxp);
      setMarkers((m) => {
        if (m.a === null || (m.a !== null && m.b !== null)) return { a: xw, b: null };
        return { a: m.a, b: xw };
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { sx: sxp, sy: syp } = local(e);
    const { wx, wy } = getMaps();
    const drag = dragRef.current;
    if (drag?.kind === "pan") {
      const { w, h } = size;
      setView({
        cx: drag.view.cx - ((e.clientX - drag.px) / w) * drag.view.sx,
        cy: drag.view.cy + ((e.clientY - drag.py) / h) * (drag.view.sx * (h / w) * drag.view.yz),
        sx: drag.view.sx, yz: drag.view.yz,
      });
      return;
    }
    if (drag?.kind === "marker") {
      setMarkers((m) => ({ ...m, [drag.which]: wx(sxp) }));
      return;
    }
    if (mode === "draw" && draft.length) {
      const { px, py } = getMaps();
      const last = draft[draft.length - 1];
      if (Math.hypot(px(wx(sxp)) - px(last[0]), py(wy(syp)) - py(last[1])) > 2.5) {
        setDraft((d) => [...d, [wx(sxp), wy(syp)]]);
      }
      return;
    }
    if (mode === "measure") setProbe({ x: wx(sxp), y: wy(syp), sx: sxp, sy: syp });
  };

  const onPointerUp = () => {
    if (mode === "draw" && draft.length > 1) {
      const id = idRef.current++;
      const s: Stroke = { id, name: `S${id}`, color: PALETTE[(id - 1) % PALETTE.length], pts: draft };
      setStrokes((p) => [...p, s]);
      setActiveId(id);
    }
    setDraft([]);
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const { sx: sxp } = local(e);
    const k = e.deltaY > 0 ? 1.14 : 0.88;
    setView((v) => {
      if (e.altKey) {
        return { ...v, yz: clamp(v.yz * k, 0.02, 60) };
      }
      const fx = sxp / size.w;
      const wxp = v.cx + (fx - 0.5) * v.sx;
      const nsx = clamp(v.sx * k, 1e-3, 1e6);
      return { ...v, sx: nsx, cx: wxp - (fx - 0.5) * nsx };
    });
  };

  /* ---------------- stroke ops ---------------- */
  const undo = () => setStrokes((p) => p.slice(0, -1));
  const clearAll = () => { setStrokes([]); setMarkers({ a: null, b: null }); setActiveId(null); };

  const copyCsv = async () => {
    if (!activeStroke) return;
    const hx = `${cal.x.sym}${cal.x.unit ? "_" + cal.x.unit.replace(/[^\w]/g, "") : ""}`;
    const hy = `${cal.y.sym}${cal.y.unit ? "_" + cal.y.unit.replace(/[^\w]/g, "") : ""}`;
    const rows = [hx + "," + hy, ...samples.map(([x, y]) => `${fmt(xPhys(x), 8)},${fmt(yPhys(y), 8)}`)];
    try { await navigator.clipboard.writeText(rows.join("\n")); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  /* ---------------- UI atoms ---------------- */
  const ModeBtn = ({ m, icon: Icon, title }: { m: Mode; icon: typeof Pencil; title: string }) => (
    <button
      onClick={() => setMode(m)}
      title={title}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[10px] transition-all",
        mode === m
          ? "border-cyan/50 bg-cyan/10 text-cyan shadow-[0_0_14px_rgba(58,226,255,0.15)]"
          : "border-edge bg-ink/70 text-fog hover:border-edge2 hover:text-ghost"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{title.toUpperCase()}</span>
    </button>
  );

  const Readout = ({ label, value, unit, tone = "default" }: { label: string; value: string; unit?: string; tone?: "default" | "cyan" | "amber" }) => (
    <div className="rounded-xl border border-edge/70 bg-ink/40 px-3.5 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fog">{label}</div>
      <div className={cn(
        "mt-1 break-all font-mono text-[15px] font-semibold tnum",
        tone === "cyan" ? "text-cyan-soft" : tone === "amber" ? "text-amber" : "text-paper"
      )}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-fog">{unit}</span>}
      </div>
    </div>
  );

  const cursorCls = mode === "pan" ? "cursor-grab active:cursor-grabbing" : mode === "erase" ? "cursor-cell" : "cursor-crosshair";

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
      {/* ============ canvas card ============ */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/70 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <ModeBtn m="draw" icon={Pencil} title="Draw" />
            <ModeBtn m="measure" icon={Crosshair} title="Measure" />
            <ModeBtn m="erase" icon={Eraser} title="Erase" />
            <ModeBtn m="pan" icon={Hand} title="Pan" />
          </div>
          <div className="flex items-center gap-1.5">
            <TBtn title="Zoom out" onClick={() => setView((v) => ({ ...v, sx: v.sx * 1.35 }))}><ZoomOut className="h-3.5 w-3.5" /></TBtn>
            <TBtn title="Zoom in" onClick={() => setView((v) => ({ ...v, sx: v.sx * 0.74 }))}><ZoomIn className="h-3.5 w-3.5" /></TBtn>
            <TBtn title="Reset view" onClick={() => setView(DEFAULT_VIEW)}><Focus className="h-3.5 w-3.5" /></TBtn>
            <span className="mx-1 h-4 w-px bg-edge" />
            <TBtn title="Undo stroke" onClick={undo}><Undo2 className="h-3.5 w-3.5" /></TBtn>
            <TBtn title="Clear everything" onClick={clearAll} danger><Trash2 className="h-3.5 w-3.5" /></TBtn>
          </div>
        </div>

        <div ref={wrapRef} className="relative h-[460px] w-full touch-none select-none sm:h-[540px]">
          <canvas
            ref={canvasRef}
            className={cn("h-full w-full", cursorCls)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => { onPointerUp(); setProbe(null); }}
            onWheel={onWheel}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-edge/60 bg-void/80 px-2.5 py-1.5 font-mono text-[10px] text-fog backdrop-blur">
            {mode === "draw" && "DRAW — sketch a curve with the pointer · scroll to zoom"}
            {mode === "measure" && "MEASURE — hover a trace for values · click to drop markers A/B · drag markers to adjust"}
            {mode === "erase" && "ERASE — click a trace to remove it"}
            {mode === "pan" && "PAN — drag to move the viewport"}
          </div>
        </div>
      </Panel>

      {/* ============ right column ============ */}
      <div className="space-y-3">
        {/* calibration */}
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <Label>Physical calibration</Label>
            <span className="font-mono text-[9px] text-fog/60">per division</span>
          </div>
          <Select value={presetId} onChange={applyPreset} className="mt-2.5">
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <AxisEditor axis="x" cal={cal.x} onChange={(x) => setCal((c) => ({ ...c, x }))} />
            <AxisEditor axis="y" cal={cal.y} onChange={(y) => setCal((c) => ({ ...c, y }))} />
          </div>
          <div className="mt-3 space-y-1.5 rounded-xl border border-dashed border-edge2/70 bg-ink/30 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-fog">
            <div>slope ↦ <span className="text-amber">{cal.slopeName}{cal.slopeUnit && ` [${cal.slopeUnit}]`}</span></div>
            <div>area ↦ <span className="text-amber">{cal.areaName}{cal.areaUnit && ` [${cal.areaUnit}]`}</span></div>
          </div>
        </Panel>

        {/* measurements */}
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <Label>Measurements</Label>
            {markers.a !== null && (
              <button
                onClick={() => setMarkers({ a: null, b: null })}
                className="font-mono text-[9.5px] text-fog transition-colors hover:text-rose"
              >
                CLEAR A/B
              </button>
            )}
          </div>
          {!probeData && !interval && (
            <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-fog">
              {strokes.length
                ? "Switch to MEASURE mode and hover a trace, or click twice to drop interval markers A and B."
                : "Draw a trace first — switch to DRAW mode and sketch with the pointer."}
            </p>
          )}
          {probeData && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Readout label={`${cal.x.name} (${cal.x.sym})`} value={pretty(xPhys(probeData.x), 6)} unit={cal.x.unit} />
              <Readout label={`${cal.y.name} (${cal.y.sym})`} value={pretty(yPhys(probeData.y), 6)} unit={cal.y.unit} tone="cyan" />
              <div className="col-span-2">
                <Readout
                  label={cal.slopeName + " · local slope"}
                  value={Number.isFinite(probeData.slope) ? pretty(slopePhys(probeData.slope), 6) : "—"}
                  unit={cal.slopeUnit}
                  tone="amber"
                />
              </div>
            </div>
          )}
          {interval && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Readout label={`Δ${cal.x.sym} interval`} value={pretty(xPhys(interval.dx), 6)} unit={cal.x.unit} />
              <Readout label={`Δ${cal.y.sym} change`} value={pretty(yPhys(interval.dy), 6)} unit={cal.y.unit} tone="cyan" />
              <Readout label={`Avg ${cal.slopeName.toLowerCase()}`} value={pretty(slopePhys(interval.avgSlope), 6)} unit={cal.slopeUnit} />
              <Readout label={`Mean ${cal.y.sym}`} value={pretty(yPhys(interval.mean), 6)} unit={cal.y.unit} />
              <Readout label={`${cal.y.sym} min → max`} value={`${fmt(yPhys(interval.min), 4)} → ${fmt(yPhys(interval.max), 4)}`} unit={cal.y.unit} />
              <Readout label={`RMS ${cal.y.sym}`} value={pretty(yPhys(interval.rms), 6)} unit={cal.y.unit} />
              <div className="col-span-2">
                <Readout
                  label={`${cal.areaName} · area under trace`}
                  value={pretty(areaPhys(interval.area), 7)}
                  unit={cal.areaUnit}
                  tone="amber"
                />
              </div>
            </div>
          )}
          {markers.a !== null && markers.b === null && (
            <p className="mt-2.5 font-mono text-[10px] text-fog">marker A set — click again for B to measure the interval.</p>
          )}
        </Panel>

        {/* traces */}
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <Label>Traces · {strokes.length}</Label>
            {activeStroke && (
              <button
                onClick={copyCsv}
                className="inline-flex items-center gap-1 rounded-md border border-edge bg-ink/70 px-2 py-1 font-mono text-[9.5px] text-fog transition-colors hover:border-cyan/40 hover:text-cyan"
                title="Copy active trace as CSV (physical units)"
              >
                {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />} CSV
              </button>
            )}
          </div>
          <div className="mt-2.5 space-y-1.5">
            {strokes.length === 0 && (
              <p className="font-mono text-[10.5px] leading-relaxed text-fog">
                No traces yet. The active trace is the one measurements apply to.
              </p>
            )}
            {strokes.map((s) => {
              const ys = s.pts.map((p) => p[1]);
              const xs = s.pts.map((p) => p[0]);
              const isActive = s.id === (activeStroke?.id ?? -1);
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                    isActive ? "border-cyan/40 bg-cyan/[0.06]" : "border-edge/70 bg-ink/40 hover:border-edge2"
                  )}
                >
                  <span className="h-6 w-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1">
                    <span className={cn("block font-mono text-[11px]", isActive ? "text-cyan-soft" : "text-ghost")}>{s.name}</span>
                    <span className="block font-mono text-[9.5px] text-fog/70">
                      {s.pts.length} pts · {cal.y.sym} ∈ [{fmt(yPhys(Math.min(...ys)), 3)}, {fmt(yPhys(Math.max(...ys)), 3)}]{cal.y.unit && ` ${cal.y.unit}`} · {cal.x.sym} span {fmt(xPhys(Math.max(...xs) - Math.min(...xs)), 3)}{cal.x.unit && ` ${cal.x.unit}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function AxisEditor({ axis, cal, onChange }: { axis: "x" | "y"; cal: AxisCal; onChange: (a: AxisCal) => void }) {
  const field = "w-full rounded-md border border-edge bg-ink/70 px-2 py-1.5 font-mono text-[11px] text-paper outline-none transition-colors focus:border-cyan/50";
  return (
    <div className="rounded-xl border border-edge/70 bg-ink/40 p-2.5">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan/80">{axis === "x" ? "X axis" : "Y axis"}</div>
      <div className="space-y-1.5">
        <input value={cal.name} onChange={(e) => onChange({ ...cal, name: e.target.value })} className={field} placeholder="quantity" spellCheck={false} />
        <div className="grid grid-cols-2 gap-1.5">
          <input value={cal.sym} onChange={(e) => onChange({ ...cal, sym: e.target.value })} className={field} placeholder="symbol" spellCheck={false} />
          <input value={cal.unit} onChange={(e) => onChange({ ...cal, unit: e.target.value })} className={field} placeholder="unit" spellCheck={false} />
        </div>
        <input
          value={String(cal.perDiv)}
          onChange={(e) => { const n = parseFloat(e.target.value); if (e.target.value === "" || Number.isFinite(n)) onChange({ ...cal, perDiv: e.target.value === "" ? 0 : (n as number) }); }}
          className={field}
          placeholder="value / div"
          spellCheck={false}
          inputMode="decimal"
        />
      </div>
    </div>
  );
}

function TBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-ink/70 text-fog transition-colors",
        danger ? "hover:border-rose/40 hover:text-rose" : "hover:border-cyan/40 hover:text-cyan"
      )}
    >
      {children}
    </button>
  );
}
