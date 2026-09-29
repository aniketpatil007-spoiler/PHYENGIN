import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Focus, Plus, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { compileFx } from "../lib/math";
import { fmt } from "../lib/num";
import { Label, Panel } from "../components/ui";
import { cn } from "../utils/cn";

interface FnDef { id: number; expr: string; color: string; enabled: boolean; }

const PALETTE = ["#3ae2ff", "#ffb454", "#b78cff", "#7dfccf", "#ff7d9c"];
const DEFAULT_VIEW = { cx: 0, cy: 0, sx: 20, yz: 1 };
const PRESETS = ["x^3 - 3x", "abs(sin(x))", "e^(-x^2) * cos(4x)", "ln(abs(x))", "tan(x)", "sinc(x)"];

type Evaluator = (x: number) => number;

function niceStep(raw: number): number {
  if (raw <= 0 || !Number.isFinite(raw)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const f = raw / base;
  const m = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return m * base;
}

export default function Plotter() {
  const [fns, setFns] = useState<FnDef[]>([
    { id: 1, expr: "sin(x)", color: PALETTE[0], enabled: true },
    { id: 2, expr: "0.2x^2 - 2", color: PALETTE[1], enabled: true },
  ]);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const idRef = useRef(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; view: typeof view } | null>(null);

  /* compile expressions */
  const compiled = useMemo(() => {
    const m = new Map<number, Evaluator | null>();
    for (const f of fns) m.set(f.id, f.enabled ? compileFx(f.expr) : null);
    return m;
  }, [fns]);

  const active = fns.filter((f) => f.enabled && compiled.get(f.id));

  /* ---------------- fit ---------------- */
  const fit = useCallback(() => {
    const { cx, sx } = view;
    let min = Infinity, max = -Infinity;
    for (const f of active) {
      const ev = compiled.get(f.id)!;
      for (let i = 0; i <= 600; i++) {
        const x = cx - sx / 2 + (i / 600) * sx;
        const y = ev(x);
        if (Number.isFinite(y)) { if (y < min) min = y; if (y > max) max = y; }
      }
    }
    if (!Number.isFinite(min) || min === max) return;
    const pad = (max - min) * 0.12 || 1;
    const spanY = (max - min) + 2 * pad;
    const { w, h } = size;
    setView((v) => ({ ...v, cy: (min + max) / 2, yz: spanY / (v.sx * (h / w)) }));
  }, [view, active, compiled, size]);

  /* initial fit */
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!fittedRef.current && size.w > 0) { fittedRef.current = true; fit(); }
  }, [size, fit]);

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

  /* ---------------- drawing ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = size;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const { cx, cy, sx, yz } = view;
    const sy = sx * (h / w) * yz;
    const xMin = cx - sx / 2, xMax = cx + sx / 2;
    const yMin = cy - sy / 2, yMax = cy + sy / 2;
    const px = (x: number) => ((x - xMin) / sx) * w;
    const py = (y: number) => h - ((y - yMin) / sy) * h;
    const wx = (pxv: number) => xMin + (pxv / w) * sx;

    // bg
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a1220");
    grad.addColorStop(1, "#070c16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // grid
    const stepX = niceStep(sx / 9);
    const stepY = niceStep(sy / 7);
    const drawGrid = (step: number, vertical: boolean, min: number, max: number, alpha: number) => {
      ctx.strokeStyle = `rgba(110,150,220,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const i0 = Math.ceil(min / step), i1 = Math.floor(max / step);
      for (let i = i0; i <= i1; i++) {
        const v = i * step;
        const p = vertical ? px(v) : py(v);
        if (vertical) { ctx.moveTo(p, 0); ctx.lineTo(p, h); } else { ctx.moveTo(0, p); ctx.lineTo(w, p); }
      }
      ctx.stroke();
    };
    drawGrid(stepX / 5, true, xMin, xMax, 0.05);
    drawGrid(stepY / 5, false, yMin, yMax, 0.05);
    drawGrid(stepX, true, xMin, xMax, 0.11);
    drawGrid(stepY, false, yMin, yMax, 0.11);

    // axes
    if (xMin <= 0 && xMax >= 0) {
      ctx.strokeStyle = "rgba(58,226,255,0.4)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), h); ctx.stroke();
    }
    if (yMin <= 0 && yMax >= 0) {
      ctx.strokeStyle = "rgba(58,226,255,0.4)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(w, py(0)); ctx.stroke();
    }

    // labels
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(120,145,190,0.85)";
    const lblY = yMin <= 0 && yMax >= 0 ? Math.min(h - 6, py(0) + 14) : h - 6;
    const i0 = Math.ceil(xMin / stepX), i1 = Math.floor(xMax / stepX);
    for (let i = i0; i <= i1; i++) {
      if (i === 0) continue;
      const v = i * stepX;
      const t = fmt(v, 3);
      ctx.fillText(t, px(v) - ctx.measureText(t).width / 2, lblY);
    }
    const lblX = xMin <= 0 && xMax >= 0 ? Math.max(6, Math.min(px(0) + 6, w - 44)) : 6;
    const j0 = Math.ceil(yMin / stepY), j1 = Math.floor(yMax / stepY);
    ctx.textAlign = "left";
    for (let j = j0; j <= j1; j++) {
      if (j === 0) continue;
      const v = j * stepY;
      ctx.fillText(fmt(v, 3), lblX, Math.max(12, py(v) - 4));
    }
    ctx.textAlign = "start";

    // curves
    for (const f of active) {
      const ev = compiled.get(f.id)!;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      let prevY = NaN;
      let started = false;
      for (let c = 0; c <= w; c++) {
        const x = wx(c);
        const y = ev(x);
        if (!Number.isFinite(y)) { started = false; prevY = NaN; continue; }
        const Y = py(y);
        if (!started) { ctx.moveTo(c, Y); started = true; }
        else if (Math.abs(y - prevY) > sy * 2.5) { ctx.moveTo(c, Y); }
        else ctx.lineTo(c, Y);
        prevY = y;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // trace
    if (hover && !dragRef.current) {
      const xw = wx(hover.x);
      ctx.strokeStyle = "rgba(160,190,235,0.35)";
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hover.x, 0); ctx.lineTo(hover.x, h); ctx.stroke();
      ctx.setLineDash([]);

      const rows: { color: string; text: string }[] = [];
      active.forEach((f, idx) => {
        const y = compiled.get(f.id)!(xw);
        if (!Number.isFinite(y)) return;
        const Y = py(y);
        if (Y > -30 && Y < h + 30) {
          ctx.fillStyle = "#070b14";
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(hover.x, Y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        rows.push({ color: f.color, text: `f${idx + 1} = ${fmt(y, 5)}` });
      });

      if (rows.length) {
        const lines = [`x = ${fmt(xw, 5)}`, ...rows.map((r) => r.text)];
        ctx.font = "11px 'JetBrains Mono', monospace";
        const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22;
        const bh = 18 + lines.length * 16;
        let bx = hover.x + 14, by = hover.y - bh - 12;
        if (bx + bw > w - 8) bx = hover.x - bw - 14;
        if (by < 8) by = hover.y + 16;
        ctx.fillStyle = "rgba(8,13,24,0.92)";
        ctx.strokeStyle = "rgba(58,226,255,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const r = 7;
        ctx.roundRect(bx, by, bw, bh, r);
        ctx.fill(); ctx.stroke();
        lines.forEach((l, i) => {
          ctx.fillStyle = i === 0 ? "rgba(150,170,205,0.9)" : rows[i - 1].color;
          ctx.fillText(l, bx + 11, by + 12 + i * 16 + 2);
        });
      }
    }
  }, [active, compiled, view, hover, size]);

  /* ---------------- interactions ---------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, view };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (dragRef.current) {
      const d = dragRef.current;
      const { w, h } = size;
      const sy = d.view.sx * (h / w) * d.view.yz;
      setView({
        cx: d.view.cx - ((e.clientX - d.px) / w) * d.view.sx,
        cy: d.view.cy + ((e.clientY - d.py) / h) * sy,
        sx: d.view.sx,
        yz: d.view.yz,
      });
    } else {
      setHover({ x, y });
    }
  };
  const endDrag = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / size.w;
    const fy = (e.clientY - rect.top) / size.h;
    const k = e.deltaY > 0 ? 1.14 : 0.88;
    setView((v) => {
      const sy = v.sx * (size.h / size.w) * v.yz;
      if (e.altKey) {
        // vertical zoom about cursor
        const wy = v.cy + (0.5 - fy) * sy;
        const nyz = Math.min(60, Math.max(0.02, v.yz * k));
        const nsy = v.sx * (size.h / size.w) * nyz;
        return { ...v, yz: nyz, cy: wy - (0.5 - fy) * nsy };
      }
      const wxp = v.cx + (fx - 0.5) * v.sx;
      const nsx = Math.min(1e12, Math.max(1e-9, v.sx * k));
      return { ...v, sx: nsx, cx: wxp - (fx - 0.5) * nsx };
    });
  };

  const zoomBtn = (k: number) =>
    setView((v) => ({ ...v, sx: Math.min(1e12, Math.max(1e-9, v.sx * k)) }));

  /* ---------------- fn list ops ---------------- */
  const addFn = (expr = "") => {
    const id = idRef.current++;
    setFns((p) => [...p, { id, expr, color: PALETTE[(p.length) % PALETTE.length], enabled: true }]);
  };
  const updateFn = (id: number, patch: Partial<FnDef>) =>
    setFns((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFn = (id: number) => setFns((p) => p.filter((f) => f.id !== id));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <Panel className="overflow-hidden">
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/70 px-4 py-2.5">
          <Label>Cartesian canvas · drag to pan · scroll to zoom · ⌥ scroll y-axis</Label>
          <div className="flex items-center gap-1.5">
            <TBtn title="Zoom out" onClick={() => zoomBtn(1.35)}><ZoomOut className="h-3.5 w-3.5" /></TBtn>
            <TBtn title="Zoom in" onClick={() => zoomBtn(0.74)}><ZoomIn className="h-3.5 w-3.5" /></TBtn>
            <TBtn title="Fit curves" onClick={fit}><Focus className="h-3.5 w-3.5" /></TBtn>
            <TBtn title="Reset view" onClick={() => setView(DEFAULT_VIEW)}><RotateCcw className="h-3.5 w-3.5" /></TBtn>
          </div>
        </div>

        {/* canvas */}
        <div ref={wrapRef} className="relative h-[440px] w-full touch-none select-none sm:h-[520px]">
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={() => { endDrag(); setHover(null); }}
            onWheel={onWheel}
            onDoubleClick={fit}
          />
          {/* HUD */}
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-edge/60 bg-void/80 px-2.5 py-1.5 font-mono text-[10px] text-fog backdrop-blur">
            x ∈ [{fmt(view.cx - view.sx / 2, 3)}, {fmt(view.cx + view.sx / 2, 3)}]
            {hover && <span className="text-cyan/80"> · x = {fmt(view.cx - view.sx / 2 + (hover.x / size.w) * view.sx, 4)}</span>}
          </div>
        </div>
      </Panel>

      {/* function list */}
      <div className="space-y-3">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge/70 px-4 py-3">
            <Label>Traces · f(x)</Label>
            <button
              onClick={() => addFn()}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan/40 bg-cyan/10 px-2.5 py-1.5 font-mono text-[10px] text-cyan transition-shadow hover:shadow-glow"
            >
              <Plus className="h-3 w-3" /> ADD
            </button>
          </div>
          <div className="space-y-1.5 p-3">
            {fns.map((f, i) => {
              const invalid = f.enabled && f.expr.trim() !== "" && compiled.get(f.id) == null;
              return (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2 py-2 transition-colors",
                    invalid ? "border-rose/50 bg-rose/[0.04]" : "border-edge/70 bg-ink/40"
                  )}
                >
                  <span
                    className="h-7 w-1.5 shrink-0 rounded-full"
                    style={{ background: f.color, boxShadow: f.enabled ? `0 0 10px ${f.color}66` : "none", opacity: f.enabled ? 1 : 0.3 }}
                  />
                  <span className="w-6 shrink-0 font-mono text-[11px] text-fog">f{i + 1}</span>
                  <input
                    value={f.expr}
                    onChange={(e) => updateFn(f.id, { expr: e.target.value })}
                    placeholder="e.g. x*sin(x)"
                    spellCheck={false}
                    className={cn(
                      "w-full min-w-0 flex-1 border-0 bg-transparent font-mono text-[12.5px] outline-none",
                      invalid ? "text-rose placeholder:text-rose/50" : "text-cyan-soft"
                    )}
                  />
                  <button onClick={() => updateFn(f.id, { enabled: !f.enabled })} className="p-1 text-fog transition-colors hover:text-cyan" title="Toggle">
                    {f.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => removeFn(f.id)} className="p-1 text-fog transition-colors hover:text-rose" title="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <Label>Quick inject</Label>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => addFn(p)}
                className="rounded-md border border-edge/80 bg-ink/50 px-2 py-1 font-mono text-[10.5px] text-fog transition-colors hover:border-cyan/40 hover:text-cyan"
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-fog/70">
            Kernel supports sin cos tan asin log ln sqrt abs exp sigmoid… constants pi, e, tau.
            Vertical breaks are clamped automatically — try tan(x).
          </p>
        </Panel>
      </div>
    </div>
  );
}

function TBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-ink/70 text-fog transition-colors hover:border-cyan/40 hover:text-cyan"
    >
      {children}
    </button>
  );
}
