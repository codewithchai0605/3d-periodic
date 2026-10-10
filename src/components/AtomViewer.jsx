import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const FOV = 34
const NUCLEON_R = 0.075

/**
 * A small standalone Three.js scene: nucleus (protons + neutrons), one ring per
 * electron shell, and electrons orbiting. Rebuilt whenever the element changes.
 */
export default function AtomViewer({ el, className = '' }) {
  const host = useRef(null)
  const api = useRef(null)

  useEffect(() => {
    const node = host.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    node.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
    scene.add(new THREE.HemisphereLight(0xe8eeff, 0x1c2140, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(3, 4, 5)
    scene.add(key)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 1.1

    const state = { group: null, electrons: null, meta: [], t: 0 }
    const sphere = new THREE.SphereGeometry(1, 14, 10)
    const mats = {
      p: new THREE.MeshStandardMaterial({ color: '#ff6b6b', roughness: 0.35, emissive: '#ff3b4a', emissiveIntensity: 0.35 }),
      n: new THREE.MeshStandardMaterial({ color: '#a9b4d6', roughness: 0.4, emissive: '#5c6a9a', emissiveIntensity: 0.25 }),
      e: new THREE.MeshStandardMaterial({ color: '#7be0ff', roughness: 0.2, emissive: '#35c9ff', emissiveIntensity: 1.1 }),
      ring: new THREE.LineBasicMaterial({ color: '#8ab4ff', transparent: true, opacity: 0.32 }),
    }

    function clear() {
      if (!state.group) return
      scene.remove(state.group)
      state.group.traverse((o) => {
        if (o.isLine) o.geometry.dispose()
        if (o.isInstancedMesh) o.dispose()
      })
      state.group = null
    }

    function build(e) {
      clear()
      const g = new THREE.Group()
      const A = Math.max(1, Math.round(e.mass))
      const Z = e.z
      const nucR = A === 1 ? NUCLEON_R : 1.25 * NUCLEON_R * Math.cbrt(A)

      // nucleus
      const prot = new THREE.InstancedMesh(sphere, mats.p, Z)
      const neut = new THREE.InstancedMesh(sphere, mats.n, Math.max(1, A - Z))
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const s = new THREE.Vector3(NUCLEON_R, NUCLEON_R, NUCLEON_R)
      const golden = Math.PI * (3 - Math.sqrt(5))
      let pi = 0
      let ni = 0
      for (let i = 0; i < A; i++) {
        // three decorrelated low-discrepancy sequences fill the ball evenly
        const fr = (v) => v - Math.floor(v)
        const r = A === 1 ? 0 : nucR * Math.cbrt(fr(0.5 + i * 0.5698402910)) * 0.95
        const y = 1 - 2 * fr(0.5 + i * 0.7548776662)
        const rad = Math.sqrt(1 - y * y)
        const th = i * golden
        m.compose(new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r), q, s)
        const isP = Math.floor(((i + 1) * Z) / A) > Math.floor((i * Z) / A)
        if (isP && pi < Z) prot.setMatrixAt(pi++, m)
        else if (ni < Math.max(1, A - Z)) neut.setMatrixAt(ni++, m)
        else prot.setMatrixAt(pi++, m)
      }
      prot.count = pi
      neut.count = ni
      g.add(prot, neut)

      // shells + electrons
      const shells = e.shells
      const total = shells.reduce((a, b) => a + b, 0)
      const electrons = new THREE.InstancedMesh(sphere, mats.e, total)
      const meta = []
      let outer = nucR
      shells.forEach((count, i) => {
        const r = nucR + 0.42 + i * 0.4
        outer = r
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35 + i * 0.62, i * 0.9, i * 0.31))
        const pts = []
        for (let k = 0; k <= 96; k++) pts.push(new THREE.Vector3(Math.cos((k / 96) * Math.PI * 2) * r, 0, Math.sin((k / 96) * Math.PI * 2) * r))
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mats.ring)
        ring.quaternion.copy(tilt)
        g.add(ring)
        for (let k = 0; k < count; k++) meta.push({ r, tilt, phase: (k / count) * Math.PI * 2, speed: (i % 2 ? -1 : 1) * (1.25 / Math.pow(r, 0.9)) })
      })
      g.add(electrons)
      scene.add(g)
      state.group = g
      state.electrons = electrons
      state.meta = meta
      state.outer = outer

      const dist = ((outer + 0.35) / Math.sin(THREE.MathUtils.degToRad(FOV / 2))) * 0.8
      camera.position.set(dist * 0.35, dist * 0.28, dist * 0.9)
      controls.minDistance = Math.max(1.2, dist * 0.45)
      controls.maxDistance = dist * 1.8
      controls.update()
      placeElectrons(0)
    }

    const tmpM = new THREE.Matrix4()
    const tmpP = new THREE.Vector3()
    const unit = new THREE.Vector3(1, 1, 1)
    const id = new THREE.Quaternion()
    function placeElectrons(t) {
      const { electrons, meta } = state
      if (!electrons) return
      const es = 0.062
      unit.set(es, es, es)
      for (let i = 0; i < meta.length; i++) {
        const md = meta[i]
        const a = md.phase + t * md.speed
        tmpP.set(Math.cos(a) * md.r, 0, Math.sin(a) * md.r).applyQuaternion(md.tilt)
        tmpM.compose(tmpP, id, unit)
        electrons.setMatrixAt(i, tmpM)
      }
      electrons.instanceMatrix.needsUpdate = true
    }

    const timer = new THREE.Timer()
    timer.connect(document)
    renderer.setAnimationLoop(() => {
      timer.update()
      const dt = Math.min(timer.getDelta(), 0.1)
      if (!reduced) {
        state.t += dt
        placeElectrons(state.t)
      }
      controls.update()
      renderer.render(scene, camera)
    })

    const resize = () => {
      const w = node.clientWidth || 1
      const h = node.clientHeight || 1
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(node)
    resize()

    api.current = { build }
    build(el)

    return () => {
      api.current = null
      ro.disconnect()
      renderer.setAnimationLoop(null)
      timer.dispose()
      clear()
      controls.dispose()
      sphere.dispose()
      Object.values(mats).forEach((x) => x.dispose())
      renderer.dispose()
      renderer.forceContextLoss() // free the GPU context right away when switching tabs
      renderer.domElement.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.current?.build(el)
  }, [el])

  return <div ref={host} className={className} role="img" aria-label={`3D model of a ${el.name} atom: ${el.shells.join(', ')} electrons per shell`} />
}
