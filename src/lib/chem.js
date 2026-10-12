import data from '../data/molecules.json' with { type: 'json' }
import { ELEMENTS, bySymbol } from '../data/elements.js'

/* =========================================================================================
 * Library
 * ======================================================================================= */
export const TOPICS = data.topics
export const MOLS = data.molecules
export const MOL_BY_ID = Object.fromEntries(MOLS.map((m) => [m.id, m]))
export const TEMPLATES = data.templates

const SUB = '₀₁₂₃₄₅₆₇₈₉'
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
export const sub = (n) => String(n).split('').map((d) => SUB[+d]).join('')
export const supNum = (n) => String(n).split('').map((d) => SUP[+d]).join('')
const unsub = (s) => s.replace(/[₀-₉]/g, (c) => SUB.indexOf(c)).replace(/[⁰-⁹]/g, (c) => SUP.indexOf(c))

const gcd = (a, b) => (b ? gcd(b, a % b) : a)
const lcm = (a, b) => (a * b) / gcd(a, b)

/** Parse a plain formula ("Al2(SO4)3", also unicode subscripts) into {element: count}. */
export function parseFormula(str) {
  const s = unsub(str).replace(/[⁺⁻]/g, '').replace(/·.*/, '')
  let i = 0
  function group() {
    const out = {}
    while (i < s.length && s[i] !== ')') {
      if (s[i] === '(') {
        i++
        const inner = group()
        i++ // ')'
        let n = ''
        while (/\d/.test(s[i] ?? '')) n += s[i++]
        for (const [k, v] of Object.entries(inner)) out[k] = (out[k] || 0) + v * (n ? +n : 1)
      } else if (/[A-Z]/.test(s[i])) {
        let sym = s[i++]
        while (/[a-z]/.test(s[i] ?? '')) sym += s[i++]
        let n = ''
        while (/\d/.test(s[i] ?? '')) n += s[i++]
        out[sym] = (out[sym] || 0) + (n ? +n : 1)
      } else i++
    }
    return out
  }
  return group()
}

/** Hill-system key: C first, H second, then alphabetical (no C → all alphabetical). */
export function hill(counts) {
  const syms = Object.keys(counts).filter((k) => counts[k] > 0)
  const rest = syms.filter((s) => s !== 'C' && s !== 'H').sort()
  const order = syms.includes('C') ? ['C', ...(syms.includes('H') ? ['H'] : []), ...rest] : [...syms].sort()
  return order.map((s) => s + (counts[s] > 1 ? counts[s] : '')).join('')
}
export const prettyFormula = (counts) => hill(counts).replace(/\d+/g, (d) => sub(d))

const LATTICE_COMP = { nacl: { Na: 1, Cl: 1 }, cscl: { Cs: 1, Cl: 1 }, zns: { Zn: 1, S: 1 }, caf2: { Ca: 1, F: 2 }, na2o: { Na: 2, O: 1 } }

export function compositionOf(m) {
  if (m.kind === 'lattice') {
    if (LATTICE_COMP[m.id]) return LATTICE_COMP[m.id]
    const sym = m.atoms[0][0]
    return { [sym]: 1 }
  }
  const c = {}
  for (const a of m.atoms) c[a[0]] = (c[a[0]] || 0) + 1
  return c
}

for (const m of MOLS) {
  m.bonds ??= [] // the generator omits empty arrays
  m.lp ??= []
  m.notes ??= []
  m.comp = compositionOf(m)
  m.elements = Object.keys(m.comp)
  m.norm = unsub(m.formula).toLowerCase().replace(/[⁺⁻\s]/g, '').replace(/[–-]/g, '')
}

export const topicLabel = (id) => TOPICS.find((t) => t.id === id)?.label ?? id
export const molsByTopic = (id) => MOLS.filter((m) => m.topic === id)

/** Library structures that contain a given element (for the element panel). */
export function compoundsWith(sym) {
  return MOLS.filter((m) => m.elements.includes(sym) && !(m.kind === 'lattice' && m.elements.length === 1))
}

export function searchMolecules(q) {
  const s = q.trim().toLowerCase()
  if (!s) return MOLS
  const flat = unsub(s).replace(/[⁺⁻\s]/g, '')
  const scored = []
  for (const m of MOLS) {
    const name = m.name.toLowerCase()
    let sc = 0
    if (m.norm === flat) sc = 100
    else if (name === s) sc = 95
    else if (name.startsWith(s)) sc = 80
    else if (m.norm.startsWith(flat) && flat.length > 1) sc = 70
    else if (name.includes(s)) sc = 60
    else if ((m.aliases || []).some((a) => a.toLowerCase().includes(s))) sc = 55
    else if (m.norm.includes(flat) && flat.length > 2) sc = 40
    else if (s.length >= 4 && (m.shape || '').toLowerCase().includes(s)) sc = 35
    else if (s.length >= 4 && (m.hybrid || '').toLowerCase().includes(s)) sc = 35
    else if (s.length >= 4 && m.notes.some((n) => n.toLowerCase().includes(s))) sc = 20
    if (sc) scored.push([sc, m])
  }
  return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1])
}

/* =========================================================================================
 * Molecule measurements
 * ======================================================================================= */
const sv = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a) => Math.hypot(a[0], a[1], a[2])
const P = (m, i) => [m.atoms[i][1], m.atoms[i][2], m.atoms[i][3]]

export const distance = (m, i, j) => len(sv(P(m, i), P(m, j)))
export function angle(m, i, j, k) {
  const a = sv(P(m, i), P(m, j))
  const b = sv(P(m, k), P(m, j))
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b))))) * 180) / Math.PI
}
export function dihedral(m, i, j, k, l) {
  const b0 = sv(P(m, i), P(m, j))
  const b1 = sv(P(m, k), P(m, j))
  const b2 = sv(P(m, l), P(m, k))
  const n1 = len(b1)
  const u = b1.map((x) => x / n1)
  const v = b0.map((x, t) => x - dot(b0, u) * u[t])
  const w = b2.map((x, t) => x - dot(b2, u) * u[t])
  return (Math.atan2(dot(cross(u, v), w), dot(v, w)) * 180) / Math.PI
}

export function keyMeasure(m) {
  const k = m.key
  if (!k) return null
  if (k.angle) return { label: k.label, atoms: k.angle, value: angle(m, ...k.angle), unit: '°' }
  if (k.dihedral) return { label: k.label, atoms: k.dihedral, value: Math.abs(dihedral(m, ...k.dihedral)), unit: '°' }
  return { label: k.label, atoms: k.dist, value: distance(m, ...k.dist) * 100, unit: ' pm' }
}

/* =========================================================================================
 * Mixing atoms → compounds
 * ======================================================================================= */
const HIDDEN_IN_MIX = new Set(['ethane_eclipsed', 'butane_gauche', 'butane_eclipsed', 'cis_conh34cl2'])
const isMetal = (sym) => ['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'].includes(bySymbol[sym.toLowerCase()]?.category)

/** Standard states used to write balanced formation equations. */
const STANDARD = { H: 2, N: 2, O: 2, F: 2, Cl: 2, Br: 2, I: 2, P: 4, S: 8 }
const atomsIn = (n) => Object.values(n).reduce((a, b) => a + b, 0)

/** Common ionic charges used to predict ionic compounds. cations: first = most common. */
const CATION_Q = { Li: [1], Na: [1], K: [1], Rb: [1], Cs: [1], Be: [2], Mg: [2], Ca: [2], Sr: [2], Ba: [2], Al: [3], Zn: [2], Ag: [1], Cu: [2, 1], Fe: [3, 2], Pb: [2], Ni: [2], Co: [2], Mn: [2], Cr: [3], Sn: [2], Hg: [2] }
const ANION_Q = { F: 1, Cl: 1, Br: 1, I: 1, O: 2, S: 2, N: 3, P: 3 }
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

const nameOf = (sym) => ELEMENTS[bySymbol[sym.toLowerCase()].z - 1].name.toLowerCase()
const ANION_NAME = { F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide', O: 'oxide', S: 'sulfide', N: 'nitride', P: 'phosphide' }

function ionicPrediction(metal, q, nonmetal) {
  const p = ANION_Q[nonmetal]
  const g = gcd(q, p)
  const comp = { [metal]: p / g, [nonmetal]: q / g }
  const varies = (CATION_Q[metal] || []).length > 1
  return {
    comp,
    name: `${nameOf(metal)}${varies ? `(${ROMAN[q]})` : ''} ${ANION_NAME[nonmetal]}`,
    formula: `${metal}${comp[metal] > 1 ? sub(comp[metal]) : ''}${nonmetal}${comp[nonmetal] > 1 ? sub(comp[nonmetal]) : ''}`,
    q,
    p,
  }
}

/** Generic lattice model for an ionic compound (illustrative). */
export const IONIC_RADII = { Li: 0.76, Na: 1.02, K: 1.38, Rb: 1.52, Cs: 1.67, Mg: 0.72, Ca: 1.0, Sr: 1.18, Ba: 1.35, Al: 0.54, Zn: 0.74, Ag: 1.15, Cu: 0.73, Fe: 0.65, Pb: 1.19, Ni: 0.69, Co: 0.65, Mn: 0.67, Cr: 0.62, F: 1.33, Cl: 1.81, Br: 1.96, I: 2.2, O: 1.4, S: 1.84 }

/** Compounds known to crystallise in these simple structures (so the illustrative model is not misleading). */
const MODEL_TYPE = (() => {
  const t = {}
  const add = (type, list) => list.forEach((f) => { t[hill(parseFormula(f))] = type })
  add('rocksalt', ['LiF', 'LiCl', 'LiBr', 'LiI', 'NaF', 'NaBr', 'NaI', 'KF', 'KCl', 'KBr', 'KI', 'RbF', 'RbCl', 'RbBr', 'RbI', 'AgF', 'AgCl', 'AgBr', 'MgO', 'CaO', 'SrO', 'BaO', 'MnO', 'FeO', 'CoO', 'NiO', 'MgS', 'CaS', 'SrS', 'BaS', 'PbS'])
  add('fluorite', ['SrF2', 'BaF2', 'PbF2', 'CdF2', 'HgF2', 'SrCl2'])
  add('antifluorite', ['Li2O', 'K2O', 'Rb2O', 'Li2S', 'Na2S', 'K2S'])
  return t
})()

export function latticeModel(comp, q, p) {
  const syms = Object.keys(comp)
  if (syms.length !== 2) return null
  const type0 = MODEL_TYPE[hill(comp)]
  if (!type0) return null
  const cat = syms.find((s) => isMetal(s))
  const an = syms.find((s) => s !== cat)
  if (!cat || !IONIC_RADII[cat] || !IONIC_RADII[an]) return null
  const nC = comp[cat]
  const nA = comp[an]
  const rC = IONIC_RADII[cat]
  const rA = IONIC_RADII[an]
  let t, a, atoms
  if (nC === 1 && nA === 1) {
    t = TEMPLATES.rocksalt
    a = 2 * (rC + rA)
    atoms = [...t.A.map((f) => [cat, ...f.map((x) => x * a), rC]), ...t.B.map((f) => [an, ...f.map((x) => x * a), rA])]
  } else if (nC === 1 && nA === 2) {
    t = TEMPLATES.fluorite
    a = (4 * (rC + rA)) / Math.sqrt(3)
    atoms = [...t.A.map((f) => [cat, ...f.map((x) => x * a), rC]), ...t.B.map((f) => [an, ...f.map((x) => x * a), rA])]
  } else if (nC === 2 && nA === 1) {
    t = TEMPLATES.fluorite // antifluorite: anion on the fcc lattice, cations fill the tetrahedral holes
    a = (4 * (rC + rA)) / Math.sqrt(3)
    atoms = [...t.A.map((f) => [an, ...f.map((x) => x * a), rA]), ...t.B.map((f) => [cat, ...f.map((x) => x * a), rC])]
  } else return null
  atoms = atoms.map(([sym, x, y, z, r]) => [sym, x - a / 2, y - a / 2, z - a / 2, r])
  const type = nC === 1 && nA === 1 ? 'Rock-salt (NaCl-type) model' : nA === 2 ? 'Fluorite (CaF₂-type) model' : 'Antifluorite (Na₂O-type) model'
  return {
    id: `model-${hill(comp)}`,
    name: `${type}`,
    formula: prettyFormula(comp),
    kind: 'lattice',
    topic: 'solid',
    model: true,
    atoms,
    bonds: [],
    lp: [],
    cell: { type: 'cubic', a },
    notes: ['An illustrative model: the real crystal structure may differ. The lattice type is chosen from the formula (1:1 → rock salt, 1:2 → fluorite, 2:1 → antifluorite) and the sizes use ionic radii.'],
    comp,
    elements: syms,
  }
}

/** Balanced equation for forming 1 formula unit (smallest whole numbers) from elements in their standard states. */
export function formationEquation(comp, display) {
  const shown = display || prettyFormula(comp)
  const order = Object.keys(parseFormula(display || hill(comp)))
  const els = order.filter((e) => comp[e])
  let c = 1
  for (const e of els) {
    const n = STANDARD[e] || 1
    c = lcm(c, n / gcd(n, comp[e]))
  }
  const left = els.map((e) => ({ e, n: STANDARD[e] || 1, coef: (c * comp[e]) / (STANDARD[e] || 1) }))
  const g = [c, ...left.map((l) => l.coef)].reduce((a, b) => gcd(a, b))
  const co = (n) => (n / g === 1 ? '' : n / g)
  const species = (l) => `${co(l.coef)}${l.e}${l.n > 1 ? sub(l.n) : ''}`
  return {
    text: `${left.map(species).join(' + ')} → ${co(c)}${shown}`,
    coefficient: c / g,
  }
}

const ELEMENT_FORMS = {
  H: ['h2'], N: ['n2'], O: ['o2', 'o3'], C: ['diamond', 'graphite', 'c60'], P: ['p4'], S: ['s8'],
  Po: ['sc'], Na: ['bcc'], K: ['bcc'], Fe: ['bcc'], Cr: ['bcc'], W: ['bcc'], Ba: ['bcc'],
  Cu: ['fcc'], Ag: ['fcc'], Au: ['fcc'], Al: ['fcc'], Ni: ['fcc'], Pb: ['fcc'], Ca: ['fcc'],
  Mg: ['hcp'], Zn: ['hcp'], Ti: ['hcp'], Co: ['hcp'], Cd: ['hcp'],
}

/** Candidate library groups: all structures with the same composition are alternatives (isomers/conformers). */
const LIBRARY_GROUPS = (() => {
  const g = new Map()
  for (const m of MOLS) {
    if (HIDDEN_IN_MIX.has(m.id)) continue
    if (m.kind === 'ion') continue
    if (m.kind === 'lattice' && !LATTICE_COMP[m.id]) continue
    const key = hill(m.comp)
    if (!g.has(key)) g.set(key, { key, comp: m.comp, ids: [] })
    g.get(key).ids.push(m.id)
  }
  return [...g.values()]
})()

/**
 * Work out what forms when atoms are mixed.
 * @param {Record<string, number>} counts e.g. {H: 4, O: 2}
 */
export function react(counts) {
  const syms = Object.keys(counts).filter((s) => counts[s] > 0)
  if (!syms.length) return null
  if (syms.length === 1) {
    const s = syms[0]
    const noble = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'].includes(s)
    return { type: 'element', sym: s, count: counts[s], noble, forms: (ELEMENT_FORMS[s] || []).map((id) => MOL_BY_ID[id]) }
  }
  const results = []
  for (const g of LIBRARY_GROUPS) {
    if (Object.keys(g.comp).length < 2) continue
    if (!Object.keys(g.comp).every((e) => (counts[e] || 0) >= g.comp[e])) continue
    const units = Math.min(...Object.keys(g.comp).map((e) => Math.floor(counts[e] / g.comp[e])))
    const first = MOL_BY_ID[g.ids[0]]
    const organic = ['organic', 'isomers', 'conformations', 'bio'].includes(first.topic)
    results.push({ source: 'library', comp: g.comp, ids: g.ids, units, used: atomsIn(g.comp) * units, display: organic ? prettyFormula(g.comp) : first.formula })
  }
  // predicted ionic compounds (metal + non-metal) that the library does not already contain
  if (syms.length === 2) {
    const metal = syms.find((s) => isMetal(s))
    const nm = syms.find((s) => s !== metal)
    if (metal && nm && CATION_Q[metal] && ANION_Q[nm]) {
      for (const q of CATION_Q[metal]) {
        const pr = ionicPrediction(metal, q, nm)
        if (results.some((r) => hill(r.comp) === hill(pr.comp))) continue
        if (!Object.keys(pr.comp).every((e) => (counts[e] || 0) >= pr.comp[e])) continue
        const units = Math.min(...Object.keys(pr.comp).map((e) => Math.floor(counts[e] / pr.comp[e])))
        results.push({ source: 'predicted', comp: pr.comp, pr, display: pr.formula, units, used: atomsIn(pr.comp) * units, model: latticeModel(pr.comp, pr.q, pr.p) })
      }
    }
  }
  results.sort((a, b) => b.used - a.used || (a.source === 'library' ? -1 : 1) - (b.source === 'library' ? -1 : 1) || atomsIn(a.comp) - atomsIn(b.comp))
  const total = atomsIn(counts)
  for (const r of results) {
    r.left = Object.fromEntries(syms.map((s) => [s, counts[s] - (r.comp[s] || 0) * r.units]).filter(([, n]) => n > 0))
    r.complete = r.used === total
    r.equation = formationEquation(r.comp, r.display)
  }
  return { type: 'compound', results }
}

/* =========================================================================================
 * Ionic formula writing, solubility and colours (class 11 / 12)
 * ======================================================================================= */
const ion = (id, f, q, name, o = {}) => ({ id, f, q, name, ...o })

export const CATIONS = [
  ion('h', 'H', 1, 'hydrogen'),
  ion('li', 'Li', 1, 'lithium'), ion('na', 'Na', 1, 'sodium'), ion('k', 'K', 1, 'potassium'),
  ion('nh4', 'NH₄', 1, 'ammonium', { poly: true, mol: 'nh4' }),
  ion('ag', 'Ag', 1, 'silver'), ion('cu1', 'Cu', 1, 'copper(I)'),
  ion('mg', 'Mg', 2, 'magnesium'), ion('ca', 'Ca', 2, 'calcium'), ion('sr', 'Sr', 2, 'strontium'), ion('ba', 'Ba', 2, 'barium'),
  ion('zn', 'Zn', 2, 'zinc'), ion('cu2', 'Cu', 2, 'copper(II)', { colour: ['#3a8fe0', 'blue'] }),
  ion('fe2', 'Fe', 2, 'iron(II)', { colour: ['#a8d5a2', 'pale green'] }), ion('pb', 'Pb', 2, 'lead(II)'),
  ion('hg2', 'Hg', 2, 'mercury(II)'), ion('ni', 'Ni', 2, 'nickel(II)', { colour: ['#5fc06a', 'green'] }),
  ion('co', 'Co', 2, 'cobalt(II)', { colour: ['#e88fb0', 'pink'] }), ion('mn2', 'Mn', 2, 'manganese(II)', { colour: ['#f2d5df', 'very pale pink'] }),
  ion('al', 'Al', 3, 'aluminium'), ion('fe3', 'Fe', 3, 'iron(III)', { colour: ['#e0b04a', 'yellow-brown'] }), ion('cr3', 'Cr', 3, 'chromium(III)', { colour: ['#4fa860', 'green'] }),
]

export const ANIONS = [
  ion('f', 'F', 1, 'fluoride'), ion('cl', 'Cl', 1, 'chloride'), ion('br', 'Br', 1, 'bromide'), ion('i', 'I', 1, 'iodide'),
  ion('oh', 'OH', 1, 'hydroxide', { poly: true }), ion('no3', 'NO₃', 1, 'nitrate', { poly: true, mol: 'no3' }),
  ion('no2', 'NO₂', 1, 'nitrite', { poly: true, mol: 'no2' }), ion('hco3', 'HCO₃', 1, 'hydrogencarbonate', { poly: true }),
  ion('ch3coo', 'CH₃COO', 1, 'acetate', { poly: true }), ion('mno4', 'MnO₄', 1, 'permanganate', { poly: true, mol: 'mno4', colour: ['#8a2be2', 'purple'] }),
  ion('clo4', 'ClO₄', 1, 'perchlorate', { poly: true, mol: 'clo4' }), ion('clo3', 'ClO₃', 1, 'chlorate', { poly: true, mol: 'clo3' }),
  ion('cn', 'CN', 1, 'cyanide', { poly: true }),
  ion('o', 'O', 2, 'oxide'), ion('s', 'S', 2, 'sulfide'),
  ion('so4', 'SO₄', 2, 'sulfate', { poly: true, mol: 'so4' }), ion('so3', 'SO₃', 2, 'sulfite', { poly: true, mol: 'so3_2' }),
  ion('co3', 'CO₃', 2, 'carbonate', { poly: true, mol: 'co3' }),
  ion('cro4', 'CrO₄', 2, 'chromate', { poly: true, mol: 'cro4', colour: ['#f2d02c', 'yellow'] }),
  ion('cr2o7', 'Cr₂O₇', 2, 'dichromate', { poly: true, mol: 'cr2o7', colour: ['#f08a1c', 'orange'] }),
  ion('po4', 'PO₄', 3, 'phosphate', { poly: true, mol: 'po4' }),
]

const ACID_NAME = { f: 'hydrofluoric acid', cl: 'hydrochloric acid', br: 'hydrobromic acid', i: 'hydroiodic acid', no3: 'nitric acid', no2: 'nitrous acid', hco3: 'carbonic acid (as HCO₃⁻)', ch3coo: 'acetic acid', clo4: 'perchloric acid', clo3: 'chloric acid', cn: 'hydrocyanic acid', s: 'hydrogen sulfide (hydrosulfuric acid)', so4: 'sulfuric acid', so3: 'sulfurous acid', co3: 'carbonic acid', po4: 'phosphoric acid', mno4: 'permanganic acid', cro4: 'chromic acid', cr2o7: 'dichromic acid' }

/** Criss-cross method. Returns the formula, lowest ratio and name. */
export function crissCross(cat, an) {
  if (cat.id === 'h' && (an.id === 'oh' || an.id === 'o')) {
    return { nCat: 2, nAn: 1, formula: 'H₂O', name: 'water', note: 'H⁺ + OH⁻ → H₂O (neutralisation)', comp: { H: 2, O: 1 }, acid: false, g: 1 }
  }
  const g = gcd(cat.q, an.q)
  const nCat = an.q / g
  const nAn = cat.q / g
  const part = (i, n) => (n === 1 ? i.f : i.poly ? `(${i.f})${sub(n)}` : `${i.f}${sub(n)}`)
  const formula = part(cat, nCat) + part(an, nAn)
  const acid = cat.id === 'h'
  return {
    nCat, nAn, g, formula, acid,
    name: acid ? ACID_NAME[an.id] || `hydrogen ${an.name}` : `${cat.name} ${an.name}`,
    comp: parseFormula(formula),
  }
}

const ALKALI = new Set(['li', 'na', 'k', 'nh4'])
/** Textbook solubility rules (as taught for NEET/JEE). Returns 'soluble' | 'sparingly' | 'insoluble'. */
export function solubility(cat, an) {
  if (ALKALI.has(cat.id)) return 'soluble'
  if (cat.id === 'h') return 'soluble'
  if (['no3', 'no2', 'clo3', 'clo4', 'ch3coo', 'hco3', 'mno4'].includes(an.id)) return an.id === 'ch3coo' && cat.id === 'ag' ? 'sparingly' : 'soluble'
  if (['cl', 'br', 'i'].includes(an.id)) {
    if (['ag', 'cu1'].includes(cat.id)) return 'insoluble'
    if (cat.id === 'pb') return an.id === 'cl' ? 'sparingly' : 'insoluble'
    if (cat.id === 'hg2' && an.id === 'i') return 'insoluble'
    return 'soluble'
  }
  if (an.id === 'f') return ['mg', 'ca', 'sr', 'ba', 'pb'].includes(cat.id) ? 'insoluble' : 'soluble'
  if (an.id === 'so4') {
    if (['ba', 'pb', 'sr'].includes(cat.id)) return 'insoluble'
    if (['ca', 'ag'].includes(cat.id)) return 'sparingly'
    return 'soluble'
  }
  if (an.id === 'oh') {
    if (cat.id === 'ba') return 'soluble'
    if (['ca', 'sr'].includes(cat.id)) return 'sparingly'
    return 'insoluble'
  }
  if (an.id === 'cr2o7') return ['ag', 'pb', 'hg2'].includes(cat.id) ? 'insoluble' : 'soluble'
  if (an.id === 'cro4') return cat.id === 'mg' || cat.id === 'zn' ? 'soluble' : 'insoluble'
  if (an.id === 'cn') return cat.id === 'hg2' ? 'soluble' : ['ca', 'sr', 'ba'].includes(cat.id) ? 'soluble' : 'insoluble'
  if (an.id === 's') return ['ca', 'sr', 'ba', 'mg'].includes(cat.id) ? 'sparingly' : 'insoluble'
  return 'insoluble' // carbonate, sulfite, phosphate, oxide
}

/** Well-known precipitate colours: key = cationId + '|' + anionId. */
const PPT = {
  'ag|cl': ['#f4f4f0', 'white (curdy); dissolves in dilute NH₃'], 'ag|br': ['#efe9b0', 'pale yellow; sparingly soluble in NH₃'], 'ag|i': ['#e9d23a', 'yellow; insoluble in NH₃'],
  'ag|cro4': ['#a8322a', 'brick red'], 'ag|s': ['#222', 'black'], 'ag|po4': ['#e8d44a', 'yellow'], 'ag|co3': ['#ece6b0', 'pale yellow'], 'ag|o': ['#6b4a2a', 'brown'], 'ag|cn': ['#f4f4f0', 'white'], 'ag|cr2o7': ['#a8322a', 'red'],
  'pb|cl': ['#f4f4f0', 'white (soluble in hot water)'], 'pb|i': ['#f2c315', 'golden yellow'], 'pb|so4': ['#f4f4f0', 'white'], 'pb|cro4': ['#f2d02c', 'yellow (chrome yellow)'], 'pb|s': ['#222', 'black'],
  'pb|co3': ['#f4f4f0', 'white'], 'pb|oh': ['#f4f4f0', 'white'],
  'ba|so4': ['#f4f4f0', 'white (insoluble even in acids)'], 'ba|cro4': ['#f2d02c', 'yellow'], 'ba|co3': ['#f4f4f0', 'white'],
  'ca|co3': ['#f4f4f0', 'white'], 'ca|so4': ['#f4f4f0', 'white (sparingly)'], 'ca|po4': ['#f4f4f0', 'white'], 'ca|f': ['#f4f4f0', 'white'],
  'cu2|s': ['#1a1a1a', 'black'], 'cu2|oh': ['#6fb4ee', 'pale blue (gelatinous)'], 'cu2|co3': ['#4fb89a', 'bluish-green'], 'cu1|cl': ['#f4f4f0', 'white'], 'cu1|i': ['#f4f4f0', 'white'], 'cu1|o': ['#c8321e', 'red'],
  'fe3|oh': ['#9a4a1e', 'reddish-brown'], 'fe2|oh': ['#6fa06a', 'dirty green (turns brown in air)'], 'fe2|s': ['#1a1a1a', 'black'], 'fe3|po4': ['#e8dfb0', 'yellowish-white'],
  'zn|s': ['#f4f4f0', 'white'], 'zn|oh': ['#f4f4f0', 'white (dissolves in excess NaOH)'], 'zn|co3': ['#f4f4f0', 'white'],
  'ni|s': ['#1a1a1a', 'black'], 'ni|oh': ['#5fc06a', 'green'], 'co|s': ['#1a1a1a', 'black'], 'co|oh': ['#6a8ee8', 'blue → pink'],
  'mn2|s': ['#f0b8a8', 'buff / flesh pink'], 'mn2|oh': ['#f4f4f0', 'white (browns in air)'], 'cr3|oh': ['#7fae8a', 'grey-green'],
  'al|oh': ['#f4f4f0', 'white gelatinous (dissolves in excess NaOH)'], 'mg|oh': ['#f4f4f0', 'white'], 'mg|co3': ['#f4f4f0', 'white'], 'hg2|s': ['#1a1a1a', 'black (red when heated)'], 'hg2|i': ['#e03a20', 'scarlet red'],
}

export function precipitate(cat, an) {
  const e = PPT[`${cat.id}|${an.id}`]
  return e ? { color: e[0], text: e[1] } : { color: '#f4f4f0', text: 'white (or colourless)' }
}

/** Colour of the solution when a soluble salt dissolves. */
export function solutionColor(cat, an) {
  const parts = [cat.colour, an.colour].filter(Boolean)
  if (!parts.length) return { color: null, text: 'colourless solution' }
  return { color: parts[0][0], text: parts.map((p) => p[1]).join(' + ') + ' solution' }
}

export function ionResult(cat, an) {
  const r = crissCross(cat, an)
  const key = hill(r.comp)
  const lib = MOLS.find((m) => m.kind !== 'ion' && hill(m.comp) === key && !HIDDEN_IN_MIX.has(m.id))
  const sol = r.acid ? 'soluble' : solubility(cat, an)
  const monoCat = Object.keys(parseFormula(cat.f)).length === 1 && IONIC_RADII[cat.f]
  const monoAn = Object.keys(parseFormula(an.f)).length === 1 && IONIC_RADII[an.f]
  let model = null
  if (!lib && !r.acid && monoCat && monoAn) model = latticeModel(r.comp, cat.q, an.q)
  return { ...r, lib, model, solubility: r.acid ? 'acid' : sol, ppt: sol !== 'soluble' && !r.acid ? precipitate(cat, an) : null, solution: sol === 'soluble' && !r.acid ? solutionColor(cat, an) : null }
}

/**
 * Net dipole from bond dipoles (ΔEN × bond direction), pointing towards the negative end.
 * Returns null where the idea does not apply (lattices, metal complexes).
 */
export function dipoleVector(m) {
  if (m.kind === 'lattice' || m.topic === 'coord') return null
  const en = (sym) => bySymbol[sym.toLowerCase()]?.en ?? null
  const v = [0, 0, 0]
  let total = 0
  for (const [i, j] of m.bonds) {
    const ei = en(m.atoms[i][0])
    const ej = en(m.atoms[j][0])
    if (ei == null || ej == null) continue
    const d = sv(P(m, j), P(m, i))
    const l = len(d)
    const w = (ej - ei) / l
    v[0] += d[0] * w; v[1] += d[1] * w; v[2] += d[2] * w
    total += Math.abs(ej - ei)
  }
  const mag = len(v)
  return { vec: v, mag, relative: total ? mag / total : 0 }
}

/** Compounds that could form from the elements in the flask if more atoms were added. */
export function suggestions(counts) {
  const have = new Set(Object.keys(counts).filter((s) => counts[s] > 0))
  if (have.size < 1) return []
  return LIBRARY_GROUPS.filter((g) => Object.keys(g.comp).length >= 2 && Object.keys(g.comp).every((e) => have.has(e)) && !Object.keys(g.comp).every((e) => counts[e] >= g.comp[e]))
    .sort((a, b) => atomsIn(a.comp) - atomsIn(b.comp))
    .slice(0, 6)
    .map((g) => ({ comp: g.comp, id: g.ids[0], formula: MOL_BY_ID[g.ids[0]].formula, name: MOL_BY_ID[g.ids[0]].name }))
}
