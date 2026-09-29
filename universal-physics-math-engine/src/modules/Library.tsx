import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Search } from "lucide-react";
import { CONSTANTS, CONSTANT_CATEGORIES, constantCopy, constantDisplay, type ConstantDef } from "../data/constants";
import { FORMULAS, FORMULA_CATEGORIES, type FormulaDef } from "../data/formulas";
import { Chip, CopyBtn, Panel, SegTabs } from "../components/ui";
import { Tex } from "../components/Tex";
import { cn } from "../utils/cn";

type Tab = "constants" | "formulas" | "quantities";

interface QuantityDef { q: string; sym: string; unit: string; dim: string; base?: boolean }

const QUANTITIES: QuantityDef[] = [
  { q: "Length", sym: "l, x, r", unit: "metre (m)", dim: "L", base: true },
  { q: "Mass", sym: "m", unit: "kilogram (kg)", dim: "M", base: true },
  { q: "Time", sym: "t", unit: "second (s)", dim: "T", base: true },
  { q: "Electric current", sym: "I", unit: "ampere (A)", dim: "I", base: true },
  { q: "Thermodynamic temperature", sym: "T", unit: "kelvin (K)", dim: "Θ", base: true },
  { q: "Amount of substance", sym: "n", unit: "mole (mol)", dim: "N", base: true },
  { q: "Luminous intensity", sym: "I_v", unit: "candela (cd)", dim: "J", base: true },
  { q: "Area", sym: "A", unit: "m²", dim: "L²" },
  { q: "Volume", sym: "V", unit: "m³", dim: "L³" },
  { q: "Density", sym: "ρ", unit: "kg·m⁻³", dim: "M L⁻³" },
  { q: "Velocity", sym: "v", unit: "m·s⁻¹", dim: "L T⁻¹" },
  { q: "Acceleration", sym: "a", unit: "m·s⁻²", dim: "L T⁻²" },
  { q: "Momentum", sym: "p", unit: "kg·m·s⁻¹", dim: "M L T⁻¹" },
  { q: "Force", sym: "F", unit: "newton (N)", dim: "M L T⁻²" },
  { q: "Torque", sym: "τ", unit: "newton-metre (N·m)", dim: "M L² T⁻²" },
  { q: "Energy / work", sym: "E, W", unit: "joule (J)", dim: "M L² T⁻²" },
  { q: "Power", sym: "P", unit: "watt (W)", dim: "M L² T⁻³" },
  { q: "Pressure", sym: "P", unit: "pascal (Pa)", dim: "M L⁻¹ T⁻²" },
  { q: "Frequency", sym: "f", unit: "hertz (Hz)", dim: "T⁻¹" },
  { q: "Angular velocity", sym: "ω", unit: "rad·s⁻¹", dim: "T⁻¹" },
  { q: "Electric charge", sym: "Q", unit: "coulomb (C)", dim: "T I" },
  { q: "Voltage / EMF", sym: "V", unit: "volt (V)", dim: "M L² T⁻³ I⁻¹" },
  { q: "Resistance", sym: "R", unit: "ohm (Ω)", dim: "M L² T⁻³ I⁻²" },
  { q: "Capacitance", sym: "C", unit: "farad (F)", dim: "M⁻¹ L⁻² T⁴ I²" },
  { q: "Magnetic flux density", sym: "B", unit: "tesla (T)", dim: "M T⁻² I⁻¹" },
  { q: "Inductance", sym: "L", unit: "henry (H)", dim: "M L² T⁻² I⁻²" },
  { q: "Specific heat capacity", sym: "c", unit: "J·kg⁻¹·K⁻¹", dim: "L² T⁻² Θ⁻¹" },
  { q: "Spring constant", sym: "k", unit: "N·m⁻¹", dim: "M T⁻²" },
];

export default function Library() {
  const [tab, setTab] = useState<Tab>("constants");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const cats = tab === "constants" ? CONSTANT_CATEGORIES : FORMULA_CATEGORIES;

  const consts = useMemo(() => {
    const q = query.toLowerCase();
    return CONSTANTS.filter(
      (c) =>
        (!cat || c.cat === cat) &&
        (c.name.toLowerCase().includes(q) || constantDisplay(c).replace(/\s/g, "").includes(q.replace(/\s/g, "")))
    );
  }, [query, cat]);

  const forms = useMemo(() => {
    const q = query.toLowerCase();
    return FORMULAS.filter(
      (f) =>
        (!cat || f.cat === cat) &&
        (f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
    );
  }, [query, cat]);

  const quants = useMemo(() => {
    const q = query.toLowerCase();
    return QUANTITIES.filter(
      (d) =>
        d.q.toLowerCase().includes(q) ||
        d.sym.toLowerCase().includes(q) ||
        d.unit.toLowerCase().includes(q) ||
        d.dim.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <Panel className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <SegTabs
          options={[
            { id: "constants" as Tab, label: `CONSTANTS · ${CONSTANTS.length}` },
            { id: "formulas" as Tab, label: `FORMULAS · ${FORMULAS.length}` },
            { id: "quantities" as Tab, label: `QUANTITIES · ${QUANTITIES.length}` },
          ]}
          value={tab}
          onChange={(t) => { setTab(t); setCat(null); }}
        />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "constants" ? "search constants…" : tab === "formulas" ? "search formulas…" : "search quantities or dimensions…"}
            spellCheck={false}
            className="w-full rounded-lg border border-edge bg-ink/70 py-2 pl-9 pr-3 font-mono text-[12px] text-paper outline-none transition-colors focus:border-cyan/50"
          />
        </div>
      </Panel>

      {tab !== "quantities" && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={cat === null} onClick={() => setCat(null)} className="shrink-0">All</Chip>
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c === cat ? null : c)} className="shrink-0">
              {c}
            </Chip>
          ))}
        </div>
      )}

      {tab === "constants" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {consts.map((c, i) => <ConstantCard key={c.id} c={c} i={i} />)}
        </div>
      )}
      {tab === "formulas" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {forms.map((f, i) => <FormulaCard key={f.id} f={f} i={i} />)}
        </div>
      )}
      {tab === "quantities" && (
        <Panel className="overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-edge/70 bg-ink/50 px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog sm:grid-cols-[1.2fr_0.6fr_1fr_1fr]">
            <span>Quantity</span>
            <span className="hidden sm:block">Symbol</span>
            <span>SI unit</span>
            <span className="text-right">Dimension</span>
          </div>
          {quants.map((d, i) => (
            <div
              key={d.q}
              className={cn(
                "grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-2.5 transition-colors hover:bg-cyan/[0.04] sm:grid-cols-[1.2fr_0.6fr_1fr_1fr]",
                i % 2 === 1 && "bg-ink/30"
              )}
            >
              <span className="flex items-center gap-2 text-[12.5px] text-paper">
                {d.q}
                {d.base && (
                  <span className="rounded border border-mint/40 bg-mint/10 px-1.5 py-px font-mono text-[8px] tracking-[0.14em] text-mint">BASE</span>
                )}
              </span>
              <span className="hidden font-mono text-[12px] text-cyan-soft sm:block">{d.sym}</span>
              <span className="font-mono text-[11px] text-ghost">{d.unit}</span>
              <span className="text-right font-mono text-[11.5px] font-semibold text-violet">[{d.dim}]</span>
            </div>
          ))}
          <div className="border-t border-edge/60 bg-ink/40 px-5 py-2.5 font-mono text-[9.5px] text-fog/70">
            dimensional analysis per SI base dimensions M · L · T · I · Θ · N · J
          </div>
        </Panel>
      )}

      {((tab === "constants" && !consts.length) || (tab === "formulas" && !forms.length) || (tab === "quantities" && !quants.length)) && (
        <Panel className="p-12 text-center">
          <div className="font-mono text-[12px] text-fog">no entries match the current filter</div>
        </Panel>
      )}
    </div>
  );
}

function ConstantCard({ c, i }: { c: ConstantDef; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.4 }}
    >
      <Panel className="group relative h-full overflow-hidden p-4 transition-colors hover:border-cyan/30">
        <div className="flex items-start justify-between gap-2">
          <span className="text-cyan"><Tex tex={c.sym} /></span>
          <div className="flex items-center gap-1.5">
            {c.exact && (
              <span className="inline-flex items-center gap-1 rounded-md border border-mint/40 bg-mint/10 px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.14em] text-mint">
                <BadgeCheck className="h-2.5 w-2.5" /> EXACT
              </span>
            )}
            <CopyBtn text={constantCopy(c)} className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
        <div className="mt-3 break-all font-mono text-[19px] font-semibold leading-snug text-paper tnum">
          {constantDisplay(c)}
          {c.unit !== "—" && <span className="ml-2 text-[12px] font-normal text-fog">{c.unit}</span>}
        </div>
        <div className="mt-2 text-[12px] text-ghost">{c.name}</div>
        <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog/60">{c.cat}</div>
      </Panel>
    </motion.div>
  );
}

function FormulaCard({ f, i }: { f: FormulaDef; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.4 }}
    >
      <Panel className="flex h-full flex-col overflow-hidden transition-colors hover:border-violet/30">
        <div className="flex min-h-[92px] items-center justify-center border-b border-dashed border-edge/60 bg-ink/40 px-4 py-5">
          <Tex tex={f.tex} block className={cn("text-[15px]")} />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[14px] font-semibold text-paper">{f.name}</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-fog">{f.desc}</p>
          <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-violet/70">{f.cat}</div>
        </div>
      </Panel>
    </motion.div>
  );
}
