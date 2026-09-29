import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Cable, Eraser, Grid3x3, Hand, Layers, PanelLeft, PanelRight, Pencil,
  Plus, Search, Sigma, Trash2,
} from "lucide-react";
import {
  DISCIPLINES, EQUIPMENT, defaultParams, discById, equipByDisc, equipById,
  type DiscId, type EquipDef,
} from "../data/equipment";
import { drawSymbol } from "../lib/symbols";
import { fmt, pretty } from "../lib/num";
import { Label, Panel } from "../components/ui";
import { Tex } from "../components/Tex";
import { cn } from "../utils/cn";

/* ==================================================================== */

interface Item {
  uid: number;
  defId: string;
  x: number; y: number;
  params: Record<string, number>;
}
interface Link { uid: number; a: number; b: number }
interface Ink { uid: number; pts: [number, number][] }

type Tool = "select" | "place" | "link" | "pen" | "erase";

const IW = 124, IH = 92; // item footprint (px)

export default function Workbench() {
  const [disc, setDisc] = useState<DiscId | null>(null);
  const [dock, setDock] = useState<"left" | "right">("right");
  const [tool, setTool] = useState<Tool>("select");
  const [armed, setArmed] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [ink, setInk] = useState<Ink[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState({ w: 900, h: 600 });
  const [linkFrom, setLinkFrom] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const idRef = useRef(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ kind: "item"; uid: number; ox: number; oy: number } | { kind: "ink"; pts: [number, number][] } | null>(null);
  const stateRef = useRef({ items, links, ink, sel, linkFrom, cursor, tool });
  stateRef.current = { items, links, ink, sel, linkFrom, cursor, tool };

  const palette = useMemo(() => {
    if (!disc) return [];
    const q = query.toLowerCase();
    return equipByDisc(disc).filter((e) => !q || e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q));
  }, [disc, query]);

  const groups = useMemo(() => {
    const m = new Map<string, EquipDef[]>();
    for (const e of palette) {
      if (!m.has(e.group)) m.set(e.group, []);
      m.get(e.group)!.push(e);
    }
    return [...m.entries()];
  }, [palette]);

  const selItem = items.find((i) => i.uid === sel) ?? null;
  const selDef = selItem ? equipById(selItem.defId) ?? null : null;

  /* ---------------- sizing ---------------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(80, r.width), h: Math.max(80, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [disc, dock]);

  /* ---------------- render ---------------- */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const t = performance.now() / 1000;
        const { w, h } = size;
        const DPR = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== Math.round(w * DPR) || canvas.height !== Math.round(h * DPR)) {
          canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        const st = stateRef.current;
        const accent = disc ? discById(disc).accent : "#3ae2ff";

        // sheet bg
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0a1220"); grad.addColorStop(1, "#070c16");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(94,138,204,0.07)"; ctx.lineWidth = 1;
        for (let gx = 0; gx < w; gx += 26) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); ctx.stroke(); }
        for (let gy = 0; gy < h; gy += 26) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); ctx.stroke(); }
        // frame + title block
        ctx.strokeStyle = "rgba(58,226,255,0.16)"; ctx.strokeRect(10.5, 10.5, w - 21, h - 21);
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(120,145,190,0.6)";
        ctx.fillText(`SHEET · ${disc ? discById(disc).name.toUpperCase() : ""} · ${st.items.length} ITEMS · ${st.links.length} LINKS`, 20, 28);

        // ink
        for (const s of st.ink) {
          ctx.strokeStyle = "rgba(150,175,215,0.6)"; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath();
          s.pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
          ctx.stroke();
        }
        if (dragRef.current?.kind === "ink") {
          const pts = dragRef.current.pts;
          ctx.strokeStyle = accent; ctx.lineWidth = 1.8;
          ctx.beginPath();
          pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
          ctx.stroke();
        }

        // links
        for (const l of st.links) {
          const a = st.items.find((i) => i.uid === l.a), b = st.items.find((i) => i.uid === l.b);
          if (!a || !b) continue;
          const ax = a.x + IW / 2, ay = a.y + IH / 2, bx = b.x + IW / 2, by = b.y + IH / 2;
          const mx = (ax + bx) / 2;
          ctx.strokeStyle = "rgba(125,252,207,0.55)"; ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(ax, ay); ctx.lineTo(mx, ay); ctx.lineTo(mx, by); ctx.lineTo(bx, by);
          ctx.stroke();
          // flow dot
          const p = (t * 0.35) % 1;
          const seg = [[ax, ay, mx, ay], [mx, ay, mx, by], [mx, by, bx, by]];
          const k = Math.min(2, Math.floor(p * 3));
          const lp = (p * 3) % 1;
          const [x1, y1, x2, y2] = seg[k];
          ctx.fillStyle = "#7dfccf";
          ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * lp, y1 + (y2 - y1) * lp, 3, 0, Math.PI * 2); ctx.fill();
        }
        // pending link
        if (st.linkFrom !== null && st.cursor) {
          const a = st.items.find((i) => i.uid === st.linkFrom);
          if (a) {
            ctx.strokeStyle = "rgba(125,252,207,0.6)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(a.x + IW / 2, a.y + IH / 2); ctx.lineTo(st.cursor.x, st.cursor.y); ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // items
        for (const it of st.items) {
          const def = equipById(it.defId);
          if (!def) continue;
          const isSel = it.uid === st.sel;
          ctx.fillStyle = isSel ? "rgba(58,226,255,0.07)" : "rgba(16,24,40,0.85)";
          ctx.strokeStyle = isSel ? accent : "rgba(43,61,97,0.95)";
          ctx.lineWidth = isSel ? 2 : 1.2;
          ctx.beginPath(); ctx.roundRect(it.x, it.y, IW, IH, 10); ctx.fill(); ctx.stroke();
          if (isSel) {
            ctx.save();
            ctx.shadowColor = accent; ctx.shadowBlur = 14;
            ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.roundRect(it.x, it.y, IW, IH, 10); ctx.stroke();
            ctx.restore();
          }
          drawSymbol(ctx, def.shape, it.x + 8, it.y + 6, IW - 16, IH - 34, isSel ? accent : "#9db0d0", t);
          ctx.font = "9.5px 'JetBrains Mono', monospace";
          ctx.fillStyle = isSel ? "#e8eefb" : "rgba(157,176,208,0.9)";
          const nm = def.name.length > 18 ? def.name.slice(0, 17) + "…" : def.name;
          ctx.fillText(nm, it.x + IW / 2 - ctx.measureText(nm).width / 2, it.y + IH - 10);
          // headline output
          const o = def.outs[0];
          if (o) {
            const v = safe(() => o.f(it.params));
            const txt = `${fmt(v, 4)} ${o.unit}`;
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.85;
            ctx.fillText(txt, it.x + IW / 2 - ctx.measureText(txt).width / 2, it.y + IH - 22);
            ctx.globalAlpha = 1;
          }
        }

        // placement ghost
        if (st.tool === "place" && armed && st.cursor) {
          const def = equipById(armed);
          if (def) {
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = accent; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.roundRect(st.cursor.x - IW / 2, st.cursor.y - IH / 2, IW, IH, 10); ctx.stroke();
            ctx.setLineDash([]);
            drawSymbol(ctx, def.shape, st.cursor.x - IW / 2 + 8, st.cursor.y - IH / 2 + 6, IW - 16, IH - 34, accent, t);
            ctx.globalAlpha = 1;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, disc, armed]);

  /* ---------------- interactions ---------------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const hit = (x: number, y: number): Item | null => {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (x >= it.x && x <= it.x + IW && y >= it.y && y <= it.y + IH) return it;
    }
    return null;
  };

  const place = useCallback((defId: string, x: number, y: number) => {
    const def = equipById(defId);
    if (!def) return;
    const uid = idRef.current++;
    setItems((p) => [...p, { uid, defId, x: x - IW / 2, y: y - IH / 2, params: defaultParams(def) }]);
    setSel(uid);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = local(e);
    if (tool === "place" && armed) { place(armed, x, y); setTool("select"); setArmed(null); return; }
    if (tool === "erase") {
      const it = hit(x, y);
      if (it) {
        setItems((p) => p.filter((q) => q.uid !== it.uid));
        setLinks((p) => p.filter((l) => l.a !== it.uid && l.b !== it.uid));
        if (sel === it.uid) setSel(null);
      } else {
        setInk((p) => p.filter((s) => !s.pts.some(([px, py]) => Math.hypot(px - x, py - y) < 14)));
      }
      return;
    }
    if (tool === "link") {
      const it = hit(x, y);
      if (!it) { setLinkFrom(null); return; }
      if (linkFrom === null) setLinkFrom(it.uid);
      else if (linkFrom !== it.uid) {
        setLinks((p) => [...p, { uid: idRef.current++, a: linkFrom, b: it.uid }]);
        setLinkFrom(null);
      }
      return;
    }
    if (tool === "pen") { dragRef.current = { kind: "ink", pts: [[x, y]] }; return; }
    const it = hit(x, y);
    setSel(it ? it.uid : null);
    if (it) dragRef.current = { kind: "item", uid: it.uid, ox: x - it.x, oy: y - it.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = local(e);
    setCursor({ x, y });
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "item") {
      setItems((p) => p.map((q) => (q.uid === d.uid
        ? { ...q, x: Math.max(14, Math.min(size.w - IW - 14, x - d.ox)), y: Math.max(36, Math.min(size.h - IH - 14, y - d.oy)) }
        : q)));
    } else {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(x - last[0], y - last[1]) > 3) d.pts.push([x, y]);
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (d?.kind === "ink" && d.pts.length > 2) setInk((p) => [...p, { uid: idRef.current++, pts: d.pts }]);
    dragRef.current = null;
  };

  const setParam = (key: string, v: number) =>
    setItems((p) => p.map((it) => (it.uid === sel ? { ...it, params: { ...it.params, [key]: v } } : it)));

  const clearSheet = () => { setItems([]); setLinks([]); setInk([]); setSel(null); };

  /* ================================================================== */
  /* DASHBOARD                                                          */
  /* ================================================================== */
  if (!disc) {
    return (
      <div className="space-y-5">
        <Panel className="noise relative overflow-hidden px-6 py-10 sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan/10 blur-3xl" />
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-cyan">
            <Layers className="h-3.5 w-3.5" /> Step 1 · choose a domain
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-paper sm:text-4xl">
            What are we engineering today?
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ghost">
            Pick a discipline and the workbench imports its complete equipment library onto a drawing sheet —
            every component carrying live parameters and its governing equations.
          </p>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DISCIPLINES.map((d, i) => {
            const n = equipByDisc(d.id).length;
            return (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.45 }}
                onClick={() => { setDisc(d.id); setTool("select"); }}
                className="group relative overflow-hidden rounded-2xl border border-edge bg-gradient-to-b from-panel2/60 to-panel/80 p-5 text-left shadow-panel transition-all duration-300 hover:-translate-y-0.5"
                style={{ borderColor: undefined }}
              >
                <div
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `${d.accent}22` }}
                />
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl border text-xl"
                    style={{ borderColor: `${d.accent}55`, background: `${d.accent}12` }}
                  >
                    {d.glyph}
                  </span>
                  <span className="font-mono text-[10px] text-fog/70">{n} PARTS</span>
                </div>
                <div className="mt-4 font-display text-[18px] font-semibold" style={{ color: d.accent }}>{d.name}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{d.tag}</div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-fog">{d.blurb}</p>
                <div className="mt-4 flex items-center gap-1.5 font-mono text-[11px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ color: d.accent }}>
                  OPEN SHEET →
                </div>
              </motion.button>
            );
          })}

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.45 }}
            className="rounded-2xl border border-dashed border-edge2/80 bg-ink/30 p-5"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber">Workflow</div>
            <ol className="mt-3 space-y-2 text-[12px] leading-relaxed text-fog">
              <li><span className="font-mono text-cyan">01</span> · pick a discipline</li>
              <li><span className="font-mono text-cyan">02</span> · import equipment from the library</li>
              <li><span className="font-mono text-cyan">03</span> · place, wire and annotate on the sheet</li>
              <li><span className="font-mono text-cyan">04</span> · select a part — inspector docks left or right</li>
              <li><span className="font-mono text-cyan">05</span> · read its live equations and solved outputs</li>
            </ol>
            <div className="mt-4 font-mono text-[10px] text-fog/60">{EQUIPMENT.length} components across {DISCIPLINES.length} disciplines</div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ================================================================== */
  /* WORKBENCH                                                          */
  /* ================================================================== */
  const d = discById(disc);

  const inspector = (
    <div className="space-y-3">
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4" style={{ color: d.accent }} />
            <Label className="text-ghost">Inspector</Label>
          </div>
          <button
            onClick={() => setDock(dock === "right" ? "left" : "right")}
            title={`Dock ${dock === "right" ? "left" : "right"}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge bg-ink/70 text-fog transition-colors hover:border-cyan/40 hover:text-cyan"
          >
            {dock === "right" ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {!selDef || !selItem ? (
          <div className="p-4">
            <p className="font-mono text-[10.5px] leading-relaxed text-fog">
              Select a component on the sheet to inspect its physical quantities and governing equations.
            </p>
            <div className="mt-3 space-y-1.5 rounded-xl border border-edge/70 bg-ink/40 p-3">
              <Row k="components" v={String(items.length)} />
              <Row k="connections" v={String(links.length)} />
              <Row k="annotations" v={String(ink.length)} />
              <Row k="library" v={`${equipByDisc(disc).length} parts`} />
            </div>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-230px)] overflow-y-auto p-4">
            {/* header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-[15px] font-semibold text-paper">{selDef.name}</div>
                <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: d.accent }}>
                  {d.name} · {selDef.group}
                </div>
              </div>
              <button
                onClick={() => {
                  setItems((p) => p.filter((q) => q.uid !== selItem.uid));
                  setLinks((p) => p.filter((l) => l.a !== selItem.uid && l.b !== selItem.uid));
                  setSel(null);
                }}
                className="font-mono text-[9.5px] text-fog transition-colors hover:text-rose"
              >
                REMOVE
              </button>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-fog">{selDef.blurb}</p>

            {/* parameters */}
            <div className="mt-4">
              <Label>Physical quantities · inputs</Label>
              <div className="mt-2.5 space-y-2.5">
                {selDef.params.map((p) => (
                  <div key={p.key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-fog">
                        <span style={{ color: d.accent }}><Tex tex={p.sym} /></span>
                        {p.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-cyan-soft tnum">
                        {fmt(selItem.params[p.key], 5)} <span className="font-normal text-fog">{p.unit}</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range" min={p.min} max={p.max} step={p.step}
                        value={selItem.params[p.key]}
                        onChange={(e) => setParam(p.key, parseFloat(e.target.value))}
                        className="flex-1 accent-cyan"
                      />
                      <input
                        key={`${selItem.uid}-${p.key}-${selItem.params[p.key]}`}
                        defaultValue={fmt(selItem.params[p.key], 6)}
                        onBlur={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) setParam(p.key, n); }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-16 rounded-md border border-edge bg-ink/70 px-1.5 py-1 text-right font-mono text-[10.5px] text-paper outline-none focus:border-cyan/50 tnum"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* equations */}
            <div className="mt-5">
              <Label>Governing equations</Label>
              <div className="mt-2.5 space-y-2">
                {selDef.eqs.map((eq, i) => (
                  <div key={i} className="rounded-xl border border-edge/70 bg-ink/50 px-3 py-3">
                    <div className="overflow-x-auto"><Tex tex={eq.tex} block className="text-[13.5px]" /></div>
                    <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-fog/80">{eq.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* outputs */}
            <div className="mt-5">
              <Label>Solved output</Label>
              <div className="mt-2.5 space-y-1.5">
                {selDef.outs.map((o) => {
                  const v = safe(() => o.f(selItem.params));
                  return (
                    <div
                      key={o.label}
                      className={cn(
                        "flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2",
                        o.tone === "amber" ? "border-amber/30 bg-amber/[0.05]" : o.tone === "cyan" ? "border-cyan/30 bg-cyan/[0.05]" : "border-edge/60 bg-ink/40"
                      )}
                    >
                      <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-fog">
                        <span className={o.tone === "amber" ? "text-amber" : "text-cyan"}><Tex tex={o.sym} /></span>
                        {o.label}
                      </span>
                      <span className={cn(
                        "text-right font-mono text-[12px] font-semibold tnum",
                        o.tone === "amber" ? "text-amber" : o.tone === "cyan" ? "text-cyan-soft" : "text-paper"
                      )}>
                        {pretty(v, 6)} <span className="text-[9.5px] font-normal text-fog">{o.unit}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );

  const sheet = (
    <Panel className="overflow-hidden">
      {/* sheet toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/70 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {([
            { id: "select", icon: Hand, label: "Select" },
            { id: "link", icon: Cable, label: "Link" },
            { id: "pen", icon: Pencil, label: "Draw" },
            { id: "erase", icon: Eraser, label: "Erase" },
          ] as { id: Tool; icon: typeof Hand; label: string }[]).map((tb) => {
            const Icon = tb.icon;
            return (
              <button
                key={tb.id}
                onClick={() => { setTool(tb.id); setArmed(null); setLinkFrom(null); }}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[10px] transition-all",
                  tool === tb.id ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-edge bg-ink/70 text-fog hover:text-ghost"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{tb.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {tool === "place" && armed && (
            <span className="font-mono text-[10px] text-cyan">click sheet to drop “{equipById(armed)?.name}”</span>
          )}
          {tool === "link" && (
            <span className="font-mono text-[10px] text-mint">{linkFrom === null ? "click source component" : "click target component"}</span>
          )}
          <button onClick={clearSheet} title="Clear sheet" className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-ink/70 text-fog transition-colors hover:border-rose/40 hover:text-rose">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div ref={wrapRef} className="relative h-[560px] w-full touch-none select-none sm:h-[640px]">
        <canvas
          ref={canvasRef}
          className={cn("h-full w-full", tool === "select" ? "cursor-grab active:cursor-grabbing" : tool === "erase" ? "cursor-cell" : "cursor-crosshair")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { onPointerUp(); setCursor(null); }}
        />
        {items.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <Grid3x3 className="h-8 w-8 text-fog/40" />
            <p className="max-w-[260px] font-mono text-[11px] leading-relaxed text-fog">
              Empty sheet — import equipment from the library to begin.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );

  const library = (
    <Panel className="flex max-h-[720px] flex-col overflow-hidden">
      <div className="border-b border-edge/70 px-4 py-3">
        <div className="flex items-center justify-between">
          <Label className="text-ghost">Equipment library</Label>
          <span className="font-mono text-[9.5px] text-fog">{palette.length}</span>
        </div>
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search parts…"
            spellCheck={false}
            className="w-full rounded-lg border border-edge bg-ink/70 py-1.5 pl-8 pr-2 font-mono text-[11px] text-paper outline-none focus:border-cyan/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5">
        {groups.map(([gname, list]) => (
          <div key={gname} className="mb-3 last:mb-0">
            <div className="px-1.5 pb-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-fog/80">{gname}</div>
            <div className="space-y-1">
              {list.map((e) => (
                <button
                  key={e.id}
                  onClick={() => { setArmed(e.id); setTool("place"); }}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all",
                    armed === e.id ? "border-cyan/50 bg-cyan/[0.08]" : "border-edge/60 bg-ink/40 hover:border-edge2"
                  )}
                >
                  <SymbolChip def={e} accent={d.accent} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] text-paper">{e.name}</span>
                    <span className="block truncate font-mono text-[9px] text-fog">{e.params.length} params · {e.eqs.length} eqns</span>
                  </span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-fog transition-colors group-hover:text-cyan" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  return (
    <div className="space-y-4">
      {/* header */}
      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setDisc(null); clearSheet(); }}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-edge bg-ink/70 px-2.5 font-mono text-[10px] text-fog transition-colors hover:border-cyan/40 hover:text-cyan"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> DOMAINS
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border text-base" style={{ borderColor: `${d.accent}55`, background: `${d.accent}12` }}>
            {d.glyph}
          </span>
          <div>
            <div className="font-display text-[15px] font-semibold" style={{ color: d.accent }}>{d.name}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">{d.tag} · workbench</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {DISCIPLINES.map((x) => (
            <button
              key={x.id}
              onClick={() => { setDisc(x.id); clearSheet(); setQuery(""); }}
              title={x.name}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-all",
                x.id === disc ? "border-cyan/50 bg-cyan/10" : "border-edge bg-ink/60 opacity-60 hover:opacity-100"
              )}
            >
              {x.glyph}
            </button>
          ))}
        </div>
      </Panel>

      {/* layout: dock switches side */}
      <div className={cn("grid gap-4", dock === "right" ? "xl:grid-cols-[210px_1fr_330px]" : "xl:grid-cols-[330px_1fr_210px]")}>
        {dock === "left" ? (
          <>
            <div className="order-2 xl:order-1">{inspector}</div>
            <div className="order-1 xl:order-2">{sheet}</div>
            <div className="order-3">{library}</div>
          </>
        ) : (
          <>
            <div className="order-3 xl:order-1">{library}</div>
            <div className="order-1 xl:order-2">{sheet}</div>
            <div className="order-2 xl:order-3">{inspector}</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function SymbolChip({ def, accent }: { def: EquipDef; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    c.width = 34 * DPR; c.height = 28 * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, 34, 28);
    drawSymbol(ctx, def.shape, 1, 1, 32, 26, accent, 0);
  }, [def, accent]);
  return <canvas ref={ref} style={{ width: 34, height: 28 }} className="shrink-0 opacity-90" />;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog">{k}</span>
      <span className="font-mono text-[11px] font-semibold text-paper tnum">{v}</span>
    </div>
  );
}

function safe(f: () => number): number {
  try { const v = f(); return Number.isFinite(v) ? v : NaN; } catch { return NaN; }
}
