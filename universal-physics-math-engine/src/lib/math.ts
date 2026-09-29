import { create, all } from "mathjs";

/** Singleton mathjs instance powering the whole studio. */
export const math = create(all);

export type AngleMode = "rad" | "deg";

let currentMode: AngleMode = "rad";

function wrapDeg() {
  const d2r = (x: number) => (x * Math.PI) / 180;
  const r2d = (x: number) => (x * 180) / Math.PI;
  math.import(
    {
      sin: (x: number) => Math.sin(d2r(x)),
      cos: (x: number) => Math.cos(d2r(x)),
      tan: (x: number) => Math.tan(d2r(x)),
      sec: (x: number) => 1 / Math.cos(d2r(x)),
      csc: (x: number) => 1 / Math.sin(d2r(x)),
      cot: (x: number) => 1 / Math.tan(d2r(x)),
      asin: (x: number) => r2d(Math.asin(x)),
      acos: (x: number) => r2d(Math.acos(x)),
      atan: (x: number) => r2d(Math.atan(x)),
      atan2: (y: number, x: number) => r2d(Math.atan2(y, x)),
    },
    { override: true }
  );
}

function wrapRad() {
  math.import(
    {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      sec: (x: number) => 1 / Math.cos(x),
      csc: (x: number) => 1 / Math.sin(x),
      cot: (x: number) => 1 / Math.tan(x),
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      atan2: Math.atan2,
    },
    { override: true }
  );
}

export function setAngleMode(mode: AngleMode) {
  currentMode = mode;
  if (mode === "deg") wrapDeg();
  else wrapRad();
}

export function getAngleMode(): AngleMode {
  return currentMode;
}

/** Persistent scope shared by the calculator so users can define variables. */
export const scope: Record<string, unknown> = {};

export function clearScope() {
  for (const k of Object.keys(scope)) delete scope[k];
}

export function evaluate(expr: string): unknown {
  const result = math.evaluate(expr, scope);
  if (typeof result === "number" && Number.isFinite(result)) {
    scope.ans = result;
  }
  return result;
}

/** Compile an f(x) expression for the plotter. Returns a numeric evaluator. */
export function compileFx(expr: string): ((x: number) => number) | null {
  const cleaned = expr
    .trim()
    .replace(/^y\s*=\s*/i, "")
    .replace(/^f\s*\(\s*x\s*\)\s*=\s*/i, "");
  if (!cleaned) return null;
  try {
    const node = math.compile(cleaned);
    try {
      node.evaluate({ x: 0.5 });
    } catch {
      /* domain errors at probe point are fine */
    }
    return (x: number) => {
      try {
        const v = node.evaluate({ x });
        if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
        if (v && typeof (v as { re?: number }).re === "number" && Math.abs((v as { im?: number }).im ?? 0) < 1e-12) {
          return (v as { re: number }).re;
        }
        return NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return null;
  }
}
