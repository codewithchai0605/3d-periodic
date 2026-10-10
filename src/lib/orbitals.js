// Hydrogen-like orbital shapes, sampled as point clouds.
// Radial part: R(r) ∝ ρ^l e^(-ρ/2) L^(2l+1)_(n-l-1)(ρ), ρ = 2r/n.  Angular part: real spherical harmonics.

export const L_NAMES = ['s', 'p', 'd', 'f']

export const ANGULAR = {
  0: [{ id: 's', label: 's', f: () => 1 }],
  1: [
    { id: 'px', label: 'px', f: (x) => x },
    { id: 'py', label: 'py', f: (x, y) => y },
    { id: 'pz', label: 'pz', f: (x, y, z) => z },
  ],
  2: [
    { id: 'dz2', label: 'dz²', f: (x, y, z) => 3 * z * z - 1 },
    { id: 'dxz', label: 'dxz', f: (x, y, z) => x * z },
    { id: 'dyz', label: 'dyz', f: (x, y, z) => y * z },
    { id: 'dxy', label: 'dxy', f: (x, y) => x * y },
    { id: 'dx2y2', label: 'dx²−y²', f: (x, y) => x * x - y * y },
  ],
  3: [
    { id: 'fz3', label: 'fz³', f: (x, y, z) => z * (5 * z * z - 3) },
    { id: 'fxz2', label: 'fxz²', f: (x, y, z) => x * (5 * z * z - 1) },
    { id: 'fyz2', label: 'fyz²', f: (x, y, z) => y * (5 * z * z - 1) },
    { id: 'fxyz', label: 'fxyz', f: (x, y, z) => x * y * z },
    { id: 'fzx2y2', label: 'fz(x²−y²)', f: (x, y, z) => z * (x * x - y * y) },
    { id: 'fx', label: 'fx(x²−3y²)', f: (x, y) => x * (x * x - 3 * y * y) },
    { id: 'fy', label: 'fy(3x²−y²)', f: (x, y) => y * (3 * x * x - y * y) },
  ],
}

export const SHAPE_NOTES = {
  0: 'A sphere. At higher n, ring-shaped nodes (where the electron is never found) appear inside it.',
  1: 'Two lobes on opposite sides of the nucleus — a dumbbell. There are three, pointing along x, y and z.',
  2: 'Mostly four-lobed cloverleafs (one is a dumbbell wearing a ring). Five orientations in all.',
  3: 'Intricate multi-lobed shapes. Seven orientations — this is the block that gives lanthanides and actinides their own rows.',
}

function binom(n, k) {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}
function laguerre(k, a, x) {
  let sum = 0
  let fact = 1
  for (let i = 0; i <= k; i++) {
    if (i > 0) fact *= i
    sum += ((i % 2 ? -1 : 1) * binom(k + a, k - i) * Math.pow(x, i)) / fact
  }
  return sum
}
function radial(n, l, r) {
  const rho = (2 * r) / n
  return Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho)
}

/**
 * @returns {{ positions: Float32Array, colors: Float32Array }} `count` points scaled so the cloud spans roughly ±2
 */
export function sampleOrbital(n, l, mi, count = 11000) {
  const ang = ANGULAR[l][mi].f
  const rMax = 2.4 * n * n + 10
  const steps = 1600
  const cdf = new Float64Array(steps + 1)
  for (let i = 1; i <= steps; i++) {
    const r = (i / steps) * rMax
    const R = radial(n, l, r)
    cdf[i] = cdf[i - 1] + r * r * R * R
  }
  const total = cdf[steps]
  const quantile = (u) => {
    const target = u * total
    let lo = 0
    let hi = steps
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < target) lo = mid
      else hi = mid
    }
    const span = cdf[hi] - cdf[lo] || 1
    return ((lo + (target - cdf[lo]) / span) / steps) * rMax
  }
  const scale = 2 / quantile(0.985)

  let maxY2 = 0
  for (let i = 0; i < 4000; i++) {
    const z = Math.random() * 2 - 1
    const p = Math.random() * Math.PI * 2
    const q = Math.sqrt(1 - z * z)
    const y = ang(q * Math.cos(p), q * Math.sin(p), z)
    maxY2 = Math.max(maxY2, y * y)
  }
  maxY2 *= 1.05

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const pos = [0.3, 0.8, 1.0]
  const neg = [1.0, 0.44, 0.57]
  for (let i = 0; i < count; i++) {
    const r = quantile(Math.random())
    let x, y, z, Y
    for (let tries = 0; tries < 200; tries++) {
      z = Math.random() * 2 - 1
      const p = Math.random() * Math.PI * 2
      const q = Math.sqrt(1 - z * z)
      x = q * Math.cos(p)
      y = q * Math.sin(p)
      Y = ang(x, y, z)
      // exponent > 1 slightly sharpens the lobes so they read clearly as dots
      if (Math.pow((Y * Y) / maxY2, 1.7) > Math.random()) break
    }
    const sign = Math.sign(radial(n, l, r)) * Math.sign(Y)
    const c = sign >= 0 ? pos : neg
    positions.set([x * r * scale, z * r * scale, y * r * scale], i * 3) // y-up in the scene
    colors.set(c, i * 3)
  }
  return { positions, colors }
}
