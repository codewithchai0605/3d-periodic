import { RAW } from './raw.js'
import { electronConfig } from '../lib/config.js'
import { stateAt } from '../lib/phase.js'
import { CRUST } from './extra.js'
import { CATEGORIES } from './categories.js'

const PERIOD_END = [2, 10, 18, 36, 54, 86, 118]
const NOBLE = new Set([2, 10, 18, 36, 54, 86, 118])
const ALKALI = new Set([3, 11, 19, 37, 55, 87])
const ALKALINE = new Set([4, 12, 20, 38, 56, 88])
const METALLOID = new Set([5, 14, 32, 33, 51, 52])
const NONMETAL = new Set([1, 6, 7, 8, 15, 16, 34])
const HALOGEN = new Set([9, 17, 35, 53, 85, 117])
const POST = new Set([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116])
const BRACKET_MASS = new Set([43, 61, ...Array.from({ length: 6 }, (_, i) => 84 + i), ...Array.from({ length: 26 }, (_, i) => 93 + i)])

function categoryOf(z) {
  if (NOBLE.has(z)) return 'noble'
  if (ALKALI.has(z)) return 'alkali'
  if (ALKALINE.has(z)) return 'alkaline'
  if (METALLOID.has(z)) return 'metalloid'
  if (NONMETAL.has(z)) return 'nonmetal'
  if (HALOGEN.has(z)) return 'halogen'
  if (POST.has(z)) return 'post'
  if (z >= 57 && z <= 71) return 'lanthanide'
  if (z >= 89 && z <= 103) return 'actinide'
  return 'transition'
}

/** Where an element sits in the standard 18-column table. */
function placeOf(z) {
  const period = PERIOD_END.findIndex((e) => z <= e) + 1
  const start = period === 1 ? 1 : PERIOD_END[period - 2] + 1
  const idx = z - start
  let col, row = period, fblock = false
  if (period === 1) col = idx === 0 ? 1 : 18
  else if (period <= 3) col = idx < 2 ? idx + 1 : 13 + (idx - 2)
  else if (period <= 5) col = idx + 1
  else if (idx < 2) col = idx + 1
  else if (idx < 17) { col = 3 + (idx - 2); row = period === 6 ? 9 : 10; fblock = true }
  else col = 4 + (idx - 17)
  return { period, col, row, fblock }
}

export const ELEMENTS = RAW.map((r) => {
  const [z, symbol, name, mass, melt, boil, density, en, ie, year, by, fact, uses] = r
  const place = placeOf(z)
  const category = categoryOf(z)
  const group = place.fblock ? null : place.col
  const block = place.fblock ? 'f' : place.col <= 2 || z === 2 ? 's' : place.col >= 13 ? 'p' : 'd'
  const cfg = electronConfig(z)
  const el = {
    z, symbol, name, mass, melt, boil, density, en, ie, year, by, fact,
    uses: uses.split('|'),
    category, group, block, ...place,
    bracketMass: BRACKET_MASS.has(z),
    radioactive: z === 43 || z === 61 || z >= 84,
    estimated: z === 85 || z === 87 || z >= 99,
    predictedChem: z >= 109,
    cfg,
    crust: CRUST[z] ?? null,
    neutrons: Math.max(0, Math.round(mass) - z),
    shells: cfg.shells,
  }
  el.phase = stateAt(el, 298)
  return el
})

export const byZ = (z) => ELEMENTS[z - 1]
export const bySymbol = Object.fromEntries(ELEMENTS.map((e) => [e.symbol.toLowerCase(), e]))
export const byName = Object.fromEntries(ELEMENTS.map((e) => [e.name.toLowerCase(), e]))

const METALS = new Set(['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'])
const NONMETALS = new Set(['nonmetal', 'halogen', 'noble'])
const isSynthetic = (e) => e.z === 43 || e.z === 61 || e.z >= 93

/** Word searches such as "radioactive", "gas" or "noble" that match whole groups of elements. */
const FACETS = [
  [['radioactive'], (e) => e.radioactive],
  [['synthetic', 'man-made', 'manmade', 'lab-made', 'artificial'], isSynthetic],
  [['gas', 'gases'], (e) => e.phase === 'gas'],
  [['liquid', 'liquids'], (e) => e.phase === 'liquid'],
  [['solid', 'solids'], (e) => e.phase === 'solid'],
  [['metal', 'metals'], (e) => METALS.has(e.category)],
  [['nonmetal', 'non-metal', 'nonmetals'], (e) => NONMETALS.has(e.category)],
  [['ancient', 'antiquity'], (e) => e.year === 0],
  [['rare earth', 'rare-earth'], (e) => e.category === 'lanthanide' || e.z === 21 || e.z === 39],
  [['s-block', 'p-block', 'd-block', 'f-block'], null], // handled below
]

export function searchElements(q) {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const num = /^\d+$/.test(s) ? +s : null
  const facet = FACETS.find(([keys]) => keys.includes(s))
  const blockMatch = /^([spdf])-?block$/.exec(s)
  const catIds = s.length >= 3 ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(s)).map((c) => c.id) : []
  const scored = []
  for (const e of ELEMENTS) {
    const name = e.name.toLowerCase()
    const sym = e.symbol.toLowerCase()
    let score = 0
    if (num != null && e.z === num) score = 100
    else if (sym === s) score = 95
    else if (name === s) score = 90
    else if (name.startsWith(s)) score = 70
    else if (sym.startsWith(s) && s.length > 1) score = 60
    else if (name.includes(s)) score = 40
    else if (blockMatch && e.block === blockMatch[1]) score = 32
    else if (facet?.[1] && facet[1](e)) score = 32
    else if (catIds.includes(e.category)) score = 30
    else if (s.length >= 4 && e.by.toLowerCase().includes(s)) score = 20
    else if (s.length >= 4 && e.uses.some((u) => u.toLowerCase().includes(s))) score = 14
    else if (s.length >= 4 && e.fact.toLowerCase().includes(s)) score = 8
    if (score) scored.push([score, e])
  }
  const top = Math.max(0, ...scored.map((x) => x[0]))
  // a group search ("noble", "gas") should return the group, not stray mentions in fun facts
  const keep = top >= 30 && top < 40 ? scored.filter((x) => x[0] >= 30) : scored
  return keep.sort((a, b) => b[0] - a[0] || a[1].z - b[1].z).map((x) => x[1])
}
