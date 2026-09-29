import { motion } from "framer-motion";
import {
  Atom,
  BookOpenText,
  DraftingCompass,
  FlaskConical,
  FunctionSquare,
  LayoutGrid,
  PencilRuler,
  Repeat2,
  Ruler,
  SquareSigma,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../utils/cn";

export type ModuleId = "dashboard" | "workbench" | "calculator" | "converter" | "plotter" | "measure" | "sandbox" | "sheet" | "lab" | "library";

export interface ModuleMeta {
  id: ModuleId;
  name: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  code: string;
}

export const MODULES: ModuleMeta[] = [
  { id: "dashboard", name: "Command Deck", short: "Deck", desc: "Overview of the studio engine", icon: LayoutGrid, code: "00" },
  { id: "workbench", name: "Engineering Workbench", short: "Bench", desc: "Domains · equipment · equations", icon: DraftingCompass, code: "01" },
  { id: "calculator", name: "Expression Engine", short: "Calc", desc: "Scientific mathematical evaluator", icon: SquareSigma, code: "02" },
  { id: "converter", name: "Unit Translator", short: "Units", desc: "22 categories · 100+ units", icon: Repeat2, code: "03" },
  { id: "plotter", name: "Function Plotter", short: "Graph", desc: "Interactive cartesian canvas", icon: FunctionSquare, code: "04" },
  { id: "measure", name: "Trace & Measure", short: "Trace", desc: "Draw curves · measure quantities", icon: Ruler, code: "05" },
  { id: "sandbox", name: "Simulation Sandbox", short: "Sim", desc: "Live physics experiments", icon: FlaskConical, code: "06" },
  { id: "sheet", name: "Dynamics Sheet", short: "Draw", desc: "Draw bodies · play with matter", icon: PencilRuler, code: "07" },
  { id: "lab", name: "Physics Lab", short: "Lab", desc: "Solve any variable, 19 relations", icon: Atom, code: "08" },
  { id: "library", name: "Reference Library", short: "Refs", desc: "Constants & formula index", icon: BookOpenText, code: "09" },
];

function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" className="fill-ink stroke-edge2" />
      <path d="M9 23 16 9l7 14" stroke="#3ae2ff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.4 18h7.2" stroke="#ffb454" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="16" cy="9" r="1.6" fill="#3ae2ff" />
    </svg>
  );
}

/* ------------------------------- Desktop ------------------------------ */
export function Sidebar({ active, onSelect }: { active: ModuleId; onSelect: (m: ModuleId) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-edge/70 bg-ink/70 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <BrandMark />
        <div className="leading-tight">
          <div className="font-display text-[17px] font-bold tracking-[0.08em] text-paper">AXIOM</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-fog">Engineering Studio</div>
        </div>
      </div>

      <div className="hairline mx-5 mb-4 opacity-60" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200",
                isActive ? "text-paper" : "text-fog hover:text-ghost"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl border border-cyan/25 bg-cyan/[0.07] shadow-[0_0_24px_rgba(58,226,255,0.08),inset_0_0_18px_rgba(58,226,255,0.05)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                  isActive ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-edge bg-panel/60 text-fog group-hover:text-ghost"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{m.name}</span>
                <span className="block truncate font-mono text-[10px] text-fog/80">{m.desc}</span>
              </span>
              <span className={cn("relative font-mono text-[10px]", isActive ? "text-cyan/70" : "text-fog/50")}>
                {m.code}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 pb-5 pt-4">
        <div className="hairline mb-4 opacity-60" />
        <div className="flex items-center gap-2 font-mono text-[10px] text-fog">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          ENGINE v2.4 · CODATA 2018
        </div>
        <div className="mt-1.5 font-mono text-[10px] text-fog/60">SI 2019 redefinition · exact where marked</div>
      </div>
    </aside>
  );
}

/* ------------------------------- Mobile ------------------------------- */
export function MobileNav({ active, onSelect }: { active: ModuleId; onSelect: (m: ModuleId) => void }) {
  return (
    <div className="sticky top-0 z-40 border-b border-edge/70 bg-void/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <BrandMark size={28} />
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-[0.08em] text-paper">AXIOM</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-fog">Engineering Studio</div>
        </div>
      </div>
      <nav className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-4 pb-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-colors",
                isActive
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-edge bg-panel/50 text-fog"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.short}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
