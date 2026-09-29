/** CODATA 2018 / SI exact constants library. */
import { toSup } from "../lib/num";

export interface ConstantDef {
  id: string;
  name: string;
  sym: string; // katex
  m: string; // mantissa (grouped string)
  e?: number; // exponent base-10
  unit: string;
  cat: string;
  exact?: boolean;
}

export const CONSTANT_CATEGORIES = [
  "Universal",
  "Electromagnetic",
  "Atomic & Nuclear",
  "Physico-Chemical",
  "Mathematical",
];

export const CONSTANTS: ConstantDef[] = [
  // ---------------- Universal ----------------
  { id: "c", name: "Speed of light in vacuum", sym: "c", m: "299 792 458", unit: "m·s⁻¹", cat: "Universal", exact: true },
  { id: "G", name: "Gravitational constant", sym: "G", m: "6.674 30", e: -11, unit: "m³·kg⁻¹·s⁻²", cat: "Universal" },
  { id: "h", name: "Planck constant", sym: "h", m: "6.626 070 15", e: -34, unit: "J·s", cat: "Universal", exact: true },
  { id: "hbar", name: "Reduced Planck constant", sym: "\\hbar", m: "1.054 571 817", e: -34, unit: "J·s", cat: "Universal" },
  { id: "g0", name: "Standard gravity", sym: "g_0", m: "9.806 65", unit: "m·s⁻²", cat: "Universal", exact: true },
  { id: "lp", name: "Planck length", sym: "\\ell_{P}", m: "1.616 255", e: -35, unit: "m", cat: "Universal" },
  { id: "tp", name: "Planck time", sym: "t_{P}", m: "5.391 247", e: -44, unit: "s", cat: "Universal" },
  { id: "mp", name: "Planck mass", sym: "m_{P}", m: "2.176 434", e: -8, unit: "kg", cat: "Universal" },

  // ---------------- Electromagnetic ----------------
  { id: "e", name: "Elementary charge", sym: "e", m: "1.602 176 634", e: -19, unit: "C", cat: "Electromagnetic", exact: true },
  { id: "eps0", name: "Vacuum permittivity", sym: "\\varepsilon_0", m: "8.854 187 8128", e: -12, unit: "F·m⁻¹", cat: "Electromagnetic" },
  { id: "mu0", name: "Vacuum permeability", sym: "\\mu_0", m: "1.256 637 062 12", e: -6, unit: "N·A⁻²", cat: "Electromagnetic" },
  { id: "ke", name: "Coulomb constant", sym: "k_e", m: "8.987 551 7923", e: 9, unit: "N·m²·C⁻²", cat: "Electromagnetic" },
  { id: "z0", name: "Impedance of free space", sym: "Z_0", m: "376.730 313 668", unit: "Ω", cat: "Electromagnetic" },
  { id: "alpha", name: "Fine-structure constant", sym: "\\alpha", m: "7.297 352 5693", e: -3, unit: "—", cat: "Electromagnetic" },
  { id: "phi0", name: "Magnetic flux quantum", sym: "\\Phi_0", m: "2.067 833 848", e: -15, unit: "Wb", cat: "Electromagnetic" },
  { id: "g0q", name: "Conductance quantum", sym: "G_0", m: "7.748 091 729", e: -5, unit: "S", cat: "Electromagnetic" },
  { id: "kj", name: "Josephson constant", sym: "K_{J}", m: "4.835 978 484", e: 14, unit: "Hz·V⁻¹", cat: "Electromagnetic", exact: true },
  { id: "rk", name: "Von Klitzing constant", sym: "R_{K}", m: "25 812.807 45", unit: "Ω", cat: "Electromagnetic", exact: true },
  { id: "muB", name: "Bohr magneton", sym: "\\mu_{B}", m: "9.274 010 0783", e: -24, unit: "J·T⁻¹", cat: "Electromagnetic" },

  // ---------------- Atomic & Nuclear ----------------
  { id: "me", name: "Electron mass", sym: "m_e", m: "9.109 383 7015", e: -31, unit: "kg", cat: "Atomic & Nuclear" },
  { id: "mp2", name: "Proton mass", sym: "m_p", m: "1.672 621 923 69", e: -27, unit: "kg", cat: "Atomic & Nuclear" },
  { id: "mn", name: "Neutron mass", sym: "m_n", m: "1.674 927 498 04", e: -27, unit: "kg", cat: "Atomic & Nuclear" },
  { id: "u", name: "Atomic mass constant", sym: "m_u", m: "1.660 539 066 60", e: -27, unit: "kg", cat: "Atomic & Nuclear" },
  { id: "a0", name: "Bohr radius", sym: "a_0", m: "5.291 772 109 03", e: -11, unit: "m", cat: "Atomic & Nuclear" },
  { id: "rinf", name: "Rydberg constant", sym: "R_{\\infty}", m: "1.097 373 156 8160", e: 7, unit: "m⁻¹", cat: "Atomic & Nuclear" },
  { id: "eh", name: "Hartree energy", sym: "E_{h}", m: "4.359 744 722 2071", e: -18, unit: "J", cat: "Atomic & Nuclear" },
  { id: "re", name: "Classical electron radius", sym: "r_e", m: "2.817 940 3262", e: -15, unit: "m", cat: "Atomic & Nuclear" },
  { id: "dcs", name: "Caesium hyperfine frequency", sym: "\\Delta\\nu_{Cs}", m: "9 192 631 770", unit: "Hz", cat: "Atomic & Nuclear", exact: true },

  // ---------------- Physico-Chemical ----------------
  { id: "NA", name: "Avogadro constant", sym: "N_{A}", m: "6.022 140 76", e: 23, unit: "mol⁻¹", cat: "Physico-Chemical", exact: true },
  { id: "kB", name: "Boltzmann constant", sym: "k_{B}", m: "1.380 649", e: -23, unit: "J·K⁻¹", cat: "Physico-Chemical", exact: true },
  { id: "Rg", name: "Molar gas constant", sym: "R", m: "8.314 462 618", unit: "J·mol⁻¹·K⁻¹", cat: "Physico-Chemical", exact: true },
  { id: "F", name: "Faraday constant", sym: "F", m: "96 485.332 12", unit: "C·mol⁻¹", cat: "Physico-Chemical" },
  { id: "sigma", name: "Stefan–Boltzmann constant", sym: "\\sigma", m: "5.670 374 419", e: -8, unit: "W·m⁻²·K⁻⁴", cat: "Physico-Chemical" },
  { id: "wien", name: "Wien displacement constant", sym: "b", m: "2.897 771 955", e: -3, unit: "m·K", cat: "Physico-Chemical" },
  { id: "atm", name: "Standard atmosphere", sym: "\\mathrm{atm}", m: "101 325", unit: "Pa", cat: "Physico-Chemical", exact: true },
  { id: "kcd", name: "Luminous efficacy (540 THz)", sym: "K_{cd}", m: "683", unit: "lm·W⁻¹", cat: "Physico-Chemical", exact: true },

  // ---------------- Mathematical ----------------
  { id: "pi", name: "Pi", sym: "\\pi", m: "3.141 592 653 589 793", unit: "—", cat: "Mathematical", exact: true },
  { id: "euler", name: "Euler's number", sym: "e", m: "2.718 281 828 459 045", unit: "—", cat: "Mathematical", exact: true },
  { id: "phi", name: "Golden ratio", sym: "\\varphi", m: "1.618 033 988 749 895", unit: "—", cat: "Mathematical" },
  { id: "sqrt2", name: "Square root of 2", sym: "\\sqrt{2}", m: "1.414 213 562 373 095", unit: "—", cat: "Mathematical" },
  { id: "ln2", name: "Natural log of 2", sym: "\\ln 2", m: "0.693 147 180 559 945", unit: "—", cat: "Mathematical" },
  { id: "gamma", name: "Euler–Mascheroni constant", sym: "\\gamma", m: "0.577 215 664 901 533", unit: "—", cat: "Mathematical" },
  { id: "catalan", name: "Catalan's constant", sym: "G", m: "0.915 965 594 177 219", unit: "—", cat: "Mathematical" },
];

export function constantDisplay(c: ConstantDef): string {
  return c.e !== undefined ? `${c.m} × 10${toSup(c.e)}` : c.m;
}

export function constantCopy(c: ConstantDef): string {
  const m = c.m.replace(/\s/g, "");
  return c.e !== undefined ? `${m}e${c.e}` : m;
}

export function constantValue(c: ConstantDef): number {
  const m = parseFloat(c.m.replace(/\s/g, ""));
  return c.e !== undefined ? m * Math.pow(10, c.e) : m;
}
