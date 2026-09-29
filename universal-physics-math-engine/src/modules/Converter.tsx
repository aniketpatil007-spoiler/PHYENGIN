import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";
import { UNIT_CATEGORIES, categoryById, convert, unitById } from "../data/units";
import { fmt, parseNum, pretty } from "../lib/num";
import { Chip, CopyBtn, Label, Panel, Select } from "../components/ui";
import { cn } from "../utils/cn";

export default function Converter() {
  const [catId, setCatId] = useState("length");
  const cat = categoryById(catId);
  const [fromId, setFromId] = useState(unitById(cat, "m").id);
  const [toId, setToId] = useState(unitById(cat, "ft").id);
  const [raw, setRaw] = useState("1");
  const [spin, setSpin] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // sensible defaults when category changes
  useEffect(() => {
    const c = categoryById(catId);
    setFromId(c.units[0].id);
    setToId(c.units[Math.min(4, c.units.length - 1)].id);
    setRaw("1");
  }, [catId]);

  const from = unitById(cat, fromId);
  const to = unitById(cat, toId);

  const value = parseNum(raw);
  const valid = Number.isFinite(value);
  const result = valid ? convert(from, to, value) : NaN;

  const rate = useMemo(() => convert(from, to, 1), [from, to]);

  const table = useMemo(() => {
    if (!valid) return [];
    return cat.units.map((u) => ({ u, v: convert(from, u, value) }));
  }, [cat, from, value, valid]);

  const swap = () => {
    setSpin((s) => s + 180);
    const a = fromId;
    setFromId(toId);
    setToId(a);
  };

  return (
    <div className="space-y-4">
      {/* category rail */}
      <Panel className="px-4 py-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {UNIT_CATEGORIES.map((c) => (
            <Chip key={c.id} active={c.id === catId} onClick={() => setCatId(c.id)} className="shrink-0">
              {c.name}
            </Chip>
          ))}
        </div>
      </Panel>

      {/* main converter */}
      <Panel className="noise overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge/70 px-5 py-3">
          <Label>{cat.name} · base SI unit: {cat.baseSymbol}</Label>
          <span className="font-mono text-[10px] text-fog/60">{cat.units.length} units loaded</span>
        </div>

        <div className="grid items-stretch gap-4 p-5 sm:p-7 lg:grid-cols-[1fr_auto_1fr]">
          {/* FROM */}
          <div className="rounded-xl border border-edge bg-ink/50 p-4">
            <Label>Input</Label>
            <input
              ref={inputRef}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="0"
              spellCheck={false}
              className="mt-2 w-full border-0 bg-transparent font-mono text-3xl font-semibold text-cyan-soft caret-cyan outline-none tnum"
            />
            <Select value={fromId} onChange={setFromId} className="mt-3">
              {cat.units.map((u) => (
                <option key={u.id} value={u.id}>{u.symbol} — {u.label}</option>
              ))}
            </Select>
          </div>

          {/* SWAP */}
          <div className="flex items-center justify-center">
            <motion.button
              onClick={swap}
              animate={{ rotate: spin }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 text-cyan transition-shadow hover:shadow-glow"
              title="Swap units"
            >
              <ArrowLeftRight className="h-5 w-5 lg:rotate-0" />
            </motion.button>
          </div>

          {/* TO */}
          <div className="rounded-xl border border-amber/25 bg-gradient-to-b from-amber/[0.06] to-transparent p-4">
            <Label className="text-amber/80">Output</Label>
            <div className={cn("mt-2 min-h-[40px] break-all font-mono text-3xl font-semibold tnum", valid ? "text-amber" : "text-fog/40")}>
              {valid ? pretty(result, 8) : "—"}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Select value={toId} onChange={setToId} className="flex-1">
                {cat.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.symbol} — {u.label}</option>
                ))}
              </Select>
              <CopyBtn text={valid ? fmt(result, 10) : ""} />
            </div>
          </div>
        </div>

        {/* rate line */}
        <div className="border-t border-dashed border-edge/70 px-5 py-3.5 sm:px-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px]">
            <span className="text-fog">REFERENCE RATE</span>
            <span className="text-cyan-soft">1 {from.symbol}</span>
            <span className="text-fog">=</span>
            <span className="text-amber">{pretty(rate, 8)} {to.symbol}</span>
            <span className="text-fog/50">·</span>
            <span className="text-fog/70">1 {to.symbol} = {pretty(convert(to, from, 1), 8)} {from.symbol}</span>
          </div>
        </div>
      </Panel>

      {/* full conversion table */}
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge/70 px-5 py-3">
          <Label>Full spectrum — {valid ? `${raw || "0"} ${from.symbol} expressed in every unit` : "enter a value"}</Label>
          <span className="hidden font-mono text-[10px] text-fog/60 sm:block">click any card to retarget output unit</span>
        </div>
        <div className="grid grid-cols-1 gap-px bg-edge/40 sm:grid-cols-2 xl:grid-cols-3">
          {table.map(({ u, v }) => (
            <button
              key={u.id}
              onClick={() => setToId(u.id)}
              className={cn(
                "group bg-panel/80 px-5 py-3.5 text-left transition-colors hover:bg-panel2",
                u.id === toId && "bg-cyan/[0.06]"
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn("truncate font-mono text-[14px] font-semibold tnum", u.id === toId ? "text-cyan" : "text-paper")}>
                  {pretty(v, 7)}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-fog">{u.symbol}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-fog/70">{u.label}</div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
