/* ==================================================================== */
/* Discipline-based engineering equipment library                       */
/* Each item carries live parameters, governing equations (KaTeX) and   */
/* derived outputs computed from the parameters.                        */
/* ==================================================================== */

export type DiscId = "thermo" | "aero" | "electronics" | "mechanical" | "vlsi";

export interface Disc {
  id: DiscId;
  name: string;
  tag: string;
  blurb: string;
  accent: string;
  glyph: string;
}

export const DISCIPLINES: Disc[] = [
  { id: "thermo", name: "Thermodynamics", tag: "Energy systems", blurb: "Rankine & Brayton plant components — boilers, turbines, pumps, heat exchangers and cycle analysis.", accent: "#ff7d9c", glyph: "🔥" },
  { id: "aero", name: "Aerospace", tag: "Flight & propulsion", blurb: "Lift and drag surfaces, jet and rocket propulsion, propellers, tankage and re-entry heating.", accent: "#3ae2ff", glyph: "🚀" },
  { id: "electronics", name: "Electronics", tag: "Circuits & signals", blurb: "Passives, semiconductors, amplifiers and filters with full small-signal relations.", accent: "#ffb454", glyph: "⚡" },
  { id: "mechanical", name: "Mechanical", tag: "Machines & structures", blurb: "Springs, dampers, gears, pulleys, beams and shafts — statics, dynamics and deflection.", accent: "#7dfccf", glyph: "⚙️" },
  { id: "vlsi", name: "VLSI", tag: "Chip design", blurb: "MOS devices, logic gates, interconnect delay, memory cells and power/scaling analysis.", accent: "#b78cff", glyph: "🧠" },
];

export interface Param {
  key: string; label: string; sym: string; unit: string;
  def: number; min: number; max: number; step: number;
  log?: boolean;
}

export interface Output {
  label: string; sym: string; unit: string;
  f: (p: Record<string, number>) => number;
  tone?: "cyan" | "amber";
}

export type ShapeId =
  | "boiler" | "turbine" | "pump" | "condenser" | "hx" | "compressor" | "nozzle" | "valve" | "carnot"
  | "wing" | "jet" | "rocket" | "prop" | "tank" | "shield"
  | "resistor" | "capacitor" | "inductor" | "diode" | "bjt" | "mosfet" | "opamp" | "battery"
  | "spring" | "damper" | "mass" | "gear" | "pulley" | "beam" | "shaft"
  | "nmos" | "pmos" | "inverter" | "nand" | "dff" | "wire" | "sram";

export interface EquipDef {
  id: string;
  disc: DiscId;
  name: string;
  group: string;
  shape: ShapeId;
  blurb: string;
  params: Param[];
  eqs: { tex: string; note: string }[];
  outs: Output[];
  w?: number; h?: number;
}

const P = (key: string, label: string, sym: string, unit: string, def: number, min: number, max: number, step: number): Param =>
  ({ key, label, sym, unit, def, min, max, step });

/* ==================================================================== */
/* THERMODYNAMICS                                                       */
/* ==================================================================== */

const THERMO: EquipDef[] = [
  {
    id: "boiler", disc: "thermo", name: "Boiler / Steam Generator", group: "Heat addition", shape: "boiler",
    blurb: "Adds heat at constant pressure to raise working-fluid enthalpy.",
    params: [
      P("mdot", "Mass flow", "\\dot{m}", "kg/s", 12, 0.1, 200, 0.1),
      P("h1", "Inlet enthalpy", "h_1", "kJ/kg", 192, 0, 4000, 1),
      P("h2", "Outlet enthalpy", "h_2", "kJ/kg", 3350, 0, 4000, 1),
      P("eta", "Combustion efficiency", "\\eta_b", "—", 0.88, 0.3, 1, 0.01),
    ],
    eqs: [
      { tex: "\\dot{Q}_{in} = \\dot{m}\\,(h_2 - h_1)", note: "Steady-flow energy balance at constant pressure." },
      { tex: "\\dot{Q}_{fuel} = \\dfrac{\\dot{Q}_{in}}{\\eta_b}", note: "Fuel heat release required for the duty." },
    ],
    outs: [
      { label: "Heat duty", sym: "\\dot{Q}_{in}", unit: "kW", f: (p) => p.mdot * (p.h2 - p.h1), tone: "cyan" },
      { label: "Fuel input", sym: "\\dot{Q}_{fuel}", unit: "kW", f: (p) => (p.mdot * (p.h2 - p.h1)) / p.eta },
      { label: "Enthalpy rise", sym: "\\Delta h", unit: "kJ/kg", f: (p) => p.h2 - p.h1 },
    ],
  },
  {
    id: "turbine", disc: "thermo", name: "Steam Turbine", group: "Work extraction", shape: "turbine",
    blurb: "Expands high-enthalpy fluid to produce shaft work.",
    params: [
      P("mdot", "Mass flow", "\\dot{m}", "kg/s", 12, 0.1, 200, 0.1),
      P("h1", "Inlet enthalpy", "h_1", "kJ/kg", 3350, 0, 4000, 1),
      P("h2s", "Isentropic exit", "h_{2s}", "kJ/kg", 2100, 0, 4000, 1),
      P("eta", "Isentropic efficiency", "\\eta_t", "—", 0.87, 0.3, 1, 0.01),
    ],
    eqs: [
      { tex: "\\dot{W}_t = \\dot{m}\\,\\eta_t\\,(h_1 - h_{2s})", note: "Actual work with isentropic efficiency applied." },
      { tex: "h_2 = h_1 - \\eta_t (h_1 - h_{2s})", note: "Real exit enthalpy after irreversibility." },
    ],
    outs: [
      { label: "Shaft power", sym: "\\dot{W}_t", unit: "kW", f: (p) => p.mdot * p.eta * (p.h1 - p.h2s), tone: "cyan" },
      { label: "Actual exit enthalpy", sym: "h_2", unit: "kJ/kg", f: (p) => p.h1 - p.eta * (p.h1 - p.h2s) },
      { label: "Lost work", sym: "\\dot{W}_{loss}", unit: "kW", f: (p) => p.mdot * (1 - p.eta) * (p.h1 - p.h2s), tone: "amber" },
    ],
  },
  {
    id: "condenser", disc: "thermo", name: "Condenser", group: "Heat rejection", shape: "condenser",
    blurb: "Rejects latent heat to the cold sink, closing the cycle.",
    params: [
      P("mdot", "Mass flow", "\\dot{m}", "kg/s", 12, 0.1, 200, 0.1),
      P("h1", "Inlet enthalpy", "h_1", "kJ/kg", 2250, 0, 4000, 1),
      P("h2", "Outlet enthalpy", "h_2", "kJ/kg", 192, 0, 4000, 1),
      P("cw", "Coolant Δ T", "\\Delta T_w", "K", 10, 1, 40, 0.5),
    ],
    eqs: [
      { tex: "\\dot{Q}_{out} = \\dot{m}\\,(h_1 - h_2)", note: "Heat rejected to the condenser cooling water." },
      { tex: "\\dot{m}_w = \\dfrac{\\dot{Q}_{out}}{c_{p,w}\\,\\Delta T_w}", note: "Cooling water demand, c_p,w = 4.186 kJ/kg·K." },
    ],
    outs: [
      { label: "Heat rejected", sym: "\\dot{Q}_{out}", unit: "kW", f: (p) => p.mdot * (p.h1 - p.h2), tone: "cyan" },
      { label: "Coolant flow", sym: "\\dot{m}_w", unit: "kg/s", f: (p) => (p.mdot * (p.h1 - p.h2)) / (4.186 * p.cw) },
    ],
  },
  {
    id: "pump", disc: "thermo", name: "Feed Pump", group: "Work input", shape: "pump",
    blurb: "Raises liquid pressure with minimal volume change.",
    params: [
      P("mdot", "Mass flow", "\\dot{m}", "kg/s", 12, 0.1, 200, 0.1),
      P("v", "Specific volume", "v", "m³/kg", 0.001, 0.0005, 0.01, 0.0001),
      P("dP", "Pressure rise", "\\Delta P", "kPa", 8000, 10, 30000, 10),
      P("eta", "Pump efficiency", "\\eta_p", "—", 0.8, 0.3, 1, 0.01),
    ],
    eqs: [
      { tex: "\\dot{W}_p = \\dfrac{\\dot{m}\\,v\\,\\Delta P}{\\eta_p}", note: "Incompressible pump work — liquid volume treated as constant." },
    ],
    outs: [
      { label: "Pump power", sym: "\\dot{W}_p", unit: "kW", f: (p) => (p.mdot * p.v * p.dP) / p.eta, tone: "cyan" },
      { label: "Ideal work", sym: "w_{s}", unit: "kJ/kg", f: (p) => p.v * p.dP },
    ],
  },
  {
    id: "hx", disc: "thermo", name: "Heat Exchanger", group: "Heat transfer", shape: "hx",
    blurb: "Counter-flow transfer sized by the log-mean temperature difference.",
    params: [
      P("U", "Overall coefficient", "U", "W/m²K", 850, 10, 5000, 10),
      P("A", "Surface area", "A", "m²", 24, 0.1, 500, 0.1),
      P("dT1", "Δ T hot end", "\\Delta T_1", "K", 60, 1, 400, 1),
      P("dT2", "Δ T cold end", "\\Delta T_2", "K", 20, 1, 400, 1),
    ],
    eqs: [
      { tex: "\\Delta T_{lm} = \\dfrac{\\Delta T_1 - \\Delta T_2}{\\ln(\\Delta T_1/\\Delta T_2)}", note: "Log-mean temperature difference for counter-flow." },
      { tex: "\\dot{Q} = U A\\,\\Delta T_{lm}", note: "Rate equation for the exchanger." },
    ],
    outs: [
      { label: "LMTD", sym: "\\Delta T_{lm}", unit: "K", f: (p) => (Math.abs(p.dT1 - p.dT2) < 1e-6 ? p.dT1 : (p.dT1 - p.dT2) / Math.log(p.dT1 / p.dT2)) },
      { label: "Heat transferred", sym: "\\dot{Q}", unit: "W", f: (p) => p.U * p.A * (Math.abs(p.dT1 - p.dT2) < 1e-6 ? p.dT1 : (p.dT1 - p.dT2) / Math.log(p.dT1 / p.dT2)), tone: "cyan" },
    ],
  },
  {
    id: "compressor", disc: "thermo", name: "Gas Compressor", group: "Work input", shape: "compressor",
    blurb: "Isentropic compression of an ideal gas through a pressure ratio.",
    params: [
      P("mdot", "Mass flow", "\\dot{m}", "kg/s", 3, 0.1, 100, 0.1),
      P("T1", "Inlet temperature", "T_1", "K", 288, 100, 900, 1),
      P("rp", "Pressure ratio", "r_p", "—", 10, 1.1, 50, 0.1),
      P("gam", "Heat capacity ratio", "\\gamma", "—", 1.4, 1.1, 1.7, 0.01),
      P("cp", "Specific heat", "c_p", "kJ/kg·K", 1.005, 0.5, 5.5, 0.005),
    ],
    eqs: [
      { tex: "T_2 = T_1\\, r_p^{\\frac{\\gamma-1}{\\gamma}}", note: "Isentropic temperature rise across the compressor." },
      { tex: "\\dot{W}_c = \\dot{m}\\,c_p\\,(T_2 - T_1)", note: "Compression power requirement." },
    ],
    outs: [
      { label: "Exit temperature", sym: "T_2", unit: "K", f: (p) => p.T1 * Math.pow(p.rp, (p.gam - 1) / p.gam), tone: "amber" },
      { label: "Compressor power", sym: "\\dot{W}_c", unit: "kW", f: (p) => p.mdot * p.cp * (p.T1 * Math.pow(p.rp, (p.gam - 1) / p.gam) - p.T1), tone: "cyan" },
    ],
  },
  {
    id: "nozzle", disc: "thermo", name: "Nozzle", group: "Flow device", shape: "nozzle",
    blurb: "Converts enthalpy into kinetic energy — adiabatic, no work.",
    params: [
      P("h1", "Inlet enthalpy", "h_1", "kJ/kg", 3000, 0, 4000, 1),
      P("h2", "Exit enthalpy", "h_2", "kJ/kg", 2800, 0, 4000, 1),
      P("v1", "Inlet velocity", "V_1", "m/s", 30, 0, 500, 1),
    ],
    eqs: [
      { tex: "V_2 = \\sqrt{2\\,(h_1 - h_2)\\cdot 10^3 + V_1^{\\,2}}", note: "Steady-flow energy equation with kJ→J conversion." },
    ],
    outs: [
      { label: "Exit velocity", sym: "V_2", unit: "m/s", f: (p) => Math.sqrt(Math.max(0, 2000 * (p.h1 - p.h2) + p.v1 * p.v1)), tone: "cyan" },
      { label: "KE gain", sym: "\\Delta ke", unit: "kJ/kg", f: (p) => p.h1 - p.h2 },
    ],
  },
  {
    id: "carnot", disc: "thermo", name: "Carnot Cycle Block", group: "Cycle analysis", shape: "carnot",
    blurb: "Upper efficiency bound for any heat engine between two reservoirs.",
    params: [
      P("Th", "Hot reservoir", "T_h", "K", 823, 100, 2000, 1),
      P("Tc", "Cold reservoir", "T_c", "K", 303, 50, 1000, 1),
      P("Qh", "Heat supplied", "Q_h", "kW", 1000, 1, 100000, 1),
    ],
    eqs: [
      { tex: "\\eta_{Carnot} = 1 - \\dfrac{T_c}{T_h}", note: "Maximum thermal efficiency — reversible operation only." },
      { tex: "\\dot{W} = \\eta\\,\\dot{Q}_h, \\quad \\dot{Q}_c = \\dot{Q}_h - \\dot{W}", note: "Work and rejected heat from the efficiency." },
    ],
    outs: [
      { label: "Carnot efficiency", sym: "\\eta", unit: "—", f: (p) => 1 - p.Tc / p.Th, tone: "amber" },
      { label: "Max work", sym: "\\dot{W}", unit: "kW", f: (p) => p.Qh * (1 - p.Tc / p.Th), tone: "cyan" },
      { label: "Heat rejected", sym: "\\dot{Q}_c", unit: "kW", f: (p) => p.Qh * (p.Tc / p.Th) },
    ],
  },
  {
    id: "valve", disc: "thermo", name: "Throttle Valve", group: "Flow device", shape: "valve",
    blurb: "Isenthalpic pressure drop — the Joule–Thomson expansion.",
    params: [
      P("P1", "Inlet pressure", "P_1", "kPa", 800, 10, 20000, 10),
      P("P2", "Outlet pressure", "P_2", "kPa", 120, 5, 20000, 5),
      P("mu", "J–T coefficient", "\\mu_{JT}", "K/kPa", 0.02, -0.1, 0.5, 0.001),
    ],
    eqs: [
      { tex: "h_1 = h_2 \\quad (\\text{isenthalpic})", note: "No work, no heat, negligible kinetic change." },
      { tex: "\\Delta T \\approx \\mu_{JT}\\,(P_2 - P_1)", note: "Joule–Thomson temperature change on expansion." },
    ],
    outs: [
      { label: "Pressure drop", sym: "\\Delta P", unit: "kPa", f: (p) => p.P1 - p.P2, tone: "cyan" },
      { label: "Temperature change", sym: "\\Delta T", unit: "K", f: (p) => p.mu * (p.P2 - p.P1), tone: "amber" },
    ],
  },
];

/* ==================================================================== */
/* AEROSPACE                                                            */
/* ==================================================================== */

const AERO: EquipDef[] = [
  {
    id: "wing", disc: "aero", name: "Lifting Wing", group: "Aerodynamics", shape: "wing",
    blurb: "Finite wing generating lift and induced drag.",
    params: [
      P("rho", "Air density", "\\rho", "kg/m³", 1.225, 0.01, 1.4, 0.001),
      P("v", "True airspeed", "V", "m/s", 85, 5, 400, 1),
      P("S", "Wing area", "S", "m²", 16, 0.5, 600, 0.5),
      P("CL", "Lift coefficient", "C_L", "—", 0.9, 0, 2.5, 0.01),
      P("AR", "Aspect ratio", "AR", "—", 8, 2, 30, 0.1),
    ],
    eqs: [
      { tex: "L = \\tfrac{1}{2}\\rho V^2 S\\,C_L", note: "Lift from dynamic pressure and wing planform." },
      { tex: "C_{D,i} = \\dfrac{C_L^2}{\\pi e\\,AR}", note: "Induced drag coefficient, Oswald factor e = 0.8." },
    ],
    outs: [
      { label: "Lift force", sym: "L", unit: "N", f: (p) => 0.5 * p.rho * p.v * p.v * p.S * p.CL, tone: "cyan" },
      { label: "Dynamic pressure", sym: "q", unit: "Pa", f: (p) => 0.5 * p.rho * p.v * p.v },
      { label: "Induced drag coeff.", sym: "C_{D,i}", unit: "—", f: (p) => (p.CL * p.CL) / (Math.PI * 0.8 * p.AR) },
      { label: "Induced drag", sym: "D_i", unit: "N", f: (p) => 0.5 * p.rho * p.v * p.v * p.S * ((p.CL * p.CL) / (Math.PI * 0.8 * p.AR)), tone: "amber" },
    ],
  },
  {
    id: "jet", disc: "aero", name: "Turbojet Engine", group: "Propulsion", shape: "jet",
    blurb: "Air-breathing thrust from exhaust momentum flux.",
    params: [
      P("mdot", "Air mass flow", "\\dot{m}", "kg/s", 45, 1, 500, 1),
      P("ve", "Exhaust velocity", "V_e", "m/s", 600, 50, 2000, 10),
      P("v0", "Flight velocity", "V_0", "m/s", 240, 0, 900, 5),
      P("tsfc", "Specific fuel cons.", "TSFC", "kg/N·h", 0.09, 0.01, 0.3, 0.005),
    ],
    eqs: [
      { tex: "F = \\dot{m}\\,(V_e - V_0)", note: "Net momentum thrust for a matched nozzle." },
      { tex: "P_{prop} = F\\,V_0, \\quad \\eta_p = \\dfrac{2V_0}{V_e + V_0}", note: "Propulsive power and Froude efficiency." },
    ],
    outs: [
      { label: "Net thrust", sym: "F", unit: "N", f: (p) => p.mdot * (p.ve - p.v0), tone: "cyan" },
      { label: "Propulsive power", sym: "P", unit: "W", f: (p) => p.mdot * (p.ve - p.v0) * p.v0 },
      { label: "Propulsive efficiency", sym: "\\eta_p", unit: "—", f: (p) => (2 * p.v0) / (p.ve + p.v0), tone: "amber" },
      { label: "Fuel burn", sym: "\\dot{m}_f", unit: "kg/h", f: (p) => p.tsfc * p.mdot * (p.ve - p.v0) },
    ],
  },
  {
    id: "rocket", disc: "aero", name: "Rocket Motor", group: "Propulsion", shape: "rocket",
    blurb: "Thrust and mission Δv via the Tsiolkovsky equation.",
    params: [
      P("Isp", "Specific impulse", "I_{sp}", "s", 311, 50, 480, 1),
      P("mdot", "Propellant flow", "\\dot{m}", "kg/s", 250, 0.1, 3000, 1),
      P("m0", "Wet mass", "m_0", "kg", 45000, 10, 3000000, 10),
      P("mf", "Dry mass", "m_f", "kg", 6000, 5, 1000000, 5),
    ],
    eqs: [
      { tex: "F = I_{sp}\\,g_0\\,\\dot{m}", note: "Thrust from specific impulse, g₀ = 9.80665 m/s²." },
      { tex: "\\Delta v = I_{sp}\\,g_0\\,\\ln\\!\\left(\\dfrac{m_0}{m_f}\\right)", note: "Tsiolkovsky rocket equation — the mission budget." },
    ],
    outs: [
      { label: "Thrust", sym: "F", unit: "N", f: (p) => p.Isp * 9.80665 * p.mdot, tone: "cyan" },
      { label: "Exhaust velocity", sym: "v_e", unit: "m/s", f: (p) => p.Isp * 9.80665 },
      { label: "Mass ratio", sym: "m_0/m_f", unit: "—", f: (p) => p.m0 / Math.max(1e-6, p.mf) },
      { label: "Delta-v", sym: "\\Delta v", unit: "m/s", f: (p) => p.Isp * 9.80665 * Math.log(Math.max(1.0000001, p.m0 / Math.max(1e-6, p.mf))), tone: "amber" },
      { label: "Burn time", sym: "t_b", unit: "s", f: (p) => (p.m0 - p.mf) / Math.max(1e-6, p.mdot) },
    ],
  },
  {
    id: "prop", disc: "aero", name: "Propeller", group: "Propulsion", shape: "prop",
    blurb: "Static thrust from non-dimensional propeller coefficients.",
    params: [
      P("rho", "Air density", "\\rho", "kg/m³", 1.225, 0.01, 1.4, 0.001),
      P("n", "Rotation rate", "n", "rev/s", 40, 1, 200, 1),
      P("D", "Diameter", "D", "m", 1.8, 0.1, 6, 0.05),
      P("CT", "Thrust coefficient", "C_T", "—", 0.1, 0.01, 0.3, 0.005),
      P("CP", "Power coefficient", "C_P", "—", 0.05, 0.005, 0.3, 0.005),
    ],
    eqs: [
      { tex: "T = C_T\\,\\rho\\,n^2 D^4", note: "Propeller thrust scaling law." },
      { tex: "P = C_P\\,\\rho\\,n^3 D^5", note: "Shaft power absorbed by the disc." },
    ],
    outs: [
      { label: "Thrust", sym: "T", unit: "N", f: (p) => p.CT * p.rho * p.n * p.n * Math.pow(p.D, 4), tone: "cyan" },
      { label: "Shaft power", sym: "P", unit: "W", f: (p) => p.CP * p.rho * Math.pow(p.n, 3) * Math.pow(p.D, 5) },
      { label: "Tip speed", sym: "V_{tip}", unit: "m/s", f: (p) => Math.PI * p.D * p.n, tone: "amber" },
    ],
  },
  {
    id: "tank", disc: "aero", name: "Propellant Tank", group: "Structures", shape: "tank",
    blurb: "Pressurised cylindrical tank — capacity and hoop stress.",
    params: [
      P("r", "Radius", "r", "m", 1.2, 0.05, 6, 0.05),
      P("L", "Length", "L", "m", 5, 0.1, 40, 0.1),
      P("rho", "Propellant density", "\\rho", "kg/m³", 1141, 10, 2000, 1),
      P("Pi", "Internal pressure", "P", "kPa", 350, 10, 5000, 10),
      P("t", "Wall thickness", "t", "mm", 4, 0.5, 60, 0.5),
    ],
    eqs: [
      { tex: "V = \\pi r^2 L, \\quad m = \\rho V", note: "Cylindrical capacity and propellant load." },
      { tex: "\\sigma_h = \\dfrac{P r}{t}", note: "Thin-wall hoop stress — the sizing driver." },
    ],
    outs: [
      { label: "Volume", sym: "V", unit: "m³", f: (p) => Math.PI * p.r * p.r * p.L },
      { label: "Propellant mass", sym: "m", unit: "kg", f: (p) => p.rho * Math.PI * p.r * p.r * p.L, tone: "cyan" },
      { label: "Hoop stress", sym: "\\sigma_h", unit: "MPa", f: (p) => (p.Pi * 1000 * p.r) / (p.t / 1000) / 1e6, tone: "amber" },
    ],
  },
  {
    id: "shield", disc: "aero", name: "Re-entry Heat Shield", group: "Thermal", shape: "shield",
    blurb: "Stagnation-point convective heating on atmospheric entry.",
    params: [
      P("rho", "Free-stream density", "\\rho", "kg/m³", 0.02, 1e-5, 1.3, 0.0001),
      P("v", "Entry velocity", "V", "m/s", 7200, 500, 15000, 50),
      P("Rn", "Nose radius", "R_n", "m", 0.9, 0.05, 5, 0.05),
      P("eps", "Surface emissivity", "\\varepsilon", "—", 0.85, 0.1, 1, 0.01),
    ],
    eqs: [
      { tex: "\\dot{q} = 1.83\\times10^{-4}\\,\\sqrt{\\dfrac{\\rho}{R_n}}\\;V^3", note: "Sutton–Graves stagnation heating correlation (W/m²)." },
      { tex: "T_{eq} = \\left(\\dfrac{\\dot q}{\\varepsilon\\sigma}\\right)^{1/4}", note: "Radiative equilibrium wall temperature." },
    ],
    outs: [
      { label: "Heat flux", sym: "\\dot q", unit: "W/m²", f: (p) => 1.83e-4 * Math.sqrt(p.rho / p.Rn) * Math.pow(p.v, 3), tone: "cyan" },
      { label: "Equilibrium temp.", sym: "T_{eq}", unit: "K", f: (p) => Math.pow((1.83e-4 * Math.sqrt(p.rho / p.Rn) * Math.pow(p.v, 3)) / (p.eps * 5.670374419e-8), 0.25), tone: "amber" },
    ],
  },
];

/* ==================================================================== */
/* ELECTRONICS                                                          */
/* ==================================================================== */

const ELEC: EquipDef[] = [
  {
    id: "resistor", disc: "electronics", name: "Resistor", group: "Passives", shape: "resistor",
    blurb: "Linear ohmic element dissipating electrical power as heat.",
    params: [
      P("R", "Resistance", "R", "Ω", 1000, 0.1, 1e6, 1),
      P("I", "Current", "I", "mA", 12, 0.001, 5000, 0.1),
    ],
    eqs: [
      { tex: "V = I R", note: "Ohm's law." },
      { tex: "P = I^2 R = \\dfrac{V^2}{R}", note: "Joule dissipation in the element." },
    ],
    outs: [
      { label: "Voltage drop", sym: "V", unit: "V", f: (p) => (p.I / 1000) * p.R, tone: "cyan" },
      { label: "Power dissipated", sym: "P", unit: "W", f: (p) => Math.pow(p.I / 1000, 2) * p.R, tone: "amber" },
      { label: "Conductance", sym: "G", unit: "S", f: (p) => 1 / p.R },
    ],
  },
  {
    id: "capacitor", disc: "electronics", name: "Capacitor", group: "Passives", shape: "capacitor",
    blurb: "Stores charge in an electric field; blocks DC, passes AC.",
    params: [
      P("C", "Capacitance", "C", "µF", 10, 0.001, 10000, 0.001),
      P("V", "Voltage", "V", "V", 12, 0.1, 1000, 0.1),
      P("f", "Signal frequency", "f", "Hz", 1000, 0.1, 1e7, 1),
    ],
    eqs: [
      { tex: "Q = C V, \\quad E = \\tfrac{1}{2}CV^2", note: "Stored charge and field energy." },
      { tex: "X_C = \\dfrac{1}{2\\pi f C}", note: "Capacitive reactance falls with frequency." },
    ],
    outs: [
      { label: "Stored charge", sym: "Q", unit: "C", f: (p) => p.C * 1e-6 * p.V },
      { label: "Stored energy", sym: "E", unit: "J", f: (p) => 0.5 * p.C * 1e-6 * p.V * p.V, tone: "cyan" },
      { label: "Reactance", sym: "X_C", unit: "Ω", f: (p) => 1 / (2 * Math.PI * p.f * p.C * 1e-6), tone: "amber" },
    ],
  },
  {
    id: "inductor", disc: "electronics", name: "Inductor", group: "Passives", shape: "inductor",
    blurb: "Stores energy in a magnetic field; opposes current change.",
    params: [
      P("L", "Inductance", "L", "mH", 10, 0.001, 10000, 0.001),
      P("I", "Current", "I", "mA", 100, 0.1, 10000, 0.1),
      P("f", "Signal frequency", "f", "Hz", 1000, 0.1, 1e7, 1),
    ],
    eqs: [
      { tex: "E = \\tfrac{1}{2}L I^2", note: "Magnetic energy storage." },
      { tex: "X_L = 2\\pi f L, \\quad v = L\\dfrac{di}{dt}", note: "Inductive reactance rises with frequency." },
    ],
    outs: [
      { label: "Stored energy", sym: "E", unit: "J", f: (p) => 0.5 * p.L * 1e-3 * Math.pow(p.I / 1000, 2), tone: "cyan" },
      { label: "Reactance", sym: "X_L", unit: "Ω", f: (p) => 2 * Math.PI * p.f * p.L * 1e-3, tone: "amber" },
    ],
  },
  {
    id: "diode", disc: "electronics", name: "Diode", group: "Semiconductors", shape: "diode",
    blurb: "One-way valve following the Shockley exponential law.",
    params: [
      P("Is", "Saturation current", "I_S", "nA", 10, 0.001, 1000, 0.001),
      P("Vd", "Forward voltage", "V_D", "V", 0.65, 0, 1.2, 0.01),
      P("n", "Ideality factor", "n", "—", 1.8, 1, 2, 0.01),
      P("T", "Temperature", "T", "K", 300, 200, 450, 1),
    ],
    eqs: [
      { tex: "I_D = I_S\\left(e^{\\frac{V_D}{nV_T}} - 1\\right)", note: "Shockley diode equation." },
      { tex: "V_T = \\dfrac{k_B T}{q} \\approx 25.85\\ \\text{mV at }300\\,K", note: "Thermal voltage sets the exponential slope." },
    ],
    outs: [
      { label: "Thermal voltage", sym: "V_T", unit: "mV", f: (p) => (1.380649e-23 * p.T) / 1.602176634e-19 * 1000 },
      { label: "Forward current", sym: "I_D", unit: "mA", f: (p) => (p.Is * 1e-9 * (Math.exp(p.Vd / (p.n * ((1.380649e-23 * p.T) / 1.602176634e-19))) - 1)) * 1000, tone: "cyan" },
      { label: "Power", sym: "P", unit: "mW", f: (p) => p.Vd * (p.Is * 1e-9 * (Math.exp(p.Vd / (p.n * ((1.380649e-23 * p.T) / 1.602176634e-19))) - 1)) * 1000, tone: "amber" },
    ],
  },
  {
    id: "bjt", disc: "electronics", name: "BJT Transistor", group: "Semiconductors", shape: "bjt",
    blurb: "Current-controlled amplifier in the active region.",
    params: [
      P("beta", "Current gain", "\\beta", "—", 150, 10, 800, 1),
      P("Ib", "Base current", "I_B", "µA", 20, 0.1, 1000, 0.1),
      P("Vce", "Collector-emitter", "V_{CE}", "V", 6, 0.1, 40, 0.1),
      P("Rc", "Collector resistor", "R_C", "Ω", 1000, 10, 100000, 10),
    ],
    eqs: [
      { tex: "I_C = \\beta I_B, \\quad I_E = (\\beta + 1) I_B", note: "Active-region current relations." },
      { tex: "A_v = -\\dfrac{R_C}{r_e}, \\quad r_e = \\dfrac{26\\,\\text{mV}}{I_E}", note: "Small-signal voltage gain of a common-emitter stage." },
    ],
    outs: [
      { label: "Collector current", sym: "I_C", unit: "mA", f: (p) => (p.beta * p.Ib) / 1000, tone: "cyan" },
      { label: "Emitter current", sym: "I_E", unit: "mA", f: (p) => ((p.beta + 1) * p.Ib) / 1000 },
      { label: "Dissipation", sym: "P", unit: "mW", f: (p) => (p.Vce * p.beta * p.Ib) / 1000, tone: "amber" },
      { label: "Voltage gain", sym: "A_v", unit: "—", f: (p) => -(p.Rc * ((p.beta + 1) * p.Ib) / 1000) / 26 },
    ],
  },
  {
    id: "mosfet", disc: "electronics", name: "MOSFET", group: "Semiconductors", shape: "mosfet",
    blurb: "Voltage-controlled switch — square-law saturation current.",
    params: [
      P("k", "Transconductance", "k", "mA/V²", 2, 0.01, 50, 0.01),
      P("Vgs", "Gate-source voltage", "V_{GS}", "V", 3.3, 0, 12, 0.05),
      P("Vth", "Threshold voltage", "V_{th}", "V", 1.2, 0.2, 5, 0.05),
      P("Vds", "Drain-source voltage", "V_{DS}", "V", 5, 0, 20, 0.1),
    ],
    eqs: [
      { tex: "I_D = \\tfrac{1}{2}k\\,(V_{GS} - V_{th})^2", note: "Saturation region, V_DS ≥ V_GS − V_th." },
      { tex: "g_m = k\\,(V_{GS} - V_{th})", note: "Small-signal transconductance." },
    ],
    outs: [
      { label: "Overdrive", sym: "V_{ov}", unit: "V", f: (p) => Math.max(0, p.Vgs - p.Vth) },
      { label: "Drain current", sym: "I_D", unit: "mA", f: (p) => 0.5 * p.k * Math.pow(Math.max(0, p.Vgs - p.Vth), 2), tone: "cyan" },
      { label: "Transconductance", sym: "g_m", unit: "mA/V", f: (p) => p.k * Math.max(0, p.Vgs - p.Vth) },
      { label: "Dissipation", sym: "P", unit: "mW", f: (p) => p.Vds * 0.5 * p.k * Math.pow(Math.max(0, p.Vgs - p.Vth), 2), tone: "amber" },
    ],
  },
  {
    id: "opamp", disc: "electronics", name: "Op-Amp Stage", group: "Analog", shape: "opamp",
    blurb: "Inverting amplifier with finite gain-bandwidth product.",
    params: [
      P("Rf", "Feedback resistor", "R_f", "kΩ", 100, 0.1, 10000, 0.1),
      P("Rin", "Input resistor", "R_{in}", "kΩ", 10, 0.1, 10000, 0.1),
      P("Vin", "Input voltage", "V_{in}", "mV", 50, 0.1, 5000, 0.1),
      P("GBW", "Gain-bandwidth", "GBW", "MHz", 10, 0.1, 1000, 0.1),
    ],
    eqs: [
      { tex: "A_v = -\\dfrac{R_f}{R_{in}}", note: "Ideal closed-loop gain of the inverting topology." },
      { tex: "f_{-3dB} = \\dfrac{GBW}{|A_v|}", note: "Closed-loop bandwidth from the gain-bandwidth trade." },
    ],
    outs: [
      { label: "Voltage gain", sym: "A_v", unit: "V/V", f: (p) => -p.Rf / p.Rin, tone: "cyan" },
      { label: "Output voltage", sym: "V_{out}", unit: "mV", f: (p) => (-p.Rf / p.Rin) * p.Vin },
      { label: "Bandwidth", sym: "f_{-3dB}", unit: "MHz", f: (p) => p.GBW / Math.abs(p.Rf / p.Rin), tone: "amber" },
    ],
  },
  {
    id: "battery", disc: "electronics", name: "DC Source / Battery", group: "Sources", shape: "battery",
    blurb: "EMF with internal resistance driving a load.",
    params: [
      P("emf", "EMF", "\\mathcal{E}", "V", 12, 0.1, 400, 0.1),
      P("r", "Internal resistance", "r", "Ω", 0.15, 0.001, 20, 0.001),
      P("RL", "Load resistance", "R_L", "Ω", 10, 0.01, 10000, 0.01),
      P("cap", "Capacity", "Q", "Ah", 60, 0.1, 500, 0.1),
    ],
    eqs: [
      { tex: "I = \\dfrac{\\mathcal{E}}{R_L + r}, \\quad V_{term} = \\mathcal{E} - I r", note: "Loaded terminal voltage with internal drop." },
      { tex: "t_{run} = \\dfrac{Q}{I}", note: "Runtime from amp-hour capacity." },
    ],
    outs: [
      { label: "Load current", sym: "I", unit: "A", f: (p) => p.emf / (p.RL + p.r), tone: "cyan" },
      { label: "Terminal voltage", sym: "V", unit: "V", f: (p) => p.emf - (p.emf / (p.RL + p.r)) * p.r },
      { label: "Load power", sym: "P_L", unit: "W", f: (p) => Math.pow(p.emf / (p.RL + p.r), 2) * p.RL, tone: "amber" },
      { label: "Runtime", sym: "t", unit: "h", f: (p) => p.cap / (p.emf / (p.RL + p.r)) },
    ],
  },
];

/* ==================================================================== */
/* MECHANICAL                                                           */
/* ==================================================================== */

const MECH: EquipDef[] = [
  {
    id: "spring", disc: "mechanical", name: "Coil Spring", group: "Elements", shape: "spring",
    blurb: "Linear elastic element storing strain energy.",
    params: [
      P("k", "Spring rate", "k", "N/m", 2500, 1, 500000, 1),
      P("x", "Deflection", "x", "mm", 25, 0.1, 500, 0.1),
      P("m", "Attached mass", "m", "kg", 12, 0.01, 2000, 0.01),
    ],
    eqs: [
      { tex: "F = kx, \\quad U = \\tfrac{1}{2}kx^2", note: "Hooke's law and stored elastic energy." },
      { tex: "f_n = \\dfrac{1}{2\\pi}\\sqrt{\\dfrac{k}{m}}", note: "Undamped natural frequency of the mass–spring pair." },
    ],
    outs: [
      { label: "Spring force", sym: "F", unit: "N", f: (p) => p.k * (p.x / 1000), tone: "cyan" },
      { label: "Stored energy", sym: "U", unit: "J", f: (p) => 0.5 * p.k * Math.pow(p.x / 1000, 2) },
      { label: "Natural frequency", sym: "f_n", unit: "Hz", f: (p) => (1 / (2 * Math.PI)) * Math.sqrt(p.k / p.m), tone: "amber" },
    ],
  },
  {
    id: "damper", disc: "mechanical", name: "Viscous Damper", group: "Elements", shape: "damper",
    blurb: "Dissipative element with force proportional to velocity.",
    params: [
      P("c", "Damping coefficient", "c", "N·s/m", 250, 0.1, 20000, 0.1),
      P("v", "Velocity", "v", "m/s", 1.5, 0.01, 30, 0.01),
      P("m", "Mass", "m", "kg", 12, 0.01, 2000, 0.01),
      P("k", "Spring rate", "k", "N/m", 2500, 1, 500000, 1),
    ],
    eqs: [
      { tex: "F_d = c\\,v, \\quad P = F_d v", note: "Damping force and power dissipated as heat." },
      { tex: "\\zeta = \\dfrac{c}{2\\sqrt{km}}", note: "Damping ratio — ζ < 1 underdamped, ζ = 1 critical." },
    ],
    outs: [
      { label: "Damping force", sym: "F_d", unit: "N", f: (p) => p.c * p.v, tone: "cyan" },
      { label: "Power dissipated", sym: "P", unit: "W", f: (p) => p.c * p.v * p.v },
      { label: "Damping ratio", sym: "\\zeta", unit: "—", f: (p) => p.c / (2 * Math.sqrt(p.k * p.m)), tone: "amber" },
    ],
  },
  {
    id: "mass", disc: "mechanical", name: "Mass Block", group: "Elements", shape: "mass",
    blurb: "Inertial body under applied force on a friction surface.",
    params: [
      P("m", "Mass", "m", "kg", 50, 0.1, 5000, 0.1),
      P("F", "Applied force", "F", "N", 300, 0, 50000, 1),
      P("mu", "Friction coefficient", "\\mu", "—", 0.3, 0, 1.2, 0.01),
      P("g", "Gravity", "g", "m/s²", 9.81, 0, 30, 0.01),
    ],
    eqs: [
      { tex: "f_{fr} = \\mu m g, \\quad a = \\dfrac{F - f_{fr}}{m}", note: "Newton's second law with Coulomb friction." },
      { tex: "W = mg, \\quad p = mv", note: "Weight and momentum of the body." },
    ],
    outs: [
      { label: "Weight", sym: "W", unit: "N", f: (p) => p.m * p.g },
      { label: "Friction force", sym: "f_{fr}", unit: "N", f: (p) => p.mu * p.m * p.g, tone: "amber" },
      { label: "Acceleration", sym: "a", unit: "m/s²", f: (p) => Math.max(0, p.F - p.mu * p.m * p.g) / p.m, tone: "cyan" },
    ],
  },
  {
    id: "gear", disc: "mechanical", name: "Gear Pair", group: "Power transmission", shape: "gear",
    blurb: "Speed and torque conversion through a meshing tooth ratio.",
    params: [
      P("N1", "Driver teeth", "N_1", "—", 20, 6, 200, 1),
      P("N2", "Driven teeth", "N_2", "—", 60, 6, 300, 1),
      P("w1", "Input speed", "\\omega_1", "rpm", 1500, 1, 20000, 1),
      P("T1", "Input torque", "T_1", "N·m", 25, 0.01, 5000, 0.01),
      P("eta", "Mesh efficiency", "\\eta", "—", 0.97, 0.5, 1, 0.005),
    ],
    eqs: [
      { tex: "i = \\dfrac{N_2}{N_1} = \\dfrac{\\omega_1}{\\omega_2}", note: "Gear ratio — speed reduces as torque multiplies." },
      { tex: "T_2 = \\eta\\, i\\, T_1, \\quad P = T\\omega", note: "Output torque and transmitted power." },
    ],
    outs: [
      { label: "Gear ratio", sym: "i", unit: "—", f: (p) => p.N2 / p.N1 },
      { label: "Output speed", sym: "\\omega_2", unit: "rpm", f: (p) => (p.w1 * p.N1) / p.N2, tone: "cyan" },
      { label: "Output torque", sym: "T_2", unit: "N·m", f: (p) => p.eta * (p.N2 / p.N1) * p.T1, tone: "amber" },
      { label: "Transmitted power", sym: "P", unit: "W", f: (p) => p.T1 * ((p.w1 * 2 * Math.PI) / 60) },
    ],
  },
  {
    id: "pulley", disc: "mechanical", name: "Pulley System", group: "Power transmission", shape: "pulley",
    blurb: "Block and tackle trading rope travel for mechanical advantage.",
    params: [
      P("n", "Supporting ropes", "n", "—", 4, 1, 12, 1),
      P("W", "Load weight", "W", "N", 4000, 1, 200000, 1),
      P("eta", "System efficiency", "\\eta", "—", 0.9, 0.3, 1, 0.01),
      P("d", "Load lift height", "d", "m", 3, 0.1, 50, 0.1),
    ],
    eqs: [
      { tex: "F = \\dfrac{W}{n\\,\\eta}, \\quad MA = \\dfrac{W}{F}", note: "Effort force and mechanical advantage." },
      { tex: "s = n\\,d, \\quad W_{in} = F s", note: "Rope pulled and work input for the lift." },
    ],
    outs: [
      { label: "Effort force", sym: "F", unit: "N", f: (p) => p.W / (p.n * p.eta), tone: "cyan" },
      { label: "Mechanical advantage", sym: "MA", unit: "—", f: (p) => p.n * p.eta, tone: "amber" },
      { label: "Rope travel", sym: "s", unit: "m", f: (p) => p.n * p.d },
      { label: "Work input", sym: "W_{in}", unit: "J", f: (p) => (p.W / (p.n * p.eta)) * p.n * p.d },
    ],
  },
  {
    id: "beam", disc: "mechanical", name: "Cantilever Beam", group: "Structures", shape: "beam",
    blurb: "End-loaded cantilever — deflection, stress and stiffness.",
    params: [
      P("F", "Tip load", "F", "N", 1200, 1, 200000, 1),
      P("L", "Span", "L", "m", 1.5, 0.05, 20, 0.05),
      P("E", "Young's modulus", "E", "GPa", 200, 1, 1200, 1),
      P("b", "Section width", "b", "mm", 60, 1, 1000, 1),
      P("h", "Section height", "h", "mm", 100, 1, 1000, 1),
    ],
    eqs: [
      { tex: "I = \\dfrac{b h^3}{12}", note: "Second moment of area for a rectangular section." },
      { tex: "\\delta = \\dfrac{F L^3}{3EI}, \\quad \\sigma_{max} = \\dfrac{F L\\,(h/2)}{I}", note: "Tip deflection and peak bending stress at the root." },
    ],
    outs: [
      { label: "Second moment", sym: "I", unit: "mm⁴", f: (p) => (p.b * Math.pow(p.h, 3)) / 12 },
      { label: "Tip deflection", sym: "\\delta", unit: "mm", f: (p) => ((p.F * Math.pow(p.L, 3)) / (3 * p.E * 1e9 * ((p.b * Math.pow(p.h, 3)) / 12) * 1e-12)) * 1000, tone: "cyan" },
      { label: "Max bending stress", sym: "\\sigma", unit: "MPa", f: (p) => ((p.F * p.L * (p.h / 2000)) / (((p.b * Math.pow(p.h, 3)) / 12) * 1e-12)) / 1e6, tone: "amber" },
    ],
  },
  {
    id: "shaft", disc: "mechanical", name: "Transmission Shaft", group: "Structures", shape: "shaft",
    blurb: "Solid circular shaft in torsion — shear stress and twist.",
    params: [
      P("T", "Torque", "T", "N·m", 450, 0.1, 100000, 0.1),
      P("d", "Diameter", "d", "mm", 40, 2, 500, 1),
      P("L", "Length", "L", "m", 1.2, 0.05, 20, 0.05),
      P("G", "Shear modulus", "G", "GPa", 79, 1, 500, 1),
    ],
    eqs: [
      { tex: "J = \\dfrac{\\pi d^4}{32}, \\quad \\tau_{max} = \\dfrac{T\\,(d/2)}{J}", note: "Polar second moment and surface shear stress." },
      { tex: "\\theta = \\dfrac{T L}{G J}", note: "Angle of twist over the shaft length." },
    ],
    outs: [
      { label: "Polar moment", sym: "J", unit: "mm⁴", f: (p) => (Math.PI * Math.pow(p.d, 4)) / 32 },
      { label: "Max shear stress", sym: "\\tau", unit: "MPa", f: (p) => ((p.T * (p.d / 2000)) / (((Math.PI * Math.pow(p.d, 4)) / 32) * 1e-12)) / 1e6, tone: "amber" },
      { label: "Angle of twist", sym: "\\theta", unit: "°", f: (p) => ((p.T * p.L) / (p.G * 1e9 * ((Math.PI * Math.pow(p.d, 4)) / 32) * 1e-12)) * (180 / Math.PI), tone: "cyan" },
    ],
  },
];

/* ==================================================================== */
/* VLSI                                                                 */
/* ==================================================================== */

const VLSI: EquipDef[] = [
  {
    id: "nmos", disc: "vlsi", name: "NMOS Device", group: "Devices", shape: "nmos",
    blurb: "N-channel transistor in saturation — the pull-down workhorse.",
    params: [
      P("ucox", "Process transconductance", "\\mu_n C_{ox}", "µA/V²", 250, 10, 1200, 5),
      P("W", "Channel width", "W", "nm", 360, 20, 10000, 10),
      P("L", "Channel length", "L", "nm", 45, 5, 1000, 1),
      P("Vgs", "Gate drive", "V_{GS}", "V", 1, 0, 3.3, 0.01),
      P("Vth", "Threshold", "V_{th}", "V", 0.35, 0.05, 1.5, 0.01),
    ],
    eqs: [
      { tex: "I_D = \\tfrac{1}{2}\\mu_n C_{ox}\\dfrac{W}{L}\\,(V_{GS}-V_{th})^2", note: "Square-law saturation current." },
      { tex: "g_m = \\mu_n C_{ox}\\dfrac{W}{L}(V_{GS}-V_{th})", note: "Transconductance sets the small-signal gain." },
    ],
    outs: [
      { label: "Aspect ratio", sym: "W/L", unit: "—", f: (p) => p.W / p.L },
      { label: "Overdrive", sym: "V_{ov}", unit: "V", f: (p) => Math.max(0, p.Vgs - p.Vth) },
      { label: "Drain current", sym: "I_D", unit: "µA", f: (p) => 0.5 * p.ucox * (p.W / p.L) * Math.pow(Math.max(0, p.Vgs - p.Vth), 2), tone: "cyan" },
      { label: "Transconductance", sym: "g_m", unit: "µA/V", f: (p) => p.ucox * (p.W / p.L) * Math.max(0, p.Vgs - p.Vth), tone: "amber" },
    ],
  },
  {
    id: "pmos", disc: "vlsi", name: "PMOS Device", group: "Devices", shape: "pmos",
    blurb: "P-channel pull-up — sized wider to match NMOS drive.",
    params: [
      P("ucox", "Process transconductance", "\\mu_p C_{ox}", "µA/V²", 110, 10, 800, 5),
      P("W", "Channel width", "W", "nm", 720, 20, 20000, 10),
      P("L", "Channel length", "L", "nm", 45, 5, 1000, 1),
      P("Vsg", "Source-gate drive", "V_{SG}", "V", 1, 0, 3.3, 0.01),
      P("Vth", "Threshold |Vth|", "|V_{th}|", "V", 0.4, 0.05, 1.5, 0.01),
    ],
    eqs: [
      { tex: "I_D = \\tfrac{1}{2}\\mu_p C_{ox}\\dfrac{W}{L}\\,(V_{SG}-|V_{th}|)^2", note: "PMOS saturation current — lower mobility than NMOS." },
      { tex: "\\dfrac{W_p}{W_n} \\approx \\dfrac{\\mu_n}{\\mu_p} \\approx 2{-}3", note: "Sizing ratio for symmetric rise/fall times." },
    ],
    outs: [
      { label: "Aspect ratio", sym: "W/L", unit: "—", f: (p) => p.W / p.L },
      { label: "Drain current", sym: "|I_D|", unit: "µA", f: (p) => 0.5 * p.ucox * (p.W / p.L) * Math.pow(Math.max(0, p.Vsg - p.Vth), 2), tone: "cyan" },
    ],
  },
  {
    id: "inverter", disc: "vlsi", name: "CMOS Inverter", group: "Logic", shape: "inverter",
    blurb: "The canonical gate — dynamic, short-circuit and leakage power.",
    params: [
      P("CL", "Load capacitance", "C_L", "fF", 12, 0.1, 1000, 0.1),
      P("Vdd", "Supply voltage", "V_{DD}", "V", 1, 0.3, 3.3, 0.01),
      P("f", "Switching frequency", "f", "MHz", 1000, 1, 10000, 1),
      P("alpha", "Activity factor", "\\alpha", "—", 0.15, 0.001, 1, 0.001),
      P("Ileak", "Leakage current", "I_{leak}", "nA", 50, 0.01, 10000, 0.01),
    ],
    eqs: [
      { tex: "P_{dyn} = \\alpha\\,C_L V_{DD}^2 f", note: "Dynamic switching power — the dominant term." },
      { tex: "P_{stat} = I_{leak} V_{DD}, \\quad t_p \\approx \\dfrac{C_L V_{DD}}{2 I_D}", note: "Static leakage and propagation delay." },
    ],
    outs: [
      { label: "Dynamic power", sym: "P_{dyn}", unit: "µW", f: (p) => p.alpha * p.CL * 1e-15 * p.Vdd * p.Vdd * p.f * 1e6 * 1e6, tone: "cyan" },
      { label: "Static power", sym: "P_{stat}", unit: "µW", f: (p) => p.Ileak * 1e-9 * p.Vdd * 1e6 },
      { label: "Energy per switch", sym: "E", unit: "fJ", f: (p) => p.CL * 1e-15 * p.Vdd * p.Vdd * 1e15, tone: "amber" },
    ],
  },
  {
    id: "nand", disc: "vlsi", name: "NAND Gate", group: "Logic", shape: "nand",
    blurb: "Universal gate — stacked NMOS raises effective resistance.",
    params: [
      P("fanin", "Fan-in", "N", "—", 2, 2, 8, 1),
      P("fanout", "Fan-out", "FO", "—", 4, 1, 32, 1),
      P("Cg", "Gate capacitance", "C_g", "fF", 2, 0.1, 50, 0.1),
      P("Reff", "Unit resistance", "R_{eq}", "kΩ", 8, 0.1, 100, 0.1),
    ],
    eqs: [
      { tex: "t_{pd} = 0.69\\,(N R_{eq})(FO \\cdot C_g)", note: "RC delay with series-stacked pull-down devices." },
      { tex: "LE_{NAND} = \\dfrac{N+2}{3}", note: "Logical effort grows with fan-in." },
    ],
    outs: [
      { label: "Propagation delay", sym: "t_{pd}", unit: "ps", f: (p) => 0.69 * (p.fanin * p.Reff * 1e3) * (p.fanout * p.Cg * 1e-15) * 1e12, tone: "cyan" },
      { label: "Logical effort", sym: "LE", unit: "—", f: (p) => (p.fanin + 2) / 3, tone: "amber" },
      { label: "Max frequency", sym: "f_{max}", unit: "GHz", f: (p) => 1 / (0.69 * (p.fanin * p.Reff * 1e3) * (p.fanout * p.Cg * 1e-15)) / 1e9 },
    ],
  },
  {
    id: "wire", disc: "vlsi", name: "Interconnect", group: "Physical", shape: "wire",
    blurb: "Distributed RC line — Elmore delay dominates at scale.",
    params: [
      P("len", "Wire length", "\\ell", "µm", 500, 1, 20000, 1),
      P("rpu", "Resistance / µm", "r", "Ω/µm", 0.25, 0.001, 10, 0.001),
      P("cpu", "Capacitance / µm", "c", "fF/µm", 0.2, 0.001, 5, 0.001),
      P("Vdd", "Supply", "V_{DD}", "V", 1, 0.3, 3.3, 0.01),
    ],
    eqs: [
      { tex: "R = r\\ell, \\quad C = c\\ell", note: "Lumped line parasitics scale with length." },
      { tex: "t_{Elmore} = 0.38\\,R C = 0.38\\,r c\\,\\ell^2", note: "Quadratic length dependence — why repeaters exist." },
    ],
    outs: [
      { label: "Line resistance", sym: "R", unit: "Ω", f: (p) => p.rpu * p.len },
      { label: "Line capacitance", sym: "C", unit: "fF", f: (p) => p.cpu * p.len },
      { label: "Elmore delay", sym: "t_d", unit: "ps", f: (p) => 0.38 * (p.rpu * p.len) * (p.cpu * p.len * 1e-15) * 1e12, tone: "cyan" },
      { label: "Charge energy", sym: "E", unit: "fJ", f: (p) => p.cpu * p.len * 1e-15 * p.Vdd * p.Vdd * 1e15, tone: "amber" },
    ],
  },
  {
    id: "dff", disc: "vlsi", name: "D Flip-Flop", group: "Sequential", shape: "dff",
    blurb: "Timing element — sets the maximum clock of the pipeline.",
    params: [
      P("tcq", "Clock-to-Q", "t_{cq}", "ps", 40, 1, 500, 1),
      P("tsu", "Setup time", "t_{su}", "ps", 25, 1, 500, 1),
      P("tlogic", "Logic path delay", "t_{logic}", "ps", 250, 1, 5000, 1),
      P("tskew", "Clock skew", "t_{skew}", "ps", 15, 0, 300, 1),
    ],
    eqs: [
      { tex: "T_{clk} \\geq t_{cq} + t_{logic} + t_{su} + t_{skew}", note: "Setup-time constraint on the clock period." },
      { tex: "f_{max} = \\dfrac{1}{T_{clk}}", note: "Maximum operating frequency of the pipeline stage." },
    ],
    outs: [
      { label: "Min clock period", sym: "T_{clk}", unit: "ps", f: (p) => p.tcq + p.tlogic + p.tsu + p.tskew, tone: "cyan" },
      { label: "Max frequency", sym: "f_{max}", unit: "GHz", f: (p) => 1000 / (p.tcq + p.tlogic + p.tsu + p.tskew), tone: "amber" },
      { label: "Timing slack budget", sym: "t_{slack}", unit: "ps", f: (p) => 1000 - (p.tcq + p.tlogic + p.tsu + p.tskew) },
    ],
  },
  {
    id: "sram", disc: "vlsi", name: "SRAM Array", group: "Memory", shape: "sram",
    blurb: "6T bit-cell array — area, leakage and read current budget.",
    params: [
      P("rows", "Rows", "N_r", "—", 256, 8, 4096, 8),
      P("cols", "Columns", "N_c", "—", 256, 8, 4096, 8),
      P("acell", "Cell area", "A_{cell}", "µm²", 0.08, 0.005, 5, 0.005),
      P("ileak", "Cell leakage", "I_{leak}", "pA", 120, 1, 10000, 1),
      P("Vdd", "Supply", "V_{DD}", "V", 0.9, 0.3, 3.3, 0.01),
    ],
    eqs: [
      { tex: "N_{bits} = N_r N_c, \\quad A = N_{bits} A_{cell}", note: "Capacity and silicon footprint of the array." },
      { tex: "P_{leak} = N_{bits}\\,I_{leak}\\,V_{DD}", note: "Standby power — scales with every stored bit." },
    ],
    outs: [
      { label: "Capacity", sym: "N_{bits}", unit: "bits", f: (p) => p.rows * p.cols },
      { label: "Array area", sym: "A", unit: "µm²", f: (p) => p.rows * p.cols * p.acell, tone: "cyan" },
      { label: "Leakage power", sym: "P_{leak}", unit: "µW", f: (p) => p.rows * p.cols * p.ileak * 1e-12 * p.Vdd * 1e6, tone: "amber" },
    ],
  },
];

export const EQUIPMENT: EquipDef[] = [...THERMO, ...AERO, ...ELEC, ...MECH, ...VLSI];

export const equipByDisc = (d: DiscId) => EQUIPMENT.filter((e) => e.disc === d);
export const equipById = (id: string) => EQUIPMENT.find((e) => e.id === id);
export const discById = (d: DiscId) => DISCIPLINES.find((x) => x.id === d)!;
export const defaultParams = (e: EquipDef): Record<string, number> =>
  Object.fromEntries(e.params.map((p) => [p.key, p.def]));
