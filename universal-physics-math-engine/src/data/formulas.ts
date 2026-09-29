/** Formula reference library (rendered with KaTeX). */

export interface FormulaDef {
  id: string;
  name: string;
  cat: string;
  tex: string;
  desc: string;
}

export const FORMULA_CATEGORIES = [
  "Mechanics",
  "Electromagnetism",
  "Thermodynamics",
  "Waves & Optics",
  "Fluids",
  "Modern Physics",
];

export const FORMULAS: FormulaDef[] = [
  // Mechanics
  { id: "f1", name: "Newton's second law", cat: "Mechanics", tex: "F = m\\,a", desc: "Net force equals mass times acceleration — the foundation of classical dynamics." },
  { id: "f2", name: "Kinematic velocity", cat: "Mechanics", tex: "v = u + at", desc: "Final velocity under constant acceleration a over time t." },
  { id: "f3", name: "Kinematic displacement", cat: "Mechanics", tex: "s = ut + \\tfrac{1}{2}at^2", desc: "Displacement with initial velocity u and constant acceleration." },
  { id: "f4", name: "Torricelli's equation", cat: "Mechanics", tex: "v^2 = u^2 + 2as", desc: "Time-free kinematic relation between velocity, acceleration and displacement." },
  { id: "f5", name: "Kinetic energy", cat: "Mechanics", tex: "E_k = \\tfrac{1}{2}mv^2", desc: "Energy of a moving body; scales with the square of velocity." },
  { id: "f6", name: "Gravitational potential energy", cat: "Mechanics", tex: "E_p = mgh", desc: "Energy stored by raising mass m through height h in uniform gravity." },
  { id: "f7", name: "Momentum", cat: "Mechanics", tex: "p = mv", desc: "Quantity of motion; conserved in isolated systems." },
  { id: "f8", name: "Centripetal acceleration", cat: "Mechanics", tex: "a_c = \\dfrac{v^2}{r} = \\omega^2 r", desc: "Acceleration directed toward the centre of circular motion." },
  { id: "f9", name: "Work", cat: "Mechanics", tex: "W = Fd\\cos\\theta", desc: "Energy transferred by a force acting through a displacement." },
  { id: "f10", name: "Hooke's law", cat: "Mechanics", tex: "F = -kx", desc: "Restoring force of an ideal spring, proportional to displacement." },
  { id: "f11", name: "Simple pendulum", cat: "Mechanics", tex: "T = 2\\pi\\sqrt{\\dfrac{L}{g}}", desc: "Period of small oscillations of a pendulum of length L." },

  // Electromagnetism
  { id: "f12", name: "Ohm's law", cat: "Electromagnetism", tex: "V = IR", desc: "Voltage across a linear resistor equals current times resistance." },
  { id: "f13", name: "Electric power", cat: "Electromagnetism", tex: "P = VI = I^2R = \\dfrac{V^2}{R}", desc: "Rate of electrical energy dissipation or delivery." },
  { id: "f14", name: "Coulomb's law", cat: "Electromagnetism", tex: "F = k_e\\dfrac{q_1 q_2}{r^2}", desc: "Electrostatic force between two point charges." },
  { id: "f15", name: "Lorentz force", cat: "Electromagnetism", tex: "\\mathbf{F} = q(\\mathbf{E} + \\mathbf{v} \\times \\mathbf{B})", desc: "Force on a charge in combined electric and magnetic fields." },
  { id: "f16", name: "Capacitor energy", cat: "Electromagnetism", tex: "U = \\tfrac{1}{2}CV^2 = \\tfrac{1}{2}QV", desc: "Energy stored in the electric field of a charged capacitor." },
  { id: "f17", name: "Series resistance", cat: "Electromagnetism", tex: "R_{eq} = R_1 + R_2 + \\cdots + R_n", desc: "Resistances in series add directly." },
  { id: "f18", name: "Parallel resistance", cat: "Electromagnetism", tex: "\\dfrac{1}{R_{eq}} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2} + \\cdots", desc: "Reciprocals add for resistors in parallel — always less than the smallest branch." },
  { id: "f19", name: "RC time constant", cat: "Electromagnetism", tex: "\\tau = RC, \\quad V(t) = V_0\\left(1 - e^{-t/\\tau}\\right)", desc: "Charging behaviour of a capacitor through a resistor." },

  // Thermodynamics
  { id: "f20", name: "Ideal gas law", cat: "Thermodynamics", tex: "PV = nRT", desc: "Equation of state relating pressure, volume, amount and temperature of an ideal gas." },
  { id: "f21", name: "Specific heat", cat: "Thermodynamics", tex: "Q = mc\\,\\Delta T", desc: "Heat needed to change the temperature of mass m with specific heat capacity c." },
  { id: "f22", name: "First law of thermodynamics", cat: "Thermodynamics", tex: "\\Delta U = Q - W", desc: "Energy conservation: change in internal energy equals heat in minus work out." },
  { id: "f23", name: "Carnot efficiency", cat: "Thermodynamics", tex: "\\eta = 1 - \\dfrac{T_c}{T_h}", desc: "Maximum possible efficiency of a heat engine between two reservoirs." },
  { id: "f24", name: "Thermal expansion", cat: "Thermodynamics", tex: "\\Delta L = \\alpha L_0 \\Delta T", desc: "Linear growth of a material with temperature." },
  { id: "f25", name: "Stefan–Boltzmann law", cat: "Thermodynamics", tex: "P = \\sigma A T^4", desc: "Radiated power of a black body grows with the fourth power of temperature." },

  // Waves & Optics
  { id: "f26", name: "Wave equation", cat: "Waves & Optics", tex: "v = f\\lambda", desc: "Wave speed equals frequency times wavelength." },
  { id: "f27", name: "Snell's law", cat: "Waves & Optics", tex: "n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2", desc: "Refraction at the interface between two media." },
  { id: "f28", name: "Thin lens equation", cat: "Waves & Optics", tex: "\\dfrac{1}{f} = \\dfrac{1}{d_o} + \\dfrac{1}{d_i}", desc: "Relates focal length to object and image distances." },
  { id: "f29", name: "Double-slit interference", cat: "Waves & Optics", tex: "d\\sin\\theta = m\\lambda", desc: "Fringe maxima condition for coherent light through two slits." },
  { id: "f30", name: "Photon energy", cat: "Waves & Optics", tex: "E = hf = \\dfrac{hc}{\\lambda}", desc: "Energy of a photon is proportional to its frequency." },
  { id: "f31", name: "Doppler effect", cat: "Waves & Optics", tex: "f' = f\\,\\dfrac{v \\pm v_o}{v \\mp v_s}", desc: "Observed frequency shift due to relative motion of source and observer." },

  // Fluids
  { id: "f32", name: "Pressure", cat: "Fluids", tex: "P = \\dfrac{F}{A}", desc: "Force distributed over an area." },
  { id: "f33", name: "Hydrostatic pressure", cat: "Fluids", tex: "P = P_0 + \\rho g h", desc: "Pressure at depth h in a fluid of density ρ." },
  { id: "f34", name: "Archimedes' principle", cat: "Fluids", tex: "F_b = \\rho V g", desc: "Buoyant force equals the weight of displaced fluid." },
  { id: "f35", name: "Continuity equation", cat: "Fluids", tex: "A_1 v_1 = A_2 v_2", desc: "Conservation of volumetric flow for an incompressible fluid." },
  { id: "f36", name: "Bernoulli's equation", cat: "Fluids", tex: "P + \\tfrac{1}{2}\\rho v^2 + \\rho g h = \\text{const}", desc: "Energy conservation along a streamline for ideal flow." },
  { id: "f37", name: "Stokes' drag", cat: "Fluids", tex: "F_d = 6\\pi\\eta r v", desc: "Viscous drag on a small sphere at low Reynolds number." },

  // Modern Physics
  { id: "f38", name: "Mass–energy equivalence", cat: "Modern Physics", tex: "E = mc^2", desc: "Mass is a concentrated form of energy." },
  { id: "f39", name: "Time dilation", cat: "Modern Physics", tex: "\\Delta t = \\gamma\\,\\Delta t_0, \\quad \\gamma = \\dfrac{1}{\\sqrt{1 - v^2/c^2}}", desc: "Moving clocks run slower by the Lorentz factor." },
  { id: "f40", name: "de Broglie wavelength", cat: "Modern Physics", tex: "\\lambda = \\dfrac{h}{p}", desc: "Every particle has an associated matter-wave." },
  { id: "f41", name: "Photoelectric effect", cat: "Modern Physics", tex: "K_{max} = hf - \\phi", desc: "Maximum kinetic energy of electrons ejected by light." },
  { id: "f42", name: "Hydrogen energy levels", cat: "Modern Physics", tex: "E_n = -\\dfrac{13.6\\ \\text{eV}}{n^2}", desc: "Quantised energy states of the Bohr hydrogen atom." },
];
