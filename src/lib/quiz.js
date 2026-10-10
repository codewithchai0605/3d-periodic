import { ELEMENTS } from '../data/elements.js'
import { CATEGORIES, CAT_BY_ID } from '../data/categories.js'

export const LEVELS = [
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
