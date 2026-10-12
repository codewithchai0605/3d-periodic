import { ELEMENTS } from '../data/elements.js'
import { CATEGORIES, CAT_BY_ID } from '../data/categories.js'
import { MOLS } from './chem.js'

export const LEVELS = [
  { id: 'molecules', label: 'Molecules (NEET / JEE)', blurb: 'Shapes, hybridisation, bond angles, lone pairs and polarity of 70+ molecules and ions.', molecules: true },
  { id: 'starter',  label: 'Starter',  blurb: 'Hydrogen to krypton (1–36). The first four periods.', max: 36 },
  { id: 'explorer', label: 'Explorer', blurb: 'Hydrogen to radon (1–86). Everything that occurs in nature.', max: 86 },
  { id: 'expert',   label: 'Expert',   blurb: 'All 118 elements, including the lab-made giants.', max: 118 },
]

const rand = (n) => Math.floor(Math.random() * n)
const shuffle = (a) => {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}
const pick = (arr, n, exclude = () => false) => shuffle(arr.filter((x) => !exclude(x))).slice(0, n)

function maskFact(el) {
  return el.fact
    .replace(new RegExp(`${el.name}\\w*`, 'gi'), '▢▢▢▢')
    .replace(new RegExp(`\\b${el.symbol}\\b`, 'g'), '▢▢')
}

function opts(correct, wrongs) {
  return shuffle([{ label: correct, correct: true }, ...wrongs.map((label) => ({ label, correct: false }))])
}

const TYPES = {
  symbol: (pool, el) => ({
    prompt: `What is the chemical symbol for ${el.name}?`,
    options: opts(el.symbol, pick(pool, 3, (x) => x.z === el.z).map((x) => x.symbol)),
    kind: 'symbol',
  }),
  name: (pool, el) => ({
    prompt: `Which element has the symbol ${el.symbol}?`,
    options: opts(el.name, pick(pool, 3, (x) => x.z === el.z).map((x) => x.name)),
    kind: 'symbol',
  }),
  number: (pool, el) => {
    const set = new Set()
    while (set.size < 3) {
      const d = (rand(8) + 1) * (Math.random() < 0.5 ? -1 : 1)
      const v = el.z + d
      if (v >= 1 && v <= 118 && v !== el.z) set.add(v)
    }
    return { prompt: `What is the atomic number of ${el.name}?`, options: opts(String(el.z), [...set].map(String)), kind: 'number' }
  },
  family: (pool, el) => ({
    prompt: `Which family does ${el.name} belong to?`,
    options: opts(CAT_BY_ID[el.category].label, pick(CATEGORIES, 3, (c) => c.id === el.category).map((c) => c.label)),
    kind: 'family',
  }),
  fact: (pool, el) => ({
    prompt: 'Which element is this?',
    quote: maskFact(el),
    options: opts(el.name, pick(pool, 3, (x) => x.z === el.z).map((x) => x.name)),
    kind: 'fact',
  }),
  state: (pool, el) => ({
    prompt: `At room temperature (25 °C), ${el.name} is a…`,
    options: shuffle(['Solid', 'Liquid', 'Gas']).map((label) => ({ label, correct: label.toLowerCase() === el.phase })),
    kind: 'state',
  }),
  use: (pool, el) => {
    const u = el.uses[rand(el.uses.length)]
    return {
      prompt: `Which element is used for \u201c${u.replace(/ \(.*\)/, '')}\u201d?`,
      options: opts(el.name, pick(pool, 3, (x) => x.z === el.z || x.uses.includes(u)).map((x) => x.name)),
      kind: 'use',
    }
  },
  group: (pool, el) => {
    const set = new Set()
    while (set.size < 3) {
      const g = rand(18) + 1
      if (g !== el.group) set.add(g)
    }
    return { prompt: `Which group (column) is ${el.name} in?`, options: opts(`Group ${el.group}`, [...set].map((g) => `Group ${g}`)), kind: 'group' }
  },
}

function eligible(type, el) {
  if (type === 'state') return el.phase !== 'unknown'
  if (type === 'group') return el.group != null
  if (type === 'use') return !el.uses.some((u) => u.startsWith('Scientific') || u.startsWith('Research')) && el.z < 104
  if (type === 'family') return !el.predictedChem
  return true
}

export function buildQuiz(levelId, count = 10) {
  const level = LEVELS.find((l) => l.id === levelId)
  if (level.molecules) return buildMoleculeQuiz(count)
  const pool = ELEMENTS.filter((e) => e.z <= level.max)
  const types = Object.keys(TYPES)
  const chosen = new Set()
  const out = []
  let guard = 0
  while (out.length < count && guard++ < 400) {
    const el = pool[rand(pool.length)]
    if (chosen.has(el.z)) continue
    const type = types[rand(types.length)]
    if (!eligible(type, el)) continue
    chosen.add(el.z)
    out.push({ ...TYPES[type](pool, el), type, el })
  }
  return out
}


/* ----------------------------- molecule questions (NEET / JEE) ------------------------------------ */
const SIMPLE_ANGLE = /^[≈<]?\s?\d+(\.\d+)?°$/
const SHAPED = MOLS.filter((m) => ['vsepr', 'ions', 'acids', 'coord'].includes(m.topic) && m.kind !== 'lattice' && m.shape && m.shape.length < 36 && !m.id.startsWith('cis_') && !m.id.startsWith('trans'))

const uniq = (arr) => [...new Set(arr)]
function distract(correct, pool, n = 3) {
  const others = uniq(pool).filter((x) => x !== correct)
  return shuffle(others).slice(0, n)
}
const withMol = (m, q) => ({ ...q, mol: m, type: q.kind })

const MOL_TYPES = {
  shape: (m) => {
    const label = m.shape.replace(/ \(.*\)/, '')
    const pool = SHAPED.map((x) => x.shape.replace(/ \(.*\)/, ''))
    return withMol(m, { prompt: `What is the shape of ${m.formula}?`, options: opts(label, distract(label, pool)), kind: 'shape' })
  },
  hybrid: (m) => {
    const clean = (h) => h.replace(/ \(.*\)/, '')
    const label = clean(m.hybrid)
    const pool = SHAPED.filter((x) => /^(d?s?p)/.test(x.hybrid) && /^[sd]p/.test(x.hybrid)).map((x) => clean(x.hybrid))
    return withMol(m, { prompt: `What is the hybridisation of the central atom in ${m.formula}?`, options: opts(label, distract(label, pool)), kind: 'hybrid' })
  },
  angle: (m) => {
    const pool = SHAPED.filter((x) => x.angle && SIMPLE_ANGLE.test(x.angle)).map((x) => x.angle)
    return withMol(m, { prompt: `What is the bond angle in ${m.formula}?`, options: opts(m.angle, distract(m.angle, pool)), kind: 'angle' })
  },
  lone: (m) => {
    const label = String(m.lone)
    return withMol(m, { prompt: `How many lone pairs are on the central atom of ${m.formula}?`, options: opts(label, distract(label, ['0', '1', '2', '3', '0', '1', '2'])), kind: 'lone' })
  },
  polar: (m) => {
    const want = m.polar
    const pool = SHAPED.filter((x) => x.polar === !want && x.kind === 'molecule' && !x.id.startsWith('h2') )
    const wrong = shuffle(pool).slice(0, 3).map((x) => x.formula)
    return withMol(m, { prompt: want ? 'Which of these molecules has a NON-ZERO dipole moment (is polar)?' : 'Which of these molecules is NON-POLAR (zero dipole moment)?', options: opts(m.formula, wrong), kind: 'polar' })
  },
}
const MOL_ELIGIBLE = {
  shape: (m) => true,
  hybrid: (m) => /^[sd]p/.test(m.hybrid ?? ''),
  angle: (m) => SIMPLE_ANGLE.test(m.angle ?? ''),
  lone: (m) => m.lone != null && m.lone <= 3 && m.topic !== 'coord',
  polar: (m) => m.kind === 'molecule' && m.polar != null && !m.id.startsWith('h2') && m.topic === 'vsepr',
}

export function buildMoleculeQuiz(count = 10) {
  const out = []
  const used = new Set()
  const types = Object.keys(MOL_TYPES)
  let guard = 0
  while (out.length < count && guard++ < 500) {
    const m = SHAPED[rand(SHAPED.length)]
    if (used.has(m.id)) continue
    const t = types[rand(types.length)]
    if (!MOL_ELIGIBLE[t](m)) continue
    const q = MOL_TYPES[t](m)
    if (q.options.length < 2 || new Set(q.options.map((o) => o.label)).size !== q.options.length) continue
    used.add(m.id)
    out.push(q)
  }
  return out
}
