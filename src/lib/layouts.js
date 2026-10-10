import * as THREE from 'three'

export const TILE_W = 0.94
export const TILE_H = 1.14
const CW = 1.06 // table cell width
const CH = 1.26 // table cell height

export const LAYOUTS = [
  { id: 'table',  label: 'Table',  blurb: 'The classic 18-column layout' },
  { id: 'radial', label: 'Rings',  blurb: 'One ring per period, so you see shells fill up' },
  { id: 'helix',  label: 'Helix',  blurb: 'Atomic number as a spiral staircase' },
  { id: 'sphere', label: 'Sphere', blurb: 'All 118 elements on a globe' },
]

/** Table-grid coordinates for an element (or placeholder) given its col / row. */
export function tableXY(col, row) {
  const r = row > 7 ? row - 0.7 : row // tighten the gap above the f-block rows
  return [(col - 9.5) * CW, -(r - 5.15) * CH]
}

/** Two "57–71" / "89–103" marker tiles that sit in group 3 of the table. */
export const PLACEHOLDERS = [
  { id: 'ph-la', col: 3, row: 6, title: '57–71', sub: 'Lanthanides' },
  { id: 'ph-ac', col: 3, row: 7, title: '89–103', sub: 'Actinides' },
]

const PERIOD_COUNT = [2, 8, 8, 18, 18, 32, 32]

/**
 * @returns {{ pos: THREE.Vector3, quat: THREE.Quaternion }[]} one entry per element (index = z - 1)
 */
export function computeLayout(id, elements) {
  const N = elements.length
  const dummy = new THREE.Object3D()
  const out = []
  const push = (x, y, z, lookOut) => {
    dummy.position.set(x, y, z)
    dummy.quaternion.identity()
    if (lookOut) dummy.lookAt(lookOut(x, y, z))
    dummy.updateMatrix()
    out.push({ pos: dummy.position.clone(), quat: dummy.quaternion.clone() })
  }

  if (id === 'table') {
    for (const e of elements) {
      const [x, y] = tableXY(e.col, e.row)
      push(x, y, 0)
    }
  } else if (id === 'radial') {
    const before = [0, 2, 10, 18, 36, 54, 86] // atomic numbers completed before each period
    for (const e of elements) {
      const p = e.period
      const idx = e.z - 1 - before[p - 1]
      const r = 2.7 + 1.38 * p
      const a = Math.PI / 2 - (2 * Math.PI * (idx + 0.5)) / PERIOD_COUNT[p - 1]
      push(r * Math.cos(a), r * Math.sin(a), 0)
    }
  } else if (id === 'helix') {
    const R = 6.6
    for (let i = 0; i < N; i++) {
      const phi = i * 0.235 + Math.PI
      const x = R * Math.sin(phi)
      const z = R * Math.cos(phi)
      const y = 6.9 - i * 0.117
      push(x, y, z, (px, py, pz) => new THREE.Vector3(px * 2, py, pz * 2))
    }
  } else {
    const R = 5.7
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N) // hydrogen at the top
      const theta = Math.sqrt(N * Math.PI) * phi
      const x = R * Math.sin(phi) * Math.cos(theta)
      const y = R * Math.cos(phi)
      const z = R * Math.sin(phi) * Math.sin(theta)
      push(x, y, z, (px, py, pz) => new THREE.Vector3(px * 2, py * 2, pz * 2))
    }
  }
  return out
}

/**
 * Camera pose that frames a whole layout.
 * `free` is the fraction of the viewport height not covered by UI chrome.
 */
export function cameraFor(id, aspect, fovDeg = 40, free = 1) {
  const vh = THREE.MathUtils.degToRad(fovDeg)
  const tv = Math.tan(vh / 2)
  const th = tv * aspect
  const target = new THREE.Vector3(0, 0, 0)
  let d
  if (id === 'table' || id === 'radial') {
    const hw = id === 'table' ? 9.9 : 14.2
    const hh = id === 'table' ? 6.2 : 14.2
    d = Math.max(hh / (tv * free), hw / (th * 0.97))
  } else {
    const rb = id === 'helix' ? 9.4 : 7.2
    const half = Math.atan(Math.min(tv * free, th * 0.97))
    d = rb / Math.sin(half)
  }
  const pos = new THREE.Vector3(0, id === 'helix' ? 1.2 : 0, d).add(target)
  return { pos, target }
}

/** Camera pose that looks at one tile head-on. */
export function focusPose(item, depth = 0.2, dist = 7) {
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(item.quat)
  const target = item.pos.clone().addScaledVector(n, depth)
  const pos = target.clone().addScaledVector(n, dist)
  return { pos, target }
}
