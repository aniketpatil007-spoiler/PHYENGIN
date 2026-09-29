/** Numeric formatting helpers shared across modules. */

/** Format a number with smart significant figures. */
export function fmt(v: number, sig = 6): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? "undefined" : v > 0 ? "+∞" : "−∞";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e15 || a < 1e-10) return toExp(v, sig);
  if (a >= 1e7 || a < 1e-4) return toExp(v, sig);
  // trim to sig figs without exponent
  const p = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
  let s = v.toFixed(Math.min(p, 12));
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

/** Always-exponential formatting, e.g. 6.02214076e23 → "6.0221 × 10²³" parts. */
export function toExp(v: number, sig = 6): string {
  const e = v.toExponential(sig - 1);
  const [m, x] = e.split("e");
  const mant = m.replace(/\.?0+$/, "");
  return `${mant} × 10${toSup(parseInt(x, 10))}`;
}

const SUP: Record<string, string> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
export function toSup(n: number | string): string {
  return String(n).split("").map((c) => SUP[c] ?? c).join("");
}

/** Group thousands with thin separators: 1234567.89 → 1 234 567.89 */
export function group(s: string): string {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const dot = body.indexOf(".");
  const int = dot >= 0 ? body.slice(0, dot) : body;
  const rest = dot >= 0 ? body.slice(dot) : "";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (neg ? "-" : "") + grouped + rest;
}

/** Full pretty display: grouping + exponential decomposition. */
export function pretty(v: number, sig = 8): string {
  if (!Number.isFinite(v)) return fmt(v);
  const a = Math.abs(v);
  if (v !== 0 && (a >= 1e12 || a < 1e-6)) return fmt(v, sig);
  const s = fmt(v, sig);
  return s.includes("×") ? s : group(s);
}

/** Parse a loosely-typed numeric string ("1.2e3", "3,5"). NaN when invalid. */
export function parseNum(s: string): number {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t || t === "-" || t === ".") return NaN;
  return Number(t);
}
