import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Search, TriangleAlert } from "lucide-react";
import { CALCULATORS, LAB_CATEGORIES, type CalcDef } from "../data/calculators";
import { getUnitPreset, toBase, fromBase, type UnitDef } from "../data/units";
import { fmt, parseNum, pretty } from "../lib/num";
import { Chip, CopyBtn, Label, Panel, Select } from "../components/ui";
import { Tex } from "../components/Tex";
import { cn } from "../utils/cn";

export default function PhysicsLab() {
  const [activeId, setActiveId] = useState(CALCULATORS[0].id);
  const [query, setQuery] = useState("");
  const calc = CALCULATORS.find((c) => c.id === activeId) ?? CALCULATORS[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      {/* rail */}
      <div className="space-y-3">
        <Panel className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search relations…"
              spellCheck={false}
              className="w-full rounded-lg border border-edge bg-ink/70 py-2 pl-9 pr-3 font-mono text-[12px] text-paper outline-none transition-colors focus:border-cyan/50"
            />
          </div>
        </Panel>

        <Panel className="max-h-[calc(100vh-210px)] overflow-y-auto p-2.5">
          {LAB_CATEGORIES.map((cat) => {
            const items = CALCULATORS.filter(
              (c) =>
                c.cat === cat &&
                (c.name.toLowerCase().includes(query.toLowerCase()) ||
                  c.blurb.toLowerCase().includes(query.toLowerCase()))
            );
            if (!items.length) return null;
            return (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="px-2 pb-1.5 pt-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-fog/80">
                  {cat}
                </div>
                <div className="space-y-0.5">
                  {items.map((c) => {
                    const isActive = c.id === calc.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveId(c.id)}
                        className={cn(
                          "group relative w-full rounded-lg px-2.5 py-2 text-left transition-colors",
                          isActive ? "bg-cyan/[0.08]" : "hover:bg-ink/60"
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="lab-active"
                            className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_10px_rgba(58,226,255,0.6)]"
                          />
                        )}
                        <span className={cn("block text-[12.5px] font-medium leading-tight", isActive ? "text-cyan-soft" : "text-ghost group-hover:text-paper")}>
                          {c.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-fog/70">{c.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      {/* solver */}
      <Solver key={calc.id} calc={calc} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Solver({ calc }: { calc: CalcDef }) {
  const [target, setTarget] = useState(calc.vars[0].key);
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(calc.vars.map((v) => [v.key, v.def]))
  );
  const [unitSel, setUnitSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      calc.vars.map((v) => {
        const preset = getUnitPreset(v.unitKind);
        const si = preset.find((u) => u.factor === 1 && !u.offset) ?? preset[0];
        return [v.key, si.id];
      })
    )
  );

  const unitOf = (key: string): UnitDef => {
    const preset = getUnitPreset(calc.vars.find((v) => v.key === key)!.unitKind);
    return preset.find((u) => u.id === unitSel[key]) ?? preset[0];
  };

  const { siValues, allValid } = useMemo(() => {
    const si: Record<string, number> = {};
    let ok = true;
    for (const v of calc.vars) {
      if (v.key === target) continue;
      const n = parseNum(raw[v.key] ?? "");
      if (!Number.isFinite(n)) { ok = false; continue; }
      si[v.key] = toBase(unitOf(v.key), n);
    }
    return { siValues: si, allValid: ok };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc, raw, unitSel, target]);

  let result: number | null = null;
  if (allValid) {
    try {
      const r = calc.solve[target]?.(siValues);
      if (typeof r === "number" && Number.isFinite(r)) result = r;
    } catch { result = null; }
  }
  const display = result !== null ? fromBase(unitOf(target), result) : null;
  const targetVar = calc.vars.find((v) => v.key === target)!;
  const others = calc.vars.filter((v) => v.key !== target);

  return (
    <div className="space-y-4">
      {/* header + formula */}
      <Panel className="noise overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl font-bold text-paper">{calc.name}</h2>
              <span className="rounded-md border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-violet">
                {calc.cat}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-fog">{calc.blurb}</p>
          </div>
          <span className="font-mono text-[10px] text-fog/60">REL / {String(CALCULATORS.indexOf(calc) + 1).padStart(2, "0")}</span>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center justify-center rounded-xl border border-edge/70 bg-ink/50 px-4 py-7">
            <Tex tex={calc.tex} block className="text-lg sm:text-xl" />
          </div>
        </div>

        {/* solve-for selector */}
        <div className="border-t border-dashed border-edge/70 px-6 py-4">
          <Label className="mb-2.5 flex items-center gap-2"><Crosshair className="h-3 w-3 text-cyan" /> Solve for</Label>
          <div className="flex flex-wrap gap-1.5">
            {calc.vars.map((v) => (
              <button
                key={v.key}
                onClick={() => setTarget(v.key)}
                className={cn(
                  "rounded-lg border px-3.5 py-1.5 transition-all duration-200",
                  target === v.key
                    ? "border-amber/60 bg-amber/10 text-amber shadow-[0_0_16px_rgba(255,180,84,0.15)]"
                    : "border-edge bg-panel/60 text-ghost hover:border-edge2 hover:text-paper"
                )}
                title={v.label}
              >
                <Tex tex={v.sym} />
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* inputs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {others.map((v) => {
          const preset = getUnitPreset(v.unitKind);
          const invalid = !Number.isFinite(parseNum(raw[v.key] ?? ""));
          return (
            <Panel key={v.key} className={cn("p-4 transition-colors", invalid && "border-rose/40")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 min-w-7 items-center justify-center rounded-md border border-edge2 bg-ink/70 px-1.5 text-cyan">
                    <Tex tex={v.sym} />
                  </span>
                  <span className="text-[12px] font-medium text-ghost">{v.label}</span>
                </div>
                {v.hint && <span className="font-mono text-[9.5px] text-fog/60">{v.hint}</span>}
              </div>
              <input
                value={raw[v.key]}
                onChange={(e) => setRaw((p) => ({ ...p, [v.key]: e.target.value }))}
                spellCheck={false}
                inputMode="decimal"
                className={cn(
                  "mt-3 w-full border-0 bg-transparent font-mono text-[22px] font-semibold outline-none tnum",
                  invalid ? "text-rose" : "text-cyan-soft"
                )}
              />
              <Select value={unitSel[v.key]} onChange={(id) => setUnitSel((p) => ({ ...p, [v.key]: id }))} className="mt-2">
                {preset.map((u) => (
                  <option key={u.id} value={u.id}>{u.symbol} — {u.label}</option>
                ))}
              </Select>
            </Panel>
          );
        })}
      </div>

      {/* result */}
      <Panel className={cn("relative overflow-hidden border-amber/25")}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/60 to-transparent" />
        <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Label className="text-amber/80">Solution · {targetVar.label}</Label>
              <span className="text-amber"><Tex tex={targetVar.sym} /></span>
              <span className="font-mono text-[10px] text-fog">= ?</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {result === null || display === null ? (
                <div className="flex items-center gap-2.5 font-mono text-lg text-rose">
                  <TriangleAlert className="h-5 w-5" />
                  {allValid ? "no real solution for these inputs" : "awaiting valid inputs"}
                </div>
              ) : (
                <>
                  <span className="break-all font-mono text-3xl font-bold text-amber tnum sm:text-4xl">
                    {pretty(display, 8)}
                  </span>
                  <span className="font-mono text-lg text-amber/70">{unitOf(target).symbol}</span>
                </>
              )}
            </div>
            {result !== null && (
              <div className="mt-2.5 font-mono text-[11px] text-fog">
                SI: <span className="text-ghost">{fmt(result, 8)} {getUnitPreset(targetVar.unitKind).find((u) => u.factor === 1 && !u.offset)?.symbol ?? ""}</span>
                <span className="mx-2 text-fog/50">·</span>
                computed from {others.map((o) => o.label.toLowerCase()).join(", ")}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
            <Select
              value={unitSel[target]}
              onChange={(id) => setUnitSel((p) => ({ ...p, [target]: id }))}
              className="w-44"
              title="Result display unit"
            >
              {getUnitPreset(targetVar.unitKind).map((u) => (
                <option key={u.id} value={u.id}>{u.symbol}</option>
              ))}
            </Select>
            <CopyBtn text={result !== null ? fmt(result, 12) : ""} className="w-full" />
          </div>
        </div>
        {calc.note && (
          <div className="border-t border-dashed border-edge/60 px-6 py-3 font-mono text-[10.5px] leading-relaxed text-fog/80">
            {calc.note}
          </div>
        )}
      </Panel>

      {/* vars legend */}
      <Panel className="p-4">
        <Label>Signal legend</Label>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {calc.vars.map((v) => (
            <Chip key={v.key} active={v.key === target} onClick={() => setTarget(v.key)}>
              <span className="flex items-center gap-1.5">
                <Tex tex={v.sym} /> <span className="text-fog/70">·</span> {v.label}
              </span>
            </Chip>
          ))}
        </div>
      </Panel>
    </div>
  );
}
