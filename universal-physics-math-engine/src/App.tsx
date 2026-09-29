import { useEffect, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MobileNav, MODULES, Sidebar, type ModuleId } from "./components/Sidebar";
import Dashboard from "./modules/Dashboard";
import Calculator from "./modules/Calculator";
import Converter from "./modules/Converter";
import Plotter from "./modules/Plotter";
import MeasureGraph from "./modules/MeasureGraph";
import Sandbox from "./modules/Sandbox";
import DynamicsSheet from "./modules/DynamicsSheet";
import Workbench from "./modules/Workbench";
import PhysicsLab from "./modules/PhysicsLab";
import Library from "./modules/Library";
import { setAngleMode } from "./lib/math";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const VIEWS: Record<ModuleId, (p: { go: (m: ModuleId) => void }) => ReactElement> = {
  dashboard: ({ go }) => <Dashboard go={go} />,
  workbench: () => <Workbench />,
  calculator: () => <Calculator />,
  converter: () => <Converter />,
  plotter: () => <Plotter />,
  measure: () => <MeasureGraph />,
  sandbox: () => <Sandbox />,
  sheet: () => <DynamicsSheet />,
  lab: () => <PhysicsLab />,
  library: () => <Library />,
};

export default function App() {
  const [module, setModule] = useState<ModuleId>("dashboard");
  const now = useClock();

  useEffect(() => { setAngleMode("rad"); }, []);
  // trig mode is local to the calculator — keep every other module in radians
  useEffect(() => { if (module !== "calculator") setAngleMode("rad"); }, [module]);

  const meta = MODULES.find((m) => m.id === module)!;
  const View = VIEWS[module];

  const utc = now.toUTCString().slice(17, 25);

  return (
    <div className="blueprint-bg min-h-screen">
      <Sidebar active={module} onSelect={setModule} />
      <MobileNav active={module} onSelect={setModule} />

      <div className="relative min-h-screen lg:pl-[248px]">
        {/* header strip (desktop) */}
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-edge/60 bg-void/80 px-7 py-3 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-fog">
            <span className="text-cyan">AXIOM</span>
            <span className="text-fog/50">/</span>
            <span className="text-ghost">{meta.name.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-5 font-mono text-[11px] text-fog">
            <span className="hidden items-center gap-1.5 xl:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(125,252,207,0.8)]" />
              SYS NOMINAL
            </span>
            <span className="tnum text-ghost">UTC {utc}</span>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={module}
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <View go={setModule} />
            </motion.div>
          </AnimatePresence>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-edge/50 pb-6 pt-4 font-mono text-[10px] text-fog/60">
            <span>AXIOM ENGINEERING STUDIO · UNIVERSAL PHYSICS &amp; MATHEMATICS ENGINE</span>
            <span>mathjs kernel · KaTeX typesetting · CODATA 2018 · SI 2019</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
