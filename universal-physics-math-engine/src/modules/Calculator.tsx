import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Delete, Equal, History, Radiation, Trash2 } from "lucide-react";
import { clearScope, evaluate, getAngleMode, math, scope, setAngleMode, type AngleMode } from "../lib/math";
import { Panel, SegTabs, Label } from "../components/ui";
import { cn } from "../utils/cn";

interface HistoryItem { id: number; expr: string; result: string; }

const EXAMPLES = [
  "sqrt(3^2 + 4^2)",
  "88 km/h to mph",
  "9.8 m/s^2 * 70 kg",
  "derivative('x^3 + 2x', 'x')",
  "det([[1,2],[3,4]])",
  "gcd(48, 180)",
];

function tryPreview(expr: string): string | null {
  if (!expr.trim()) return null;
  try {
    const r = mathPreview(expr);
    return r;
  } catch {
    return null;
  }
}

// Preview evaluates against a scratch clone of the scope so `ans` and
// user variables are never polluted by partial input.
function mathPreview(expr: string): string {
  if (/^\s*[A-Za-z]\w*\s*=[^=]/.test(expr)) return "assignment — press Enter";
  const r = math.evaluate(expr, { ...scope });
  return formatResult(r);
}

export function formatResult(r: unknown): string {
  if (r === undefined || r === null) return "undefined";
  if (typeof r === "number") {
    if (!Number.isFinite(r)) return Number.isNaN(r) ? "NaN" : String(r);
    const abs = Math.abs(r);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return r.toExponential(8).replace(/\.?0+e/, "e");
    return parseFloat(r.toPrecision(12)).toString();
  }
  if (typeof r === "string") return r;
  if (typeof (r as { toString?: unknown })?.toString === "function") {
    try { return (r as { toString: () => string }).toString(); } catch { return String(r); }
  }
  return String(r);
}

export default function Calculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AngleMode>(() => getAngleMode());
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("axiom-history") ?? "[]"); } catch { return []; }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);

  // re-assert the calculator's trig mode whenever this module mounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAngleMode(mode); }, []);

  useEffect(() => {
    localStorage.setItem("axiom-history", JSON.stringify(history.slice(0, 60)));
  }, [history]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const preview = useMemo(() => {
    if (!expr.trim()) return null;
    try { return tryPreview(expr); } catch { return "· error ·"; }
  }, [expr]);

  const run = useCallback((src?: string) => {
    const text = (src ?? expr).trim();
    if (!text) return;
    try {
      const r = evaluate(text);
      const out = formatResult(r);
      setResult(out);
      setError(null);
      setHistory((h) => [{ id: idRef.current++, expr: text, result: out }, ...h].slice(0, 60));
      if (src) setExpr(src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid expression");
      setResult(null);
    }
  }, [expr]);

  const insert = useCallback((token: string) => {
    const el = inputRef.current;
    if (!el) { setExpr((p) => p + token); return; }
    const { selectionStart: s, selectionEnd: e } = el;
    setExpr((prev) => prev.slice(0, s ?? prev.length) + token + prev.slice(e ?? prev.length));
    requestAnimationFrame(() => {
      el.focus();
      const pos = (s ?? 0) + token.length - (token.endsWith(")") ? 1 : 0);
      el.setSelectionRange(pos, pos);
    });
  }, []);

  const backspace = () => {
    const el = inputRef.current;
    if (el && el.selectionStart !== null && el.selectionStart !== el.value.length) {
      const s = el.selectionStart, e = el.selectionEnd ?? s;
      if (s === e && s > 0) {
        setExpr((prev) => prev.slice(0, s - 1) + prev.slice(s));
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s - 1, s - 1); });
        return;
      }
    }
    setExpr((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const switchMode = (m: AngleMode) => { setMode(m); setAngleMode(m); };

  const FN_KEYS = ["sin(", "cos(", "tan(", "ln(", "log(", "sqrt(", "abs(", "pi", "e", "^"];
  const PAD: { t: string; v?: string; span?: number; accent?: boolean; action?: () => void }[] = [
    { t: "(", v: "(" }, { t: ")", v: ")" }, { t: "%", v: "%" }, { t: "CE", action: () => { setExpr(""); setError(null); setResult(null); inputRef.current?.focus(); } }, { t: "⌫", action: backspace },
    { t: "7", v: "7" }, { t: "8", v: "8" }, { t: "9", v: "9" }, { t: "÷", v: "/" }, { t: "x²", v: "^2" },
    { t: "4", v: "4" }, { t: "5", v: "5" }, { t: "6", v: "6" }, { t: "×", v: "*" }, { t: "x!", v: "!" },
    { t: "1", v: "1" }, { t: "2", v: "2" }, { t: "3", v: "3" }, { t: "−", v: "-" }, { t: "ans", v: "ans" },
    { t: "0", v: "0" }, { t: ".", v: "." }, { t: "EE", v: "e" }, { t: "+", v: "+" }, { t: "=", accent: true, action: () => run() },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      {/* Main console */}
      <Panel className="noise overflow-hidden">
        {/* status strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3">
          <div className="flex items-center gap-3">
            <Label>Console · mathjs kernel</Label>
            <span className="hidden h-1 w-1 rounded-full bg-fog/50 sm:block" />
            <span className="hidden font-mono text-[10px] text-fog/70 sm:block">units · matrices · algebra</span>
          </div>
          <div className="flex items-center gap-2">
            <SegTabs
              options={[{ id: "rad" as AngleMode, label: "RAD" }, { id: "deg" as AngleMode, label: "DEG" }]}
              value={mode}
              onChange={switchMode}
            />
            <button
              onClick={() => { clearScope(); }}
              title="Clear variables (scope)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-ink/70 px-2.5 py-1.5 font-mono text-[10px] text-fog transition-colors hover:border-rose/40 hover:text-rose"
            >
              <Radiation className="h-3 w-3" /> PURGE
            </button>
          </div>
        </div>

        {/* display */}
        <div className="relative px-5 pb-5 pt-6 sm:px-7">
          <input
            ref={inputRef}
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="type an expression — e.g. 2.4e6 * cos(pi/5)"
            spellCheck={false}
            autoComplete="off"
            className="w-full border-0 bg-transparent font-mono text-xl text-cyan-soft caret-cyan outline-none sm:text-2xl"
          />
          <div className="mt-4 flex min-h-[56px] items-end justify-between gap-4 border-t border-dashed border-edge/70 pt-4">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fog">
                {error ? "fault" : result !== null ? "result" : preview ? "live preview" : "awaiting input"}
              </div>
              <motion.div
                key={(error ?? result ?? preview ?? "idle") + ""}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                className={cn(
                  "mt-1 break-all font-mono text-2xl font-semibold sm:text-[28px]",
                  error ? "text-rose" : result !== null ? "text-amber" : "text-ghost/70"
                )}
              >
                {error ? `⚠ ${error}` : result ?? preview ?? "0"}
              </motion.div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => run()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan px-4 font-display text-sm font-semibold text-void transition-all hover:shadow-glow"
              >
                <Equal className="h-4 w-4" /> Solve
              </button>
            </div>
          </div>

          {/* examples */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setExpr(ex); inputRef.current?.focus(); }}
                className="rounded-md border border-edge/80 bg-ink/50 px-2 py-1 font-mono text-[10.5px] text-fog transition-colors hover:border-cyan/40 hover:text-cyan"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* keypad */}
        <div className="border-t border-edge/70 bg-ink/40 p-4 sm:p-5">
          <div className="mb-2 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {FN_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => insert(k)}
                className="rounded-lg border border-edge/70 bg-panel/50 py-1.5 font-mono text-[11px] text-violet transition-colors hover:border-violet/40 hover:bg-violet/10"
              >
                {k.replace("(", "")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {PAD.map((k, i) => (
              <button
                key={i}
                onClick={() => (k.action ? k.action() : insert(k.v!))}
                className={cn(
                  "h-11 rounded-lg border font-mono text-[15px] transition-all active:scale-[0.97]",
                  k.accent
                    ? "border-amber/60 bg-amber/15 text-amber hover:bg-amber/25 hover:shadow-[0_0_18px_rgba(255,180,84,0.2)]"
                    : "border-edge/70 bg-panel/60 text-ghost hover:border-cyan/40 hover:text-cyan-soft",
                  ["÷", "×", "−", "+"].includes(k.t) && "text-cyan"
                )}
              >
                {k.t === "⌫" ? <Delete className="mx-auto h-4 w-4" /> : k.t}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* History tape */}
      <Panel className="flex max-h-[760px] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan" />
            <Label className="text-ghost">Tape · session</Label>
          </div>
          <button
            onClick={() => setHistory([])}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] text-fog transition-colors hover:text-rose"
          >
            <Trash2 className="h-3 w-3" /> CLEAR
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {history.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-edge2 text-fog/60">
                <History className="h-5 w-5" />
              </div>
              <p className="max-w-[200px] font-mono text-[11px] leading-relaxed text-fog">
                Evaluations are taped here. Click any entry to reload it.
              </p>
            </div>
          )}
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => { setExpr(h.expr); inputRef.current?.focus(); }}
              className="group w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-edge hover:bg-ink/60"
            >
              <div className="truncate font-mono text-[12px] text-fog group-hover:text-ghost">{h.expr}</div>
              <div className="mt-0.5 truncate font-mono text-[13px] font-semibold text-amber">
                <span className="mr-1.5 text-fog/60">=</span>{h.result}
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
