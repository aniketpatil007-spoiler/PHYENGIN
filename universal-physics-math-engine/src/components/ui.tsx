import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-edge bg-gradient-to-b from-panel2/60 to-panel/80 shadow-panel backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-fog", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-all duration-200",
        active
          ? "border-cyan/50 bg-cyan/10 text-cyan shadow-[0_0_16px_rgba(58,226,255,0.15)]"
          : "border-edge bg-panel/60 text-ghost hover:border-edge2 hover:text-paper",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
export function Select({
  value,
  onChange,
  children,
  className = "",
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={cn("relative", className)} title={title}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-ink/80 py-2 pl-3 pr-8 font-mono text-[12px] text-ghost outline-none transition-colors hover:border-edge2 hover:text-paper focus:border-cyan/50 focus:text-paper"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function CopyBtn({ text, className = "" }: { text: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard unavailable */
        }
        setOk(true);
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => setOk(false), 1400);
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-ink/70 text-fog transition-all hover:border-cyan/40 hover:text-cyan",
        ok && "border-mint/50 text-mint",
        className
      )}
      title="Copy value"
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
export function SegTabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border border-edge bg-ink/70 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 font-mono text-[11px] tracking-wide transition-all duration-200",
            value === o.id
              ? "bg-cyan/15 text-cyan shadow-[inset_0_0_12px_rgba(58,226,255,0.12)]"
              : "text-fog hover:text-ghost"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function CountUp({ to, duration = 1400, className = "" }: { to: number; duration?: number; className?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <span ref={ref} className={cn("tnum", className)}>
      {v.toLocaleString("en-US")}
    </span>
  );
}
