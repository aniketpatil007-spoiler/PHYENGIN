/** Unit catalog. Convention: base = value * factor + (offset ?? 0). */

export interface UnitDef {
  id: string;
  label: string;
  symbol: string;
  factor: number;
  offset?: number;
}

export interface UnitCategory {
  id: string;
  name: string;
  baseLabel: string;
  baseSymbol: string;
  units: UnitDef[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length", name: "Length", baseLabel: "metre", baseSymbol: "m",
    units: [
      { id: "nm", label: "nanometre", symbol: "nm", factor: 1e-9 },
      { id: "um", label: "micrometre", symbol: "µm", factor: 1e-6 },
      { id: "mm", label: "millimetre", symbol: "mm", factor: 1e-3 },
      { id: "cm", label: "centimetre", symbol: "cm", factor: 1e-2 },
      { id: "m", label: "metre", symbol: "m", factor: 1 },
      { id: "km", label: "kilometre", symbol: "km", factor: 1e3 },
      { id: "in", label: "inch", symbol: "in", factor: 0.0254 },
      { id: "ft", label: "foot", symbol: "ft", factor: 0.3048 },
      { id: "yd", label: "yard", symbol: "yd", factor: 0.9144 },
      { id: "mi", label: "mile", symbol: "mi", factor: 1609.344 },
      { id: "nmi", label: "nautical mile", symbol: "nmi", factor: 1852 },
      { id: "au", label: "astronomical unit", symbol: "AU", factor: 1.495978707e11 },
      { id: "ly", label: "light-year", symbol: "ly", factor: 9.4607304725808e15 },
    ],
  },
  {
    id: "mass", name: "Mass", baseLabel: "kilogram", baseSymbol: "kg",
    units: [
      { id: "ug", label: "microgram", symbol: "µg", factor: 1e-9 },
      { id: "mg", label: "milligram", symbol: "mg", factor: 1e-6 },
      { id: "g", label: "gram", symbol: "g", factor: 1e-3 },
      { id: "kg", label: "kilogram", symbol: "kg", factor: 1 },
      { id: "t", label: "tonne", symbol: "t", factor: 1e3 },
      { id: "oz", label: "ounce", symbol: "oz", factor: 0.028349523125 },
      { id: "lb", label: "pound", symbol: "lb", factor: 0.45359237 },
      { id: "st", label: "stone", symbol: "st", factor: 6.35029318 },
    ],
  },
  {
    id: "time", name: "Time", baseLabel: "second", baseSymbol: "s",
    units: [
      { id: "ns", label: "nanosecond", symbol: "ns", factor: 1e-9 },
      { id: "us", label: "microsecond", symbol: "µs", factor: 1e-6 },
      { id: "ms", label: "millisecond", symbol: "ms", factor: 1e-3 },
      { id: "s", label: "second", symbol: "s", factor: 1 },
      { id: "min", label: "minute", symbol: "min", factor: 60 },
      { id: "h", label: "hour", symbol: "h", factor: 3600 },
      { id: "d", label: "day", symbol: "d", factor: 86400 },
      { id: "wk", label: "week", symbol: "wk", factor: 604800 },
      { id: "yr", label: "year (Julian)", symbol: "yr", factor: 31557600 },
    ],
  },
  {
    id: "temperature", name: "Temperature", baseLabel: "kelvin", baseSymbol: "K",
    units: [
      { id: "K", label: "kelvin", symbol: "K", factor: 1 },
      { id: "C", label: "celsius", symbol: "°C", factor: 1, offset: 273.15 },
      { id: "F", label: "fahrenheit", symbol: "°F", factor: 5 / 9, offset: 255.3722222222222 },
      { id: "R", label: "rankine", symbol: "°R", factor: 5 / 9 },
    ],
  },
  {
    id: "area", name: "Area", baseLabel: "square metre", baseSymbol: "m²",
    units: [
      { id: "mm2", label: "square millimetre", symbol: "mm²", factor: 1e-6 },
      { id: "cm2", label: "square centimetre", symbol: "cm²", factor: 1e-4 },
      { id: "m2", label: "square metre", symbol: "m²", factor: 1 },
      { id: "ha", label: "hectare", symbol: "ha", factor: 1e4 },
      { id: "km2", label: "square kilometre", symbol: "km²", factor: 1e6 },
      { id: "in2", label: "square inch", symbol: "in²", factor: 0.00064516 },
      { id: "ft2", label: "square foot", symbol: "ft²", factor: 0.09290304 },
      { id: "ac", label: "acre", symbol: "ac", factor: 4046.8564224 },
    ],
  },
  {
    id: "volume", name: "Volume", baseLabel: "cubic metre", baseSymbol: "m³",
    units: [
      { id: "mL", label: "millilitre", symbol: "mL", factor: 1e-6 },
      { id: "cm3", label: "cubic centimetre", symbol: "cm³", factor: 1e-6 },
      { id: "L", label: "litre", symbol: "L", factor: 1e-3 },
      { id: "m3", label: "cubic metre", symbol: "m³", factor: 1 },
      { id: "in3", label: "cubic inch", symbol: "in³", factor: 1.6387064e-5 },
      { id: "ft3", label: "cubic foot", symbol: "ft³", factor: 0.028316846592 },
      { id: "gal", label: "gallon (US)", symbol: "gal", factor: 0.003785411784 },
      { id: "qt", label: "quart (US)", symbol: "qt", factor: 0.000946352946 },
    ],
  },
  {
    id: "speed", name: "Speed", baseLabel: "metre per second", baseSymbol: "m/s",
    units: [
      { id: "mps", label: "metre / second", symbol: "m/s", factor: 1 },
      { id: "kmh", label: "kilometre / hour", symbol: "km/h", factor: 1 / 3.6 },
      { id: "mph", label: "mile / hour", symbol: "mph", factor: 0.44704 },
      { id: "fts", label: "foot / second", symbol: "ft/s", factor: 0.3048 },
      { id: "kn", label: "knot", symbol: "kn", factor: 0.5144444444444445 },
      { id: "ma", label: "mach (sea level)", symbol: "Ma", factor: 343 },
      { id: "c", label: "speed of light", symbol: "c", factor: 299792458 },
    ],
  },
  {
    id: "acceleration", name: "Acceleration", baseLabel: "m/s²", baseSymbol: "m/s²",
    units: [
      { id: "mps2", label: "metre / second²", symbol: "m/s²", factor: 1 },
      { id: "g0", label: "standard gravity", symbol: "g₀", factor: 9.80665 },
      { id: "fts2", label: "foot / second²", symbol: "ft/s²", factor: 0.3048 },
      { id: "gal", label: "gal", symbol: "Gal", factor: 0.01 },
    ],
  },
  {
    id: "force", name: "Force", baseLabel: "newton", baseSymbol: "N",
    units: [
      { id: "mN", label: "millinewton", symbol: "mN", factor: 1e-3 },
      { id: "N", label: "newton", symbol: "N", factor: 1 },
      { id: "kN", label: "kilonewton", symbol: "kN", factor: 1e3 },
      { id: "MN", label: "meganewton", symbol: "MN", factor: 1e6 },
      { id: "dyn", label: "dyne", symbol: "dyn", factor: 1e-5 },
      { id: "kgf", label: "kilogram-force", symbol: "kgf", factor: 9.80665 },
      { id: "lbf", label: "pound-force", symbol: "lbf", factor: 4.4482216152605 },
      { id: "ozf", label: "ounce-force", symbol: "ozf", factor: 0.27801385095378125 },
    ],
  },
  {
    id: "pressure", name: "Pressure", baseLabel: "pascal", baseSymbol: "Pa",
    units: [
      { id: "Pa", label: "pascal", symbol: "Pa", factor: 1 },
      { id: "kPa", label: "kilopascal", symbol: "kPa", factor: 1e3 },
      { id: "MPa", label: "megapascal", symbol: "MPa", factor: 1e6 },
      { id: "GPa", label: "gigapascal", symbol: "GPa", factor: 1e9 },
      { id: "mbar", label: "millibar", symbol: "mbar", factor: 100 },
      { id: "bar", label: "bar", symbol: "bar", factor: 1e5 },
      { id: "atm", label: "atmosphere", symbol: "atm", factor: 101325 },
      { id: "torr", label: "torr / mmHg", symbol: "Torr", factor: 133.32236842105263 },
      { id: "psi", label: "pound / sq inch", symbol: "psi", factor: 6894.757293168 },
      { id: "inHg", label: "inch of mercury", symbol: "inHg", factor: 3386.3881578947363 },
    ],
  },
  {
    id: "energy", name: "Energy & Work", baseLabel: "joule", baseSymbol: "J",
    units: [
      { id: "J", label: "joule", symbol: "J", factor: 1 },
      { id: "kJ", label: "kilojoule", symbol: "kJ", factor: 1e3 },
      { id: "MJ", label: "megajoule", symbol: "MJ", factor: 1e6 },
      { id: "GJ", label: "gigajoule", symbol: "GJ", factor: 1e9 },
      { id: "Wh", label: "watt-hour", symbol: "Wh", factor: 3600 },
      { id: "kWh", label: "kilowatt-hour", symbol: "kWh", factor: 3.6e6 },
      { id: "cal", label: "calorie", symbol: "cal", factor: 4.184 },
      { id: "kcal", label: "kilocalorie", symbol: "kcal", factor: 4184 },
      { id: "BTU", label: "british thermal unit", symbol: "BTU", factor: 1055.05585262 },
      { id: "eV", label: "electronvolt", symbol: "eV", factor: 1.602176634e-19 },
      { id: "ftlbf", label: "foot-pound", symbol: "ft·lbf", factor: 1.3558179483314 },
    ],
  },
  {
    id: "power", name: "Power", baseLabel: "watt", baseSymbol: "W",
    units: [
      { id: "mW", label: "milliwatt", symbol: "mW", factor: 1e-3 },
      { id: "W", label: "watt", symbol: "W", factor: 1 },
      { id: "kW", label: "kilowatt", symbol: "kW", factor: 1e3 },
      { id: "MW", label: "megawatt", symbol: "MW", factor: 1e6 },
      { id: "hp", label: "horsepower (mech)", symbol: "hp", factor: 745.6998715822701 },
      { id: "hpm", label: "horsepower (metric)", symbol: "PS", factor: 735.49875 },
      { id: "ftlbfs", label: "foot-pound / second", symbol: "ft·lbf/s", factor: 1.3558179483314 },
    ],
  },
  {
    id: "angle", name: "Angle", baseLabel: "radian", baseSymbol: "rad",
    units: [
      { id: "rad", label: "radian", symbol: "rad", factor: 1 },
      { id: "mrad", label: "milliradian", symbol: "mrad", factor: 1e-3 },
      { id: "deg", label: "degree", symbol: "°", factor: Math.PI / 180 },
      { id: "arcmin", label: "arcminute", symbol: "′", factor: Math.PI / 10800 },
      { id: "arcsec", label: "arcsecond", symbol: "″", factor: Math.PI / 648000 },
      { id: "grad", label: "gradian", symbol: "gon", factor: Math.PI / 200 },
      { id: "rev", label: "revolution", symbol: "rev", factor: Math.PI * 2 },
    ],
  },
  {
    id: "frequency", name: "Frequency", baseLabel: "hertz", baseSymbol: "Hz",
    units: [
      { id: "mHz", label: "millihertz", symbol: "mHz", factor: 1e-3 },
      { id: "Hz", label: "hertz", symbol: "Hz", factor: 1 },
      { id: "kHz", label: "kilohertz", symbol: "kHz", factor: 1e3 },
      { id: "MHz", label: "megahertz", symbol: "MHz", factor: 1e6 },
      { id: "GHz", label: "gigahertz", symbol: "GHz", factor: 1e9 },
      { id: "rpm", label: "revolutions / minute", symbol: "rpm", factor: 1 / 60 },
    ],
  },
  {
    id: "voltage", name: "Voltage", baseLabel: "volt", baseSymbol: "V",
    units: [
      { id: "uV", label: "microvolt", symbol: "µV", factor: 1e-6 },
      { id: "mV", label: "millivolt", symbol: "mV", factor: 1e-3 },
      { id: "V", label: "volt", symbol: "V", factor: 1 },
      { id: "kV", label: "kilovolt", symbol: "kV", factor: 1e3 },
      { id: "MV", label: "megavolt", symbol: "MV", factor: 1e6 },
    ],
  },
  {
    id: "current", name: "Electric Current", baseLabel: "ampere", baseSymbol: "A",
    units: [
      { id: "uA", label: "microampere", symbol: "µA", factor: 1e-6 },
      { id: "mA", label: "milliampere", symbol: "mA", factor: 1e-3 },
      { id: "A", label: "ampere", symbol: "A", factor: 1 },
      { id: "kA", label: "kiloampere", symbol: "kA", factor: 1e3 },
    ],
  },
  {
    id: "resistance", name: "Resistance", baseLabel: "ohm", baseSymbol: "Ω",
    units: [
      { id: "mO", label: "milliohm", symbol: "mΩ", factor: 1e-3 },
      { id: "O", label: "ohm", symbol: "Ω", factor: 1 },
      { id: "kO", label: "kilohm", symbol: "kΩ", factor: 1e3 },
      { id: "MO", label: "megohm", symbol: "MΩ", factor: 1e6 },
      { id: "GO", label: "gigohm", symbol: "GΩ", factor: 1e9 },
    ],
  },
  {
    id: "charge", name: "Electric Charge", baseLabel: "coulomb", baseSymbol: "C",
    units: [
      { id: "nC", label: "nanocoulomb", symbol: "nC", factor: 1e-9 },
      { id: "uC", label: "microcoulomb", symbol: "µC", factor: 1e-6 },
      { id: "mC", label: "millicoulomb", symbol: "mC", factor: 1e-3 },
      { id: "C", label: "coulomb", symbol: "C", factor: 1 },
      { id: "mAh", label: "milliampere-hour", symbol: "mAh", factor: 3.6 },
      { id: "Ah", label: "ampere-hour", symbol: "Ah", factor: 3600 },
    ],
  },
  {
    id: "capacitance", name: "Capacitance", baseLabel: "farad", baseSymbol: "F",
    units: [
      { id: "pF", label: "picofarad", symbol: "pF", factor: 1e-12 },
      { id: "nF", label: "nanofarad", symbol: "nF", factor: 1e-9 },
      { id: "uF", label: "microfarad", symbol: "µF", factor: 1e-6 },
      { id: "mF", label: "millifarad", symbol: "mF", factor: 1e-3 },
      { id: "F", label: "farad", symbol: "F", factor: 1 },
    ],
  },
  {
    id: "density", name: "Density", baseLabel: "kg/m³", baseSymbol: "kg/m³",
    units: [
      { id: "gL", label: "gram / litre", symbol: "g/L", factor: 1 },
      { id: "kgm3", label: "kilogram / m³", symbol: "kg/m³", factor: 1 },
      { id: "gcm3", label: "gram / cm³", symbol: "g/cm³", factor: 1000 },
      { id: "kgL", label: "kilogram / litre", symbol: "kg/L", factor: 1000 },
      { id: "lbft3", label: "pound / ft³", symbol: "lb/ft³", factor: 16.01846337396 },
    ],
  },
  {
    id: "torque", name: "Torque", baseLabel: "newton-metre", baseSymbol: "N·m",
    units: [
      { id: "Nm", label: "newton-metre", symbol: "N·m", factor: 1 },
      { id: "kNm", label: "kilonewton-metre", symbol: "kN·m", factor: 1e3 },
      { id: "lbfin", label: "pound-force inch", symbol: "lbf·in", factor: 0.1129848290276167 },
      { id: "lbfft", label: "pound-force foot", symbol: "lbf·ft", factor: 1.3558179483314 },
      { id: "kgfm", label: "kilogram-force metre", symbol: "kgf·m", factor: 9.80665 },
    ],
  },
  {
    id: "data", name: "Digital Storage", baseLabel: "bit", baseSymbol: "bit",
    units: [
      { id: "bit", label: "bit", symbol: "bit", factor: 1 },
      { id: "B", label: "byte", symbol: "B", factor: 8 },
      { id: "kbit", label: "kilobit", symbol: "kbit", factor: 1e3 },
      { id: "kB", label: "kilobyte", symbol: "kB", factor: 8e3 },
      { id: "Mbit", label: "megabit", symbol: "Mbit", factor: 1e6 },
      { id: "MB", label: "megabyte", symbol: "MB", factor: 8e6 },
      { id: "Gbit", label: "gigabit", symbol: "Gbit", factor: 1e9 },
      { id: "GB", label: "gigabyte", symbol: "GB", factor: 8e9 },
      { id: "TB", label: "terabyte", symbol: "TB", factor: 8e12 },
      { id: "KiB", label: "kibibyte", symbol: "KiB", factor: 8192 },
      { id: "MiB", label: "mebibyte", symbol: "MiB", factor: 8388608 },
      { id: "GiB", label: "gibibyte", symbol: "GiB", factor: 8589934592 },
      { id: "TiB", label: "tebibyte", symbol: "TiB", factor: 8796093022208 },
    ],
  },
];

export const categoryById = (id: string) =>
  UNIT_CATEGORIES.find((c) => c.id === id) ?? UNIT_CATEGORIES[0];

export const unitById = (cat: UnitCategory, id: string) =>
  cat.units.find((u) => u.id === id) ?? cat.units[0];

export function toBase(u: UnitDef, v: number): number {
  return v * u.factor + (u.offset ?? 0);
}

export function fromBase(u: UnitDef, base: number): number {
  return (base - (u.offset ?? 0)) / u.factor;
}

export function convert(from: UnitDef, to: UnitDef, v: number): number {
  return fromBase(to, toBase(from, v));
}

/** Presets used by the physics lab for kinds outside the converter catalog. */
export const EXTRA_PRESETS: Record<string, UnitDef[]> = {
  none: [{ id: "one", label: "dimensionless", symbol: "—", factor: 1 }],
  amount: [
    { id: "mol", label: "mole", symbol: "mol", factor: 1 },
    { id: "mmol", label: "millimole", symbol: "mmol", factor: 1e-3 },
    { id: "kmol", label: "kilomole", symbol: "kmol", factor: 1e3 },
  ],
  tempdiff: [
    { id: "K", label: "kelvin", symbol: "K", factor: 1 },
    { id: "C", label: "celsius", symbol: "°C", factor: 1 },
    { id: "F", label: "fahrenheit", symbol: "°F", factor: 5 / 9 },
  ],
  specificheat: [
    { id: "JkgK", label: "joule / kg·K", symbol: "J·kg⁻¹·K⁻¹", factor: 1 },
    { id: "kJkgK", label: "kilojoule / kg·K", symbol: "kJ·kg⁻¹·K⁻¹", factor: 1e3 },
    { id: "BTUlbF", label: "BTU / lb·°F", symbol: "BTU·lb⁻¹·°F⁻¹", factor: 4186.8 },
  ],
  springk: [
    { id: "Nm", label: "newton / metre", symbol: "N/m", factor: 1 },
    { id: "kNm", label: "kilonewton / metre", symbol: "kN/m", factor: 1e3 },
    { id: "Nmm", label: "newton / millimetre", symbol: "N/mm", factor: 1e3 },
    { id: "lbfin", label: "pound-force / inch", symbol: "lbf/in", factor: 175.1268352464764 },
  ],
};

export function getUnitPreset(kind: string): UnitDef[] {
  if (EXTRA_PRESETS[kind]) return EXTRA_PRESETS[kind];
  const cat = UNIT_CATEGORIES.find((c) => c.id === kind);
  return cat ? cat.units : EXTRA_PRESETS.none;
}
