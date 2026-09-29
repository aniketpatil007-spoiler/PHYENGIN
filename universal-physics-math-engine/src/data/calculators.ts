/** Physics & engineering solvers: any variable can be the unknown. */

export interface CalcVar {
  key: string;
  sym: string; // katex snippet
  label: string;
  unitKind: string; // category id from units.ts or key in EXTRA_PRESETS
  def: string;
  hint?: string;
}

export interface CalcDef {
  id: string;
  name: string;
  cat: string;
  tex: string;
  blurb: string;
  vars: CalcVar[];
  solve: Record<string, (v: Record<string, number>) => number>;
  note?: string;
}

const PI2 = Math.PI * 2;
const G = 6.6743e-11;
const KE = 8.9875517923e9;
const R = 8.314462618;

export const LAB_CATEGORIES = [
  "Mechanics",
  "Electricity",
  "Thermodynamics",
  "Waves",
  "Fluids",
  "Fields & Orbits",
];

export const CALCULATORS: CalcDef[] = [
  // ---------------- Mechanics ----------------
  {
    id: "newton2", name: "Newton's Second Law", cat: "Mechanics",
    tex: "F = m \\cdot a",
    blurb: "Net force from mass and acceleration.",
    vars: [
      { key: "F", sym: "F", label: "Force", unitKind: "force", def: "9.81" },
      { key: "m", sym: "m", label: "Mass", unitKind: "mass", def: "1" },
      { key: "a", sym: "a", label: "Acceleration", unitKind: "acceleration", def: "9.81" },
    ],
    solve: {
      F: (v) => v.m * v.a,
      m: (v) => v.F / v.a,
      a: (v) => v.F / v.m,
    },
  },
  {
    id: "kin-v", name: "Velocity under Constant Acceleration", cat: "Mechanics",
    tex: "v = u + at",
    blurb: "First kinematic equation of motion.",
    vars: [
      { key: "v", sym: "v", label: "Final velocity", unitKind: "speed", def: "29.4" },
      { key: "u", sym: "u", label: "Initial velocity", unitKind: "speed", def: "0" },
      { key: "a", sym: "a", label: "Acceleration", unitKind: "acceleration", def: "9.80665" },
      { key: "t", sym: "t", label: "Time", unitKind: "time", def: "3" },
    ],
    solve: {
      v: (v) => v.u + v.a * v.t,
      u: (v) => v.v - v.a * v.t,
      a: (v) => (v.v - v.u) / v.t,
      t: (v) => (v.v - v.u) / v.a,
    },
  },
  {
    id: "kin-s", name: "Displacement under Constant Acceleration", cat: "Mechanics",
    tex: "s = ut + \\tfrac{1}{2}at^2",
    blurb: "Distance travelled from initial velocity, acceleration and time.",
    vars: [
      { key: "s", sym: "s", label: "Displacement", unitKind: "length", def: "44.1" },
      { key: "u", sym: "u", label: "Initial velocity", unitKind: "speed", def: "0" },
      { key: "a", sym: "a", label: "Acceleration", unitKind: "acceleration", def: "9.80665" },
      { key: "t", sym: "t", label: "Time", unitKind: "time", def: "3" },
    ],
    solve: {
      s: (v) => v.u * v.t + 0.5 * v.a * v.t * v.t,
      u: (v) => (v.s - 0.5 * v.a * v.t * v.t) / v.t,
      a: (v) => (2 * (v.s - v.u * v.t)) / (v.t * v.t),
      t: (v) =>
        Math.abs(v.a) < 1e-12
          ? v.s / v.u
          : (-v.u + Math.sqrt(Math.max(0, v.u * v.u + 2 * v.a * v.s))) / v.a,
    },
    note: "Time is solved with the quadratic formula, taking the physical (positive) root.",
  },
  {
    id: "torricelli", name: "Torricelli's Equation", cat: "Mechanics",
    tex: "v^2 = u^2 + 2as",
    blurb: "Time-free kinematic relation.",
    vars: [
      { key: "v", sym: "v", label: "Final velocity", unitKind: "speed", def: "24.25" },
      { key: "u", sym: "u", label: "Initial velocity", unitKind: "speed", def: "0" },
      { key: "a", sym: "a", label: "Acceleration", unitKind: "acceleration", def: "9.80665" },
      { key: "s", sym: "s", label: "Displacement", unitKind: "length", def: "30" },
    ],
    solve: {
      v: (v) => Math.sqrt(Math.max(0, v.u * v.u + 2 * v.a * v.s)),
      u: (v) => Math.sqrt(Math.max(0, v.v * v.v - 2 * v.a * v.s)),
      a: (v) => (v.v * v.v - v.u * v.u) / (2 * v.s),
      s: (v) => (v.v * v.v - v.u * v.u) / (2 * v.a),
    },
  },
  {
    id: "kinetic", name: "Kinetic Energy", cat: "Mechanics",
    tex: "E_k = \\tfrac{1}{2}mv^2",
    blurb: "Energy of motion — grows with velocity squared.",
    vars: [
      { key: "E", sym: "E_k", label: "Kinetic energy", unitKind: "energy", def: "1568" },
      { key: "m", sym: "m", label: "Mass", unitKind: "mass", def: "70" },
      { key: "v", sym: "v", label: "Velocity", unitKind: "speed", def: "6.7" },
    ],
    solve: {
      E: (v) => 0.5 * v.m * v.v * v.v,
      m: (v) => (2 * v.E) / (v.v * v.v),
      v: (v) => Math.sqrt((2 * v.E) / v.m),
    },
  },
  {
    id: "potential", name: "Gravitational Potential Energy", cat: "Mechanics",
    tex: "E_p = mgh",
    blurb: "Stored energy of a mass raised in a gravitational field.",
    vars: [
      { key: "E", sym: "E_p", label: "Potential energy", unitKind: "energy", def: "686.5" },
      { key: "m", sym: "m", label: "Mass", unitKind: "mass", def: "10" },
      { key: "g", sym: "g", label: "Gravity", unitKind: "acceleration", def: "9.80665" },
      { key: "h", sym: "h", label: "Height", unitKind: "length", def: "7" },
    ],
    solve: {
      E: (v) => v.m * v.g * v.h,
      m: (v) => v.E / (v.g * v.h),
      g: (v) => v.E / (v.m * v.h),
      h: (v) => v.E / (v.m * v.g),
    },
  },
  {
    id: "pendulum", name: "Simple Pendulum Period", cat: "Mechanics",
    tex: "T = 2\\pi\\sqrt{\\dfrac{L}{g}}",
    blurb: "Small-angle oscillation period of a pendulum.",
    vars: [
      { key: "T", sym: "T", label: "Period", unitKind: "time", def: "2.006" },
      { key: "L", sym: "L", label: "Length", unitKind: "length", def: "1" },
      { key: "g", sym: "g", label: "Gravity", unitKind: "acceleration", def: "9.80665" },
    ],
    solve: {
      T: (v) => PI2 * Math.sqrt(v.L / v.g),
      L: (v) => v.g * Math.pow(v.T / PI2, 2),
      g: (v) => v.L * Math.pow(PI2 / v.T, 2),
    },
  },
  {
    id: "hooke", name: "Hooke's Law (Spring)", cat: "Mechanics",
    tex: "F = kx",
    blurb: "Force to stretch or compress a linear spring.",
    vars: [
      { key: "F", sym: "F", label: "Force", unitKind: "force", def: "50" },
      { key: "k", sym: "k", label: "Spring constant", unitKind: "springk", def: "200" },
      { key: "x", sym: "x", label: "Displacement", unitKind: "length", def: "0.25" },
    ],
    solve: {
      F: (v) => v.k * v.x,
      k: (v) => v.F / v.x,
      x: (v) => v.F / v.k,
    },
  },
  {
    id: "centripetal", name: "Centripetal Force", cat: "Mechanics",
    tex: "F_c = \\dfrac{mv^2}{r}",
    blurb: "Force required to keep a body on a circular path.",
    vars: [
      { key: "F", sym: "F_c", label: "Centripetal force", unitKind: "force", def: "4635" },
      { key: "m", sym: "m", label: "Mass", unitKind: "mass", def: "1200" },
      { key: "v", sym: "v", label: "Velocity", unitKind: "speed", def: "13.9" },
      { key: "r", sym: "r", label: "Radius", unitKind: "length", def: "50" },
    ],
    solve: {
      F: (v) => (v.m * v.v * v.v) / v.r,
      m: (v) => (v.F * v.r) / (v.v * v.v),
      v: (v) => Math.sqrt((v.F * v.r) / v.m),
      r: (v) => (v.m * v.v * v.v) / v.F,
    },
  },

  // ---------------- Electricity ----------------
  {
    id: "ohm", name: "Ohm's Law", cat: "Electricity",
    tex: "V = IR",
    blurb: "Voltage–current–resistance relationship for ohmic devices.",
    vars: [
      { key: "V", sym: "V", label: "Voltage", unitKind: "voltage", def: "12" },
      { key: "I", sym: "I", label: "Current", unitKind: "current", def: "0.002" },
      { key: "R", sym: "R", label: "Resistance", unitKind: "resistance", def: "6000" },
    ],
    solve: {
      V: (v) => v.I * v.R,
      I: (v) => v.V / v.R,
      R: (v) => v.V / v.I,
    },
  },
  {
    id: "epower", name: "Electric Power", cat: "Electricity",
    tex: "P = VI",
    blurb: "Rate of electrical energy transfer.",
    vars: [
      { key: "P", sym: "P", label: "Power", unitKind: "power", def: "60" },
      { key: "V", sym: "V", label: "Voltage", unitKind: "voltage", def: "230" },
      { key: "I", sym: "I", label: "Current", unitKind: "current", def: "0.261" },
    ],
    solve: {
      P: (v) => v.V * v.I,
      V: (v) => v.P / v.I,
      I: (v) => v.P / v.V,
    },
  },
  {
    id: "coulomb", name: "Coulomb's Law", cat: "Electricity",
    tex: "F = k_e\\,\\dfrac{q_1 q_2}{r^2}",
    blurb: "Electrostatic force between point charges.",
    vars: [
      { key: "F", sym: "F", label: "Force", unitKind: "force", def: "3.6" },
      { key: "q1", sym: "q_1", label: "Charge 1", unitKind: "charge", def: "1e-6" },
      { key: "q2", sym: "q_2", label: "Charge 2", unitKind: "charge", def: "1e-6" },
      { key: "r", sym: "r", label: "Separation", unitKind: "length", def: "0.05" },
    ],
    solve: {
      F: (v) => (KE * v.q1 * v.q2) / (v.r * v.r),
      q1: (v) => (v.F * v.r * v.r) / (KE * v.q2),
      q2: (v) => (v.F * v.r * v.r) / (KE * v.q1),
      r: (v) => Math.sqrt(Math.abs((KE * v.q1 * v.q2) / v.F)),
    },
    note: "kₑ = 8.9876 × 10⁹ N·m²·C⁻² · opposite signs attract, like signs repel.",
  },

  // ---------------- Thermodynamics ----------------
  {
    id: "idealgas", name: "Ideal Gas Law", cat: "Thermodynamics",
    tex: "PV = nRT",
    blurb: "Equation of state for an ideal gas.",
    vars: [
      { key: "P", sym: "P", label: "Pressure", unitKind: "pressure", def: "101325" },
      { key: "V", sym: "V", label: "Volume", unitKind: "volume", def: "0.0224" },
      { key: "n", sym: "n", label: "Amount", unitKind: "amount", def: "1" },
      { key: "T", sym: "T", label: "Temperature", unitKind: "temperature", def: "273.15" },
    ],
    solve: {
      P: (v) => (v.n * R * v.T) / v.V,
      V: (v) => (v.n * R * v.T) / v.P,
      n: (v) => (v.P * v.V) / (R * v.T),
      T: (v) => (v.P * v.V) / (v.n * R),
    },
    note: "R = 8.314 J·mol⁻¹·K⁻¹ · temperature is absolute (kelvin).",
  },
  {
    id: "heat", name: "Specific Heat Transfer", cat: "Thermodynamics",
    tex: "Q = mc\\,\\Delta T",
    blurb: "Heat required for a temperature change (no phase change).",
    vars: [
      { key: "Q", sym: "Q", label: "Heat", unitKind: "energy", def: "41860" },
      { key: "m", sym: "m", label: "Mass", unitKind: "mass", def: "1" },
      { key: "c", sym: "c", label: "Specific heat", unitKind: "specificheat", def: "4186", hint: "water ≈ 4186" },
      { key: "dT", sym: "\\Delta T", label: "Temp. change", unitKind: "tempdiff", def: "10" },
    ],
    solve: {
      Q: (v) => v.m * v.c * v.dT,
      m: (v) => v.Q / (v.c * v.dT),
      c: (v) => v.Q / (v.m * v.dT),
      dT: (v) => v.Q / (v.m * v.c),
    },
  },

  // ---------------- Waves ----------------
  {
    id: "wave", name: "Wave Speed", cat: "Waves",
    tex: "v = f\\lambda",
    blurb: "Universal relation for any periodic wave.",
    vars: [
      { key: "v", sym: "v", label: "Wave speed", unitKind: "speed", def: "343" },
      { key: "f", sym: "f", label: "Frequency", unitKind: "frequency", def: "440" },
      { key: "l", sym: "\\lambda", label: "Wavelength", unitKind: "length", def: "0.78" },
    ],
    solve: {
      v: (v) => v.f * v.l,
      f: (v) => v.v / v.l,
      l: (v) => v.v / v.f,
    },
    note: "Sound in air ≈ 343 m/s · light in vacuum = c.",
  },

  // ---------------- Fluids ----------------
  {
    id: "hydro", name: "Hydrostatic Pressure", cat: "Fluids",
    tex: "P = \\rho g h",
    blurb: "Gauge pressure at depth in a static fluid.",
    vars: [
      { key: "P", sym: "P", label: "Pressure", unitKind: "pressure", def: "98066.5" },
      { key: "rho", sym: "\\rho", label: "Density", unitKind: "density", def: "1000" },
      { key: "g", sym: "g", label: "Gravity", unitKind: "acceleration", def: "9.80665" },
      { key: "h", sym: "h", label: "Depth", unitKind: "length", def: "10" },
    ],
    solve: {
      P: (v) => v.rho * v.g * v.h,
      rho: (v) => v.P / (v.g * v.h),
      g: (v) => v.P / (v.rho * v.h),
      h: (v) => v.P / (v.rho * v.g),
    },
  },
  {
    id: "drag", name: "Aerodynamic Drag", cat: "Fluids",
    tex: "F_d = \\tfrac{1}{2}\\rho\\, C_d A\\, v^2",
    blurb: "Quadratic drag on a body moving through a fluid.",
    vars: [
      { key: "F", sym: "F_d", label: "Drag force", unitKind: "force", def: "440" },
      { key: "rho", sym: "\\rho", label: "Fluid density", unitKind: "density", def: "1.225", hint: "air ≈ 1.225" },
      { key: "Cd", sym: "C_d", label: "Drag coefficient", unitKind: "none", def: "0.47", hint: "sphere ≈ 0.47" },
      { key: "A", sym: "A", label: "Reference area", unitKind: "area", def: "2.2" },
      { key: "v", sym: "v", label: "Velocity", unitKind: "speed", def: "27.8" },
    ],
    solve: {
      F: (v) => 0.5 * v.rho * v.Cd * v.A * v.v * v.v,
      rho: (v) => (2 * v.F) / (v.Cd * v.A * v.v * v.v),
      Cd: (v) => (2 * v.F) / (v.rho * v.A * v.v * v.v),
      A: (v) => (2 * v.F) / (v.rho * v.Cd * v.v * v.v),
      v: (v) => Math.sqrt((2 * v.F) / (v.rho * v.Cd * v.A)),
    },
  },

  // ---------------- Fields & Orbits ----------------
  {
    id: "gravitation", name: "Universal Gravitation", cat: "Fields & Orbits",
    tex: "F = G\\,\\dfrac{m_1 m_2}{r^2}",
    blurb: "Mutual attraction between two masses.",
    vars: [
      { key: "F", sym: "F", label: "Force", unitKind: "force", def: "9.82" },
      { key: "m1", sym: "m_1", label: "Mass 1", unitKind: "mass", def: "5.972e24", hint: "Earth ≈ 5.972e24" },
      { key: "m2", sym: "m_2", label: "Mass 2", unitKind: "mass", def: "1" },
      { key: "r", sym: "r", label: "Separation", unitKind: "length", def: "6.371e6", hint: "Earth radius" },
    ],
    solve: {
      F: (v) => (G * v.m1 * v.m2) / (v.r * v.r),
      m1: (v) => (v.F * v.r * v.r) / (G * v.m2),
      m2: (v) => (v.F * v.r * v.r) / (G * v.m1),
      r: (v) => Math.sqrt((G * v.m1 * v.m2) / v.F),
    },
    note: "G = 6.6743 × 10⁻¹¹ m³·kg⁻¹·s⁻².",
  },
  {
    id: "escape", name: "Escape Velocity", cat: "Fields & Orbits",
    tex: "v_e = \\sqrt{\\dfrac{2GM}{r}}",
    blurb: "Minimum speed to leave a gravitational body for good.",
    vars: [
      { key: "v", sym: "v_e", label: "Escape velocity", unitKind: "speed", def: "11186" },
      { key: "M", sym: "M", label: "Body mass", unitKind: "mass", def: "5.972e24", hint: "Earth ≈ 5.972e24" },
      { key: "r", sym: "r", label: "Radius", unitKind: "length", def: "6.371e6" },
    ],
    solve: {
      v: (v) => Math.sqrt((2 * G * v.M) / v.r),
      M: (v) => (v.v * v.v * v.r) / (2 * G),
      r: (v) => (2 * G * v.M) / (v.v * v.v),
    },
    note: "Earth's escape velocity ≈ 11.2 km/s; the Sun's ≈ 617.5 km/s.",
  },
];
