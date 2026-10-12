import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { acquireRenderer, releaseRenderer, runViewerLoop } from '../lib/sharedRenderer.js'
import { bySymbol } from '../data/elements.js'
import { CAT_BY_ID } from '../data/categories.js'
import { dipoleVector } from '../lib/chem.js'

const FOV = 38
const CPK = {
  H: '#ffffff', C: '#8c8c8c', N: '#3050f8', O: '#ff2a2a', F: '#90e050', Cl: '#1ff01f', Br: '#a62929', I: '#940094', S: '#ffe030', P: '#ff8000',
  B: '#ffb5b5', Be: '#c2ff00', Li: '#cc80ff', Na: '#ab5cf2', K: '#8f40d4', Mg: '#8aff00', Ca: '#3dff00', Al: '#bfa6a6', Si: '#f0c8a0',
  Fe: '#e06633', Cu: '#c88033', Zn: '#7d80b0', Ag: '#c0c0c0', Cr: '#8a99c7', Mn: '#9c7ac7', Co: '#f090a0', Ni: '#50d050', Pt: '#d0d0e0',
  Xe: '#429eb0', Cs: '#57178f', Ba: '#00c900', Po: '#ab5c00', Pb: '#575961', Hg: '#b8b8d0', Sr: '#00ff00', Au: '#ffd123', W: '#2194d6',
}
const COV = { H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Cl: 1.02, Br: 1.2, I: 1.39, S: 1.05, P: 1.07, B: 0.84, Be: 0.96, Na: 1.66, K: 2.03, Mg: 1.41, Ca: 1.76, Al: 1.21, Si: 1.11, Li: 1.28, Fe: 1.32, Cu: 1.32, Zn: 1.22, Ag: 1.45, Cr: 1.39, Mn: 1.39, Co: 1.26, Ni: 1.24, Pt: 1.36, Xe: 1.4, Cs: 2.44, Ba: 2.15, Po: 1.4, Pb: 1.46, Hg: 1.32, Sr: 1.95 }
const VDW = { H: 1.2, C: 1.7, N: 1.55, O: 1.52, F: 1.47, Cl: 1.75, Br: 1.85, I: 1.98, S: 1.8, P: 1.8, B: 1.92, Be: 1.53, Na: 2.27, K: 2.75, Mg: 1.73, Ca: 2.31, Al: 1.84, Si: 2.1, Li: 1.82, Fe: 2.0, Cu: 1.4, Zn: 1.39, Ag: 1.72, Cr: 2.0, Mn: 2.0, Co: 2.0, Ni: 1.63, Pt: 1.75, Xe: 2.16, Cs: 3.43, Ba: 2.8, Pb: 2.02, Hg: 1.55, Sr: 2.5 }

export const atomColor = (sym) => CPK[sym] ?? CAT_BY_ID[bySymbol[sym.toLowerCase()]?.category]?.color ?? '#aaaaaa'

const Y = new THREE.Vector3(0, 1, 0)

/** Principal axes of a point cloud (largest → smallest spread). The smallest is the normal of a flat molecule. */
function principalAxes(pts) {
  const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const p of pts) {
    const d = [p.x - c.x, p.y - c.y, p.z - c.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]
  }
  const mul = (M, v) => [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2])
  const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l) }
  let v1 = unit([1, 0.37, 0.21])
  for (let k = 0; k < 60; k++) v1 = unit(mul(C, v1))
  const l1 = v1.reduce((a, x, i) => a + x * mul(C, v1)[i], 0)
  const C2 = C.map((row, i) => row.map((x, j) => x - l1 * v1[i] * v1[j]))
  let v2 = unit([0.13, 1, 0.41])
  const d = v2.reduce((a, x, i) => a + x * v1[i], 0)
  v2 = unit(v2.map((x, i) => x - d * v1[i]))
  for (let k = 0; k < 60; k++) { v2 = unit(mul(C2, v2)); const dd = v2.reduce((a, x, i) => a + x * v1[i], 0); v2 = unit(v2.map((x, i) => x - dd * v1[i])) }
  const v3 = [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]]
  return [new THREE.Vector3(...v1), new THREE.Vector3(...v2), new THREE.Vector3(...v3)]
}

/** Interactive 3D molecule / crystal viewer on the shared renderer. */
export default function MoleculeViewer({ mol, mode = 'ball', showLp = false, showDipole = false, showLabels = false, spin = true, size = 0.55, picks = [], onPick, resetKey = 0, className = '', label }) {
  const host = useRef(null)
  const api = useRef(null)
  const cb = useRef({})
  cb.current = { onPick }

  useEffect(() => {
    const node = host.current
    const renderer = acquireRenderer(node)
    if (!renderer) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 400)
    scene.add(new THREE.HemisphereLight(0xe8eeff, 0x1c2140, 1.5))
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(4, 6, 8)
    camera.add(key)
    scene.add(camera)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.autoRotateSpeed = 1.6

    const sphereGeo = new THREE.SphereGeometry(1, 28, 18)
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false)
    const coneGeo = new THREE.ConeGeometry(1, 1, 16)
    const matCache = new Map()
    const mat = (color, extra = {}) => {
      const k = color + JSON.stringify(extra)
      if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.08, ...extra }))
      return matCache.get(k)
    }
    const labelTex = new Map()
    const textures = []

    let group = null
    let atomMeshes = []
    let atomRadii = []
    let atomPos = []
    let pickGroup = new THREE.Group()
    scene.add(pickGroup)
    let current = null
    let currentId = null
    let dirty = 6
    let spinOn = spin && !reduced

    function clearGroup() {
      if (!group) return
      scene.remove(group)
      group.traverse((o) => {
        if (o.userData.own) o.geometry.dispose()
        if (o.isSprite) o.material.dispose()
      })
      group = null
    }

    function build(p) {
      const { mol, mode, showLp, showDipole, showLabels, size } = p
      clearGroup()
      current = p
      group = new THREE.Group()
      const atoms = mol.atoms
      const lattice = mol.kind === 'lattice'
      atomPos = atoms.map((a) => new THREE.Vector3(a[1], a[2], a[3]))
      atomRadii = atoms.map((a) => {
        if (lattice) return (a[4] ?? COV[a[0]] ?? 1) * size
        if (mode === 'space') return VDW[a[0]] ?? 1.9
        if (mode === 'stick') return 0.15
        return 0.22 + 0.24 * (COV[a[0]] ?? 1.2)
      })
      const bondR = mode === 'stick' ? 0.14 : lattice ? 0.07 : mode === 'space' ? 0 : 0.1

      atomMeshes = atoms.map((a, i) => {
        const m = new THREE.Mesh(sphereGeo, mat(atomColor(a[0]), mode === 'space' || lattice ? {} : {}))
        m.position.copy(atomPos[i])
        m.scale.setScalar(atomRadii[i])
        m.userData.index = i
        group.add(m)
        return m
      })

      const adj = atoms.map(() => [])
      mol.bonds.forEach(([i, j]) => { adj[i].push(j); adj[j].push(i) })

      const halfCyl = (p1, p2, r, material) => {
        const d = p2.clone().sub(p1)
        const L = d.length()
        const m = new THREE.Mesh(cylGeo, material)
        m.position.copy(p1).addScaledVector(d, 0.5)
        m.quaternion.setFromUnitVectors(Y, d.normalize())
        m.scale.set(r, L, r)
        group.add(m)
      }
      const line = (pa, pb, r, ia, ib, dashed, special) => {
        if (special) return halfCyl(pa, pb, r, special)
        if (dashed) {
          const n = Math.max(4, Math.round(pa.distanceTo(pb) / 0.28))
          for (let k = 0; k < n; k += 2) {
            const a = pa.clone().lerp(pb, k / n)
            const b = pa.clone().lerp(pb, Math.min(1, (k + 1) / n))
            halfCyl(a, b, r, mat(atomColor(atoms[(k / n) < 0.5 ? ia : ib][0])))
          }
          return
        }
        const mid = pa.clone().lerp(pb, 0.5)
        halfCyl(pa, mid, r, mat(atomColor(atoms[ia][0])))
        halfCyl(mid, pb, r, mat(atomColor(atoms[ib][0])))
      }

      if (mode !== 'space' || lattice) {
        for (const [i, j, order, style] of mol.bonds) {
          const a = atomPos[i]
          const b = atomPos[j]
          const dir = b.clone().sub(a).normalize()
          // offset in the plane of a neighbouring atom so double bonds lie in the molecular plane
          let off = null
          for (const k of [...adj[i], ...adj[j]]) {
            if (k === i || k === j) continue
            const n = dir.clone().cross(atomPos[k].clone().sub(a))
            if (n.length() > 1e-3) { off = n.cross(dir).normalize(); break }
          }
          if (!off) off = dir.clone().cross(Math.abs(dir.y) < 0.9 ? Y : new THREE.Vector3(1, 0, 0)).normalize()
          const sep = bondR * 1.7
          const at = (o) => [a.clone().addScaledVector(off, o * sep), b.clone().addScaledVector(off, o * sep)]
          if (style === 'dative') {
            const [pa, pb] = at(0)
            line(pa, pb, bondR * 0.55, i, j, false, mat('#aab8ff', { transparent: true, opacity: 0.85 }))
          } else if (style === 'bridge') {
            const [pa, pb] = at(0)
            line(pa, pb, bondR * 0.9, i, j, true)
          } else if (order >= 2.9) {
            for (const o of [-1, 0, 1]) { const [pa, pb] = at(o); line(pa, pb, bondR * 0.55, i, j) }
          } else if (order >= 1.95) {
            for (const o of [-0.5, 0.5]) { const [pa, pb] = at(o); line(pa, pb, bondR * 0.65, i, j) }
          } else if (order > 1.05) {
            const [pa, pb] = at(-0.5); line(pa, pb, bondR * 0.85, i, j)
            const [qa, qb] = at(0.5); line(qa, qb, bondR * 0.5, i, j, true)
          } else {
            const [pa, pb] = at(0); line(pa, pb, bondR, i, j)
          }
        }
      }

      // lone pairs
      if (showLp && mol.lp) {
        for (const [i, x, y, z] of mol.lp) {
          const d = new THREE.Vector3(x, y, z).normalize()
          const m = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: '#d9b8ff', transparent: true, opacity: 0.55, roughness: 0.4, depthWrite: false }))
          m.userData.own = false
          m.position.copy(atomPos[i]).addScaledVector(d, atomRadii[i] + 0.3)
          m.quaternion.setFromUnitVectors(Y, d)
          m.scale.set(0.26, 0.42, 0.26)
          group.add(m)
        }
      }

      // net dipole
      if (showDipole) {
        const dp = dipoleVector(mol)
        if (dp && dp.mag > 0.15) {
          const dir = new THREE.Vector3(...dp.vec).normalize()
          const L = Math.min(2.6, 0.9 + dp.mag * 0.9)
          const col = '#ffd23f'
          const tail = dir.clone().multiplyScalar(-L / 2)
          const head = dir.clone().multiplyScalar(L / 2)
          const shaft = head.clone().sub(tail)
          const m1 = new THREE.Mesh(cylGeo, mat(col, { emissive: col, emissiveIntensity: 0.35 }))
          m1.position.copy(tail).addScaledVector(shaft, 0.45)
          m1.quaternion.setFromUnitVectors(Y, dir)
          m1.scale.set(0.07, L * 0.9, 0.07)
          const m2 = new THREE.Mesh(coneGeo, mat(col, { emissive: col, emissiveIntensity: 0.35 }))
          m2.position.copy(head).addScaledVector(dir, -0.17)
          m2.quaternion.setFromUnitVectors(Y, dir)
          m2.scale.set(0.2, 0.34, 0.2)
          const plus = new THREE.Mesh(sphereGeo, mat(col, { emissive: col, emissiveIntensity: 0.35 }))
          plus.position.copy(tail); plus.scale.setScalar(0.12)
          group.add(m1, m2, plus)
        }
      }

      // labels
      if (showLabels) {
        atoms.forEach((a, i) => {
          if (!labelTex.has(a[0])) {
            const c = document.createElement('canvas')
            c.width = c.height = 128
            const g = c.getContext('2d')
            g.font = '700 74px "Bricolage Grotesque Variable", system-ui, sans-serif'
            g.textAlign = 'center'; g.textBaseline = 'middle'
            g.lineWidth = 12; g.strokeStyle = 'rgba(8,10,28,.9)'; g.strokeText(a[0], 64, 68)
            g.fillStyle = '#fff'; g.fillText(a[0], 64, 68)
            const t = new THREE.CanvasTexture(c)
            t.colorSpace = THREE.SRGBColorSpace
            labelTex.set(a[0], t); textures.push(t)
          }
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex.get(a[0]), depthTest: false, transparent: true }))
          sp.position.copy(atomPos[i])
          const s = Math.max(0.5, Math.min(1.1, atomRadii[i] * 1.1))
          sp.scale.set(s, s, 1)
          sp.renderOrder = 20
          group.add(sp)
        })
      }

      // unit-cell box
      if (mol.cell) {
        const mk = (g) => new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: '#8ab4ff', transparent: true, opacity: 0.7 }))
        let box
        if (mol.cell.type === 'cubic') box = mk(new THREE.BoxGeometry(mol.cell.a, mol.cell.a, mol.cell.a))
        else {
          const g = new THREE.CylinderGeometry(mol.cell.a, mol.cell.a, mol.cell.c, 6, 1, true)
          g.rotateY(Math.PI / 6)
          box = mk(g)
        }
        box.userData.own = true
        group.add(box)
      }
      scene.add(group)

      // frame the camera when a new structure is shown
      if (currentId !== mol.id) {
        currentId = mol.id
        let R = 0
        atomPos.forEach((v, i) => { R = Math.max(R, v.length() + atomRadii[i]) })
        if (mol.cell) R = Math.max(R, mol.cell.type === 'cubic' ? mol.cell.a * 0.87 : Math.hypot(mol.cell.a, mol.cell.c / 2))
        R = Math.max(R, 1.2)
        const dist = (R / Math.sin(THREE.MathUtils.degToRad(Math.min(FOV, FOV * Math.max(camera.aspect, 0.7)) / 2))) * (camera.aspect < 1.25 ? 1.4 : 1.12)
        if (mol.cell || atomPos.length < 3) {
          camera.position.set(dist * 0.55, dist * 0.35, dist * 0.78)
        } else {
          // look at a flat molecule face-on (with a little tilt for depth)
          const [a1, a2, a3] = principalAxes(atomPos)
          const dir = a3.clone().addScaledVector(a1, 0.42).addScaledVector(a2, 0.3).normalize()
          camera.position.copy(dir.multiplyScalar(dist))
        }
        controls.minDistance = R * 0.8
        controls.maxDistance = dist * 3
        controls.target.set(0, 0, 0)
        controls.update()
      }
      applyPicks(p.picks || [])
      dirty = 6
    }

    function applyPicks(list) {
      while (pickGroup.children.length) {
        const c = pickGroup.children.pop()
        if (c.userData.own) c.geometry.dispose()
      }
      if (!current) return
      list.forEach((i, n) => {
        if (!atomMeshes[i]) return
        const ring = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: n === 1 && list.length === 3 ? '#ffd23f' : '#8ab4ff', transparent: true, opacity: 0.38, depthWrite: false }))
        ring.position.copy(atomPos[i])
        ring.scale.setScalar(atomRadii[i] * 1.32 + 0.05)
        pickGroup.add(ring)
      })
      if (list.length >= 2) {
        const pts = list.map((i) => atomPos[i]).filter(Boolean)
        const g = new THREE.BufferGeometry().setFromPoints(pts)
        const ln = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#ffd23f', dashSize: 0.14, gapSize: 0.09 }))
        ln.computeLineDistances()
        ln.userData.own = true
        ln.renderOrder = 15
        ln.material.depthTest = false
        pickGroup.add(ln)
      }
      dirty = 4
    }

    const stop = runViewerLoop(node, () => {
      controls.autoRotate = spinOn
      const moved = controls.update()
      if (moved || spinOn || dirty > 0) {
        renderer.render(scene, camera)
        if (dirty > 0) dirty--
      }
    })

    // click to pick atoms (ignore drags)
    const raycaster = new THREE.Raycaster()
    let down = null
    const el = renderer.domElement
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() } }
    const onUp = (e) => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      const quick = performance.now() - down.t < 600
      down = null
      if (moved > 6 || !quick) return
      const r = el.getBoundingClientRect()
      raycaster.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera)
      const hit = raycaster.intersectObjects(atomMeshes, false)[0]
      cb.current.onPick?.(hit ? hit.object.userData.index : null)
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    const resize = () => {
      const w = node.clientWidth || 1
      const h = node.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      dirty = 4
    }
    const ro = new ResizeObserver(resize)
    ro.observe(node)
    resize()

    api.current = { build, applyPicks, setSpin: (v) => { spinOn = v && !reduced; dirty = 2 }, resetView: () => { currentId = null; build(current) } }

    return () => {
      api.current = null
      stop()
      ro.disconnect()
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      clearGroup()
      controls.dispose()
      sphereGeo.dispose(); cylGeo.dispose(); coneGeo.dispose()
      matCache.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      releaseRenderer(node)
    }
  }, [])

  useEffect(() => {
    api.current?.build({ mol, mode, showLp, showDipole, showLabels, size, picks })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mol, mode, showLp, showDipole, showLabels, size])
  useEffect(() => { api.current?.applyPicks(picks) }, [picks])
  useEffect(() => { api.current?.setSpin(spin) }, [spin])
  useEffect(() => { if (resetKey) api.current?.resetView() }, [resetKey])

  return <div ref={host} className={className} role="img" aria-label={label ?? `3D model of ${mol.name}`} />
}
