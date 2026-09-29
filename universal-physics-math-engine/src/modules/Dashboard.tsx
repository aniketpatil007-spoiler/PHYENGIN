import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { MODULES, type ModuleId } from "../components/Sidebar";
import { CountUp, Panel } from "../components/ui";
import { UNIT_CATEGORIES } from "../data/units";
import { CONSTANTS } from "../data/constants";
import { FORMULAS } from "../data/formulas";
import { CALCULATORS } from "../data/calculators";
import { EQUIPMENT } from "../data/equipment";

/* ------------------------------------------------------------------ */
/* Constellation canvas                                                */
/* ------------------------------------------------------------------ */
function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const N = 64;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      r: 0.8 + Math.random() * 1.6,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const LINK = 130;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
        if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05;
      }
      for (let i = 0; i < N; i++) {
        const a = pts[i], ax = a.x * w, ay = a.y * h;
        for (let j = i + 1; j < N; j++) {
          const b = pts[j], bx = b.x * w, by = b.y * h;
          const dx = ax - bx, dy = ay - by;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(58,226,255,${(1 - d / LINK) * 0.13})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = "rgba(58,226,255,0.55)";
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-70" />;
}

/* ------------------------------------------------------------------ */
/* Ticker                                                              */
/* ------------------------------------------------------------------ */
const TICKER = [
  "E = mc²", "PV = nRT", "∇·E = ρ/ε₀", "F = ma", "v = fλ", "e^(iπ) + 1 = 0",
  "ΔU = Q − W", "λ = h/p", "n₁sinθ₁ = n₂sinθ₂", "τ = RC", "σ = 5.67×10⁻⁸",
  "∫ xⁿ dx", "a² + b² = c²", "ψ(x,t)", "k_B = 1.380649×10⁻²³", "φ = 1.618…",
];

function Ticker() {
  const items = useMemo(() => [...TICKER, ...TICKER], []);
  return (
    <div className="relative overflow-hidden border-y border-edge/60 bg-ink/40 py-2.5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-[ticker_46s_linear_infinite] gap-10 whitespace-nowrap">
        {items.map((t, i) => (
          <span key={i} className="font-mono text-[11px] tracking-[0.14em] text-fog/70">
            {t} <span className="mx-3 text-cyan/40">·</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const totalUnits = UNIT_CATEGORIES.reduce((s, c) => s + c.units.length, 0);

const STATS = [
  { label: "Physics solvers", value: CALCULATORS.length, suffix: "" },
  { label: "Units covered", value: totalUnits, suffix: "+" },
  { label: "Formulas indexed", value: FORMULAS.length, suffix: "" },
  { label: "CODATA constants", value: CONSTANTS.length, suffix: "" },
  { label: "Live simulations", value: 4, suffix: "" },
  { label: "Equipment parts", value: EQUIPMENT.length, suffix: "" },
];

export default function Dashboard({ go }: { go: (m: ModuleId) => void }) {
  const cards = MODULES.filter((m) => m.id !== "dashboard");

  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-edge/70 bg-ink/50">
        <Constellation />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/40" />
        <div className="relative px-6 py-14 sm:px-10 sm:py-20 lg:px-14">
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-cyan"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Universal physics &amp; mathematics engine
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}
            className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-paper sm:text-5xl lg:text-6xl"
          >
            One studio.
            <br />
            <span className="bg-gradient-to-r from-cyan via-cyan-soft to-amber bg-clip-text text-transparent">
              Every equation.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-ghost"
          >
            Evaluate symbolic expressions, translate between {totalUnits}+ units, plot functions on an
            interactive canvas, solve any variable of {CALCULATORS.length} physics relations, and pull exact
            CODATA constants — all in one instrument-grade workbench.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => go("workbench")}
              className="group inline-flex items-center gap-2 rounded-xl bg-cyan px-5 py-3 font-display text-[14px] font-semibold text-void transition-all hover:shadow-glow"
            >
              Enter the workbench
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => go("library")}
              className="inline-flex items-center gap-2 rounded-xl border border-edge2 bg-panel/60 px-5 py-3 font-display text-[14px] font-semibold text-ghost backdrop-blur transition-all hover:border-cyan/40 hover:text-cyan"
            >
              Browse constants
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </div>

      <div className="mt-5"><Ticker /></div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
          >
            <Panel className="px-5 py-4">
              <div className="font-display text-3xl font-bold text-paper">
                <CountUp to={s.value} />
                <span className="text-cyan">{s.suffix}</span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-fog">{s.label}</div>
            </Panel>
          </motion.div>
        ))}
      </div>

      {/* Module cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06, duration: 0.5 }}
              onClick={() => go(m.id)}
              className="group relative overflow-hidden rounded-2xl border border-edge bg-gradient-to-b from-panel2/60 to-panel/80 p-5 text-left shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-glow"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge2 bg-ink/70 text-cyan transition-all duration-300 group-hover:border-cyan/50 group-hover:shadow-glow">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="font-mono text-[10px] text-fog/60">MOD {m.code}</span>
              </div>
              <div className="mt-4 font-display text-[17px] font-semibold text-paper">{m.name}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-fog">{m.desc}</div>
              <div className="mt-4 flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-cyan/80 opacity-0 transition-all duration-300 group-hover:opacity-100">
                INITIALIZE <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </motion.button>
          );
        })}

        {/* Hint card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-dashed border-edge2/80 bg-ink/30 p-5"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber">Pro tip</div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fog">
            The expression engine understands physical units natively — try{" "}
            <code className="rounded bg-cyan/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan">88 km/h to mph</code>{" "}
            or{" "}
            <code className="rounded bg-cyan/10 px-1.5 py-0.5 font-mono text-[11px] text-cyan">9.8 m/s^2 * 70 kg</code>.
          </p>
          <div className="mt-3 font-mono text-[10px] text-fog/60">mathjs kernel · SI-2019 base</div>
        </motion.div>
      </div>
    </div>
  );
}
