// Electron configurations via the Madelung (Aufbau) rule + the known exceptions.
const ORDER = ['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s','5f','6d','7p']
const CAP = { s: 2, p: 6, d: 10, f: 14 }
const NOBLE = [2, 10, 18, 36, 54, 86]
const NOBLE_SYM = { 2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr', 54: 'Xe', 86: 'Rn' }

// Elements whose real ground state differs from the simple filling order.
const EXCEPTIONS = {
  24: { '3d': 5, '4s': 1 }, 29: { '3d': 10, '4s': 1 },
  41: { '4d': 4, '5s': 1 }, 42: { '4d': 5, '5s': 1 }, 44: { '4d': 7, '5s': 1 },
  45: { '4d': 8, '5s': 1 }, 46: { '4d': 10, '5s': 0 }, 47: { '4d': 10, '5s': 1 },
  57: { '4f': 0, '5d': 1 }, 58: { '4f': 1, '5d': 1 }, 64: { '4f': 7, '5d': 1 },
  78: { '5d': 9, '6s': 1 }, 79: { '5d': 10, '6s': 1 },
  89: { '5f': 0, '6d': 1 }, 90: { '5f': 0, '6d': 2 }, 91: { '5f': 2, '6d': 1 },
  92: { '5f': 3, '6d': 1 }, 93: { '5f': 4, '6d': 1 }, 96: { '5f': 7, '6d': 1 },
  103: { '6d': 0, '7p': 1 },
}

function fill(z, useExceptions = true) {
  let left = z
  const out = {}
  for (const orb of ORDER) {
    if (left <= 0) break
    const n = Math.min(left, CAP[orb[1]])
    out[orb] = n
    left -= n
  }
  if (useExceptions && EXCEPTIONS[z]) Object.assign(out, EXCEPTIONS[z])
  return out
}

const sortOrbs = (keys) => keys.sort((a, b) => a[0] - b[0] || 'spdf'.indexOf(a[1]) - 'spdf'.indexOf(b[1]))

export function electronConfig(z) {
  const full = fill(z)
  // shells (electrons per principal quantum number)
  const shells = []
  for (const [orb, count] of Object.entries(full)) {
    if (!count) continue
    const n = +orb[0]
    shells[n - 1] = (shells[n - 1] || 0) + count
  }
  for (let i = 0; i < shells.length; i++) shells[i] = shells[i] || 0

  // Short form: [noble gas core] + remaining orbitals
  const core = [...NOBLE].reverse().find((nz) => nz < z)
  let parts, coreSym = null
  if (core) {
    coreSym = NOBLE_SYM[core]
    const coreFill = fill(core, false)
    const rest = {}
    for (const [orb, c] of Object.entries(full)) {
      const r = c - (coreFill[orb] || 0)
      if (r > 0) rest[orb] = r
    }
    parts = sortOrbs(Object.keys(rest)).map((o) => [o, rest[o]])
  } else {
    parts = sortOrbs(Object.keys(full).filter((o) => full[o] > 0)).map((o) => [o, full[o]])
  }
  return { shells, coreSym, parts, full }
}

export function configString(cfg) {
  return (cfg.coreSym ? `[${cfg.coreSym}] ` : '') + cfg.parts.map(([o, c]) => `${o}${c}`).join(' ')
}
