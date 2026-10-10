import { CAT_BY_ID, BLOCK_BY_ID, ERAS, STATES } from '../data/categories.js'
import { ELEMENTS } from '../data/elements.js'
import { stateAt } from './phase.js'

export const NO_DATA = '#2b3148'

const RAMP = ['#4b3fb8', '#2b8fd6', '#2fc2a2', '#a6dc5a', '#f6d84c', '#ff8a3d']

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const RAMP_RGB = RAMP.map(hexToRgb)

export function rampColor(t) {
  const x = Math.min(1, Math.max(0, t)) * (RAMP_RGB.length - 1)
  const i = Math.min(RAMP_RGB.length - 2, Math.floor(x))
  const f = x - i
  const a = RAMP_RGB[i], b = RAMP_RGB[i + 1]
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}
export const RAMP_CSS = `linear-gradient(90deg, ${RAMP.join(', ')})`

/** Continuous modes: color + bar height come from a normalised value. */
const CONTINUOUS = [
  { id: 'en', label: 'Electronegativity', unit: '', get: (e) => e.en, fmt: (v) => v.toFixed(2),
    blurb: 'How strongly an atom pulls on shared electrons. It rises left to right across a period and falls down a group, so fluorine tops the table at 3.98.' },
  { id: 'ie', label: 'Ionisation energy', unit: 'eV', get: (e) => e.ie, fmt: (v) => v.toFixed(1),
    blurb: 'Energy needed to pull the outermost electron off an atom. It follows the same trend as electronegativity: helium is highest, caesium and francium are lowest.' },
  { id: 'density', label: 'Density', unit: 'g/cm³', log: true, get: (e) => e.density, fmt: (v) => (v < 0.01 ? v.toExponential(1) : v < 10 ? v.toFixed(2) : v.toFixed(1)),
    blurb: 'Mass per unit volume, on a log scale. Osmium and iridium are the densest; the gases at the right are around 10,000 times lighter.' },
  { id: 'melt', label: 'Melting point', unit: 'K', get: (e) => e.melt, fmt: (v) => Math.round(v).toLocaleString(),
    blurb: 'Tungsten and carbon take the most heat to melt. Hydrogen melts at just 14 K (−259 °C). Helium has no melting point at normal pressure.' },
  { id: 'boil', label: 'Boiling point', unit: 'K', get: (e) => e.boil, fmt: (v) => Math.round(v).toLocaleString(),
    blurb: 'Tungsten and rhenium boil hottest, above 5,800 K, nearly as hot as the surface of the Sun. Helium boils at only 4 K.' },
  { id: 'crust', label: 'Abundance in Earth\u2019s crust', unit: 'ppm', log: true, get: (e) => e.crust,
    fmt: (v) => (v >= 100 ? Math.round(v).toLocaleString() : v >= 0.1 ? +v.toPrecision(2) : v.toExponential(0)),
    blurb: 'Parts per million by mass, on a log scale. Oxygen and silicon alone make up about three-quarters of the crust. Raise by value and look for the zigzag: even-numbered elements are more common than their odd neighbours.' },
  { id: 'mass', label: 'Atomic mass', unit: 'u', get: (e) => e.mass, fmt: (v) => v.toFixed(2),
    blurb: 'The average mass of an atom in atomic mass units. It climbs steadily with atomic number, with a few famous swaps (Ar/K, Co/Ni, Te/I).' },
]

for (const m of CONTINUOUS) {
  m.kind = 'continuous'
  const vals = ELEMENTS.map(m.get).filter((v) => v != null && v > 0)
  const tf = m.log ? Math.log10 : (v) => v
  m.min = Math.min(...vals)
  m.max = Math.max(...vals)
  m.norm = (v) => (v == null || v <= 0 ? null : (tf(v) - tf(m.min)) / (tf(m.max) - tf(m.min)))
}

export const MODES = [
  { id: 'category', label: 'Category', kind: 'discrete', blurb: 'Elements with similar chemistry are grouped by colour. Click a swatch in the key to isolate that family.' },
  { id: 'state', label: 'State of matter', kind: 'discrete', blurb: 'Drag the temperature slider to melt and boil the periodic table. Elements with no measured melting or boiling point stay grey.' },
  { id: 'block', label: 'Orbital block', kind: 'discrete', blurb: 'Which type of orbital receives each element\u2019s last electron. This is why the table has its odd shape.' },
  { id: 'era', label: 'Discovery era', kind: 'discrete', blurb: 'When each element was first isolated or recognised. Everything beyond uranium was made by people.' },
  ...CONTINUOUS,
]
export const MODE_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m]))

/** @returns {{color: string, t: number|null, key: string}} key identifies the discrete bucket (for legend filtering) */
export function styleFor(mode, el, ctx) {
  const m = MODE_BY_ID[mode]
  switch (mode) {
    case 'category': return { color: CAT_BY_ID[el.category].color, t: null, key: el.category }
    case 'block': return { color: BLOCK_BY_ID[el.block].color, t: null, key: el.block }
    case 'state': {
      const s = stateAt(el, ctx.temp)
      return { color: STATES.find((x) => x.id === s).color, t: null, key: s }
    }
    case 'era': {
      const era = ERAS.find((x) => x.test(el.year))
      return { color: era.color, t: null, key: era.id }
    }
    default: {
      const t = m.norm(m.get(el))
      return { color: t == null ? NO_DATA : rampColor(t), t, key: t == null ? 'none' : 'val' }
    }
  }
}

/** Perceived luminance 0..1 of a hex colour. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
