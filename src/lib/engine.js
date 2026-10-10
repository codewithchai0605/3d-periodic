import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { styleFor, luminance } from './scales.js'
import { computeLayout, cameraFor, focusPose, tableXY, PLACEHOLDERS, TILE_W, TILE_H } from './layouts.js'

const SANS = '"Instrument Sans Variable", system-ui, sans-serif'
const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif'
const BASE_DEPTH = 0.16
const MAX_BAR = 2.6
const INK = new THREE.Color('#0d1020')
const FOV = 40

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/* ---------- label textures (white glyphs on transparent; tinted by material colour) ---------- */

const TEX_W = 256
const TEX_H = Math.round((TEX_W * TILE_H) / TILE_W)

function fitText(g, text, maxW, size, weight, family) {
  let s = size
  do {
    g.font = `${weight} ${s}px ${family}`
    s -= 1
  } while (g.measureText(text).width > maxW && s > 12)
}

function elementTexture(el, renderer) {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  g.font = `600 38px ${SANS}`
  g.fillText(String(el.z), 22, 58)
  g.textAlign = 'center'
  g.font = `800 128px ${DISPLAY}`
  g.fillText(el.symbol, TEX_W / 2, 176)
  fitText(g, el.name, TEX_W - 36, 34, 600, SANS)
  g.fillText(el.name, TEX_W / 2, 226)
  g.font = `500 25px ${SANS}`
  g.globalAlpha = 0.85
  g.fillText(el.bracketMass ? `[${el.mass}]` : String(el.mass), TEX_W / 2, 270)
  return finishTexture(c, renderer)
}

function placeholderTexture(ph, renderer) {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.font = `700 54px ${DISPLAY}`
  g.fillText(ph.title, TEX_W / 2, 150)
  g.font = `500 28px ${SANS}`
  g.globalAlpha = 0.8
  g.fillText(ph.sub, TEX_W / 2, 200)
  return finishTexture(c, renderer)
}

function finishTexture(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

/* ---------------------------------------------------------------------------------------- */

export class PeriodicEngine {
  /**
   * @param {HTMLElement} container
   * @param {{elements: any[], onSelect?: (z:number)=>void, onHover?: (z:number|null, x:number, y:number)=>void, onReady?: ()=>void}} opts
   */
  constructor(container, opts) {
    this.container = container
    this.opts = opts
    this.elements = opts.elements
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    this.layoutId = 'table'
    this.style = { mode: 'category', temp: 293, bars: false }
    this.highlight = null
    this.selected = null
    this.hovered = null
    this.panelOffset = 0
    this.viewOffset = 0
    this.viewOffsetY = 0
    this.free = 1
    this.framed = false
    this.panelOffsetY = 0
    this.spin = false
    this.fly = null
    this.userMoved = false
    this.disposed = false
    this.pointer = { x: 0, y: 0, cx: 0, cy: 0, inside: false, dirty: false, down: null }

    const w = container.clientWidth || 1
    const h = container.clientHeight || 1

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(w, h)
    this.renderer.domElement.style.touchAction = 'none'
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 400)
    this.scene.add(this.camera)

    // lights ride on the camera so tiles are always lit from the viewer's side
    this.scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1f3d, 1.35))
    const key = new THREE.DirectionalLight(0xffffff, 2.1)
    key.position.set(3, 4, 6)
    const keyTarget = new THREE.Object3D()
    keyTarget.position.set(0, 0, -10)
    this.camera.add(key, keyTarget)
    key.target = keyTarget

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 2.4
    this.controls.maxDistance = 90
    this.controls.zoomSpeed = 0.9
    this.controls.autoRotateSpeed = 0.7
    this.controls.addEventListener('start', () => {
      this.fly = null
      this.userMoved = true
    })

    this.buildStars()
    this.bodyGeo = new RoundedBoxGeometry(TILE_W, TILE_H, 1, 3, 0.085)
    this.planeGeo = new THREE.PlaneGeometry(TILE_W, TILE_H)
    this.buildSelector()
    this.tiles = []
    this.placeholders = []
    this.timer = new THREE.Timer()
    this.timer.connect(document) // ignore time spent in a hidden tab
    this.raycaster = new THREE.Raycaster()

    this.layouts = {}
    for (const id of ['table', 'radial', 'helix', 'sphere']) this.layouts[id] = computeLayout(id, this.elements)

    this.bind()
    this.ready = this.init()
  }

  async init() {
    if (document.fonts?.load) {
      try {
        await Promise.all([
          document.fonts.load(`800 40px ${DISPLAY}`),
          document.fonts.load(`600 40px ${SANS}`),
          document.fonts.load(`500 40px ${SANS}`),
        ])
      } catch { /* fall back to system fonts */ }
    }
    if (this.disposed) return
    this.buildTiles()
    this.applyLayoutTargets()
    this.applyStyleTargets()
    this.setHighlight(this.highlight)

    // intro: tiles start scattered in a loose cloud, then fly home
    const r = new THREE.Vector3()
    const rq = new THREE.Euler()
    for (const t of [...this.tiles, ...this.placeholders]) {
      r.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(this.reduced ? 0 : 30 + Math.random() * 30)
      t.group.position.copy(r)
      rq.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      t.group.quaternion.setFromEuler(rq)
      t.group.scale.setScalar(0.001)
    }
    const home = cameraFor(this.layoutId, this.camera.aspect, FOV, this.free)
    const start = home.pos.clone().multiplyScalar(this.reduced ? 1 : 1.9)
    this.camera.position.copy(start)
    this.controls.target.copy(home.target)
    this.camera.lookAt(home.target)
    if (this.selected != null) {
      this.attachSelector()
      this.focusSelected()
    } else {
      this.flyTo(home.pos, home.target, this.reduced ? 0.01 : 2.6)
    }

    this.renderer.setAnimationLoop(() => this.frame())
    this.opts.onReady?.()
  }

  /* ---------------- scene building ---------------- */

  buildStars() {
    const n = 900
    const pos = new Float32Array(n * 3)
    const v = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(70 + Math.random() * 90)
      pos.set([v.x, v.y, v.z], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.32, color: 0xaebcff, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }),
    )
    this.scene.add(this.stars)
  }

  buildSelector() {
    this.selector = new THREE.Mesh(
      new RoundedBoxGeometry(TILE_W + 0.14, TILE_H + 0.14, 0.04, 2, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x8ab4ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.selector.position.z = -0.02
    this.selector.visible = false
  }

  makeTile(texture, color) {
    const group = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.12, emissive: color, emissiveIntensity: 0.2 })
    const body = new THREE.Mesh(this.bodyGeo, mat)
    const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
    const label = new THREE.Mesh(this.planeGeo, labelMat)
    group.add(body, label)
    this.scene.add(group)
    const tile = {
      group, body, label, mat, labelMat,
      baseColor: new THREE.Color(color), curColor: new THREE.Color(color),
      depth: BASE_DEPTH, depthT: BASE_DEPTH, dim: 0, dimT: 0, wait: 0, textDark: 0,
      target: { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1 },
    }
    body.userData.tile = tile
    this.syncDepth(tile)
    return tile
  }

  buildTiles() {
    for (const el of this.elements) {
      const t = this.makeTile(elementTexture(el, this.renderer), '#888888')
      t.el = el
      this.tiles.push(t)
    }
    for (const ph of PLACEHOLDERS) {
      const t = this.makeTile(placeholderTexture(ph, this.renderer), '#232a45')
      t.ph = ph
      t.fixedColor = true
      const [x, y] = tableXY(ph.col, ph.row)
      t.target.pos.set(x, y, 0)
      this.placeholders.push(t)
    }
  }

  /* ---------------- public API ---------------- */

  setLayout(id) {
    if (id === this.layoutId) return
    this.layoutId = id
    this.applyLayoutTargets()
    // ripple: tiles leave one after another, in atomic-number order
    for (const t of this.tiles) t.wait = this.reduced ? 0 : Math.min(0.85, (t.el.z - 1) * 0.0072)
    if (this.selected == null) this.resetView()
    else this.focusSelected()
  }

  setStyle(style) {
    const barsChanged = style.bars !== undefined && style.bars !== this.style.bars
    this.style = { ...this.style, ...style }
    this.applyStyleTargets()
    if (barsChanged && this.selected != null && this.tiles.length) this.focusSelected()
  }

  /** @param {Set<number>|null} set atomic numbers to emphasise; others are dimmed */
  setHighlight(set) {
    this.highlight = set
    for (const t of this.tiles) t.dimT = set && !set.has(t.el.z) ? 1 : 0
  }

  setSelected(z) {
    if (z === this.selected) return
    this.selected = z
    if (!this.tiles.length) return // applied once tiles are built
    this.attachSelector()
    if (z) this.focusSelected()
    else this.resetView()
  }

  attachSelector() {
    const tile = this.selected ? this.tiles[this.selected - 1] : null
    if (tile) {
      tile.group.add(this.selector)
      this.selector.visible = true
    } else {
      this.selector.visible = false
      this.selector.parent?.remove(this.selector)
    }
  }

  /**
   * Tell the engine how much of the canvas is covered by UI.
   * x / y: pixels to shift the visual centre by; free: fraction of viewport height left uncovered.
   */
  setView({ x = 0, y = 0, free = 1 }) {
    this.panelOffset = x
    this.panelOffsetY = y
    const changed = Math.abs(free - this.free) > 0.002
    this.free = free
    if (changed && this.tiles.length && this.selected == null && !this.userMoved) {
      if (this.framed && this.frameZs) this.frameElements(this.frameZs)
      else if (!this.framed) this.resetView()
    }
  }

  setSpin(on) {
    this.spin = on
  }

  resetView() {
    const { pos, target } = cameraFor(this.layoutId, this.camera.aspect, FOV, this.free)
    this.userMoved = false
    this.framed = false
    this.flyTo(pos, target, 1.3)
  }

  /** Fly the camera so a set of elements (atomic numbers) fills the free part of the screen. */
  frameElements(zs, pad = 1.18) {
    if (!this.tiles.length) return
    if (this.layoutId !== 'table' && this.layoutId !== 'radial') return this.resetView()
    const items = this.layouts[this.layoutId]
    const box = new THREE.Box3()
    for (const z of zs) box.expandByPoint(items[z - 1].pos)
    box.expandByScalar(0.75)
    const c = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const tv = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const th = tv * this.camera.aspect
    const d = Math.max(8, Math.max(size.y / 2 / (tv * this.free), size.x / 2 / (th * 0.92)) * pad)
    this.userMoved = false
    this.framed = true
    this.frameZs = zs
    this.flyTo(new THREE.Vector3(c.x, c.y, d), c, 1.2)
  }

  zoomBy(factor) {
    const target = this.controls.target.clone()
    const pos = target.clone().add(this.camera.position.clone().sub(target).multiplyScalar(factor))
    const d = pos.distanceTo(target)
    if (d < this.controls.minDistance || d > this.controls.maxDistance) return
    this.flyTo(pos, target, 0.45)
  }

  focusSelected() {
    const item = this.layouts[this.layoutId][this.selected - 1]
    const { pos, target } = focusPose(item, this.style.bars ? this.tiles[this.selected - 1].depthT : 0.2, this.camera.aspect < 1 ? 9.5 : 7)
    this.flyTo(pos, target, 1.1)
  }

  flyTo(pos, target, dur = 1) {
    this.fly = {
      t: 0,
      dur: this.reduced ? 0.01 : dur,
      fromPos: this.camera.position.clone(),
      toPos: pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
    }
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    this.unbind()
    this.controls.dispose()
    this.timer.dispose()
    for (const t of [...this.tiles, ...this.placeholders]) {
      t.mat.dispose()
      t.labelMat.map?.dispose()
      t.labelMat.dispose()
    }
    this.bodyGeo.dispose()
    this.planeGeo.dispose()
    this.stars.geometry.dispose()
    this.stars.material.dispose()
    this.selector.geometry.dispose()
    this.selector.material.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }

  /* ---------------- targets ---------------- */

  applyLayoutTargets() {
    const items = this.layouts[this.layoutId]
    this.tiles.forEach((t, i) => {
      t.target.pos.copy(items[i].pos)
      t.target.quat.copy(items[i].quat)
      t.target.scale = 1
    })
    for (const p of this.placeholders) {
      p.target.quat.identity()
      p.target.scale = this.layoutId === 'table' ? 1 : 0.001
    }
  }

  applyStyleTargets() {
    const { mode, temp, bars } = this.style
    for (const t of this.tiles) {
      const s = styleFor(mode, t.el, { temp })
      t.baseColor.set(s.color)
      t.textDark = luminance(s.color) > 0.6 ? 1 : 0
      t.depthT = bars ? (s.t == null ? 0.06 : BASE_DEPTH + s.t * MAX_BAR) : BASE_DEPTH
    }
  }

  syncDepth(t) {
    t.body.scale.z = Math.max(0.02, t.depth)
    t.body.position.z = t.depth / 2
    t.label.position.z = t.depth + 0.006
  }

  /* ---------------- input ---------------- */

  bind() {
    const el = this.renderer.domElement
    this._move = (e) => {
      const r = el.getBoundingClientRect()
      const p = this.pointer
      p.x = ((e.clientX - r.left) / r.width) * 2 - 1
      p.y = -((e.clientY - r.top) / r.height) * 2 + 1
      p.cx = e.clientX
      p.cy = e.clientY
      p.inside = true
      p.dirty = true
    }
    this._leave = () => {
      this.pointer.inside = false
      this.pointer.dirty = false
      this.setHover(null)
    }
    this._down = (e) => {
      this._move(e)
      this.pointer.down = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    this._up = (e) => {
      const d = this.pointer.down
      this.pointer.down = null
      if (!d) return
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y)
      if (moved < 6 && performance.now() - d.t < 600) {
        this._move(e)
        const tile = this.pick()
        if (tile) this.opts.onSelect?.(tile.el.z)
      }
    }
    this._resize = () => this.resize()
    el.addEventListener('pointermove', this._move)
    el.addEventListener('pointerleave', this._leave)
    el.addEventListener('pointerdown', this._down)
    window.addEventListener('pointerup', this._up)
    this.ro = new ResizeObserver(this._resize)
    this.ro.observe(this.container)
  }

  unbind() {
    const el = this.renderer.domElement
    el.removeEventListener('pointermove', this._move)
    el.removeEventListener('pointerleave', this._leave)
    el.removeEventListener('pointerdown', this._down)
    window.removeEventListener('pointerup', this._up)
    this.ro.disconnect()
  }

  resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    if (!this.userMoved && this.selected == null && this.tiles.length) {
      const { pos, target } = cameraFor(this.layoutId, this.camera.aspect, FOV, this.free)
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
    }
  }

  pick() {
    this.raycaster.setFromCamera({ x: this.pointer.x, y: this.pointer.y }, this.camera)
    const hits = this.raycaster.intersectObjects(
      this.tiles.map((t) => t.body),
      false,
    )
    return hits[0]?.object.userData.tile ?? null
  }

  setHover(tile) {
    const z = tile ? tile.el.z : null
    const changed = z !== this.hovered
    if (changed) {
      this.hovered = z
      this.renderer.domElement.style.cursor = z ? 'pointer' : 'grab'
    }
    if (changed || z !== null) this.opts.onHover?.(z, this.pointer.cx, this.pointer.cy)
  }

  /* ---------------- frame loop ---------------- */

  frame() {
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.12)
    const time = this.timer.getElapsed()
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 6.5)
    const kFast = this.reduced ? 1 : 1 - Math.exp(-dt * 14)

    // camera flight
    if (this.fly) {
      const f = this.fly
      f.t = Math.min(1, f.t + dt / f.dur)
      const e = easeInOut(f.t)
      this.camera.position.lerpVectors(f.fromPos, f.toPos, e)
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, e)
      if (f.t >= 1) this.fly = null
    }
    this.controls.autoRotate = this.spin && this.selected == null && !this.fly
    this.controls.update()

    // shift the view centre away from the side panel
    this.viewOffset += (this.panelOffset - this.viewOffset) * kFast
    this.viewOffsetY += (this.panelOffsetY - this.viewOffsetY) * kFast
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    if (Math.abs(this.viewOffset) > 0.5 || Math.abs(this.viewOffsetY) > 0.5) this.camera.setViewOffset(w, h, this.viewOffset / 2, this.viewOffsetY / 2, w, h)
    else if (this.camera.view?.enabled) this.camera.clearViewOffset()

    // hover picking
    if (this.pointer.dirty && this.pointer.inside && !this.pointer.down) {
      this.pointer.dirty = false
      this.setHover(this.pick())
    }

    // tiles
    const hov = this.hovered
    const sel = this.selected
    const all = this.tiles.length
    for (let i = 0; i < all + this.placeholders.length; i++) {
      const t = i < all ? this.tiles[i] : this.placeholders[i - all]
      const isEl = i < all
      const hot = isEl && (t.el.z === hov || t.el.z === sel)
      const g = t.group
      if (t.wait > 0) t.wait -= dt
      else {
        g.position.lerp(t.target.pos, k)
        g.quaternion.slerp(t.target.quat, k)
      }
      const sT = t.target.scale * (hot ? 1.07 : 1) * (isEl && t.dimT ? 0.93 : 1)
      g.scale.x += (sT - g.scale.x) * k
      g.scale.setScalar(g.scale.x)

      const dT = t.depthT + (hot ? 0.12 : 0)
      t.depth += (dT - t.depth) * k
      this.syncDepth(t)

      if (isEl) {
        t.dim += (t.dimT - t.dim) * k
        t.curColor.lerp(t.baseColor, k)
        t.mat.color.copy(t.curColor).lerp(INK, t.dim * 0.82)
        t.mat.emissive.copy(t.mat.color)
        t.mat.emissiveIntensity = hot ? 0.42 : 0.2
        const dark = t.textDark * (1 - t.dim)
        t.labelMat.color.setRGB(1 - dark * 0.92, 1 - dark * 0.9, 1 - dark * 0.82)
        t.labelMat.opacity = 1 - t.dim * 0.72
      } else {
        t.mat.color.set('#232a45')
        t.mat.emissive.set('#232a45')
        t.labelMat.color.set('#9aa4c8')
      }
      g.visible = g.scale.x > 0.01
    }

    if (this.selector.visible) this.selector.material.opacity = 0.62 + 0.3 * Math.sin(time * 3.2)

    if (!this.reduced) this.stars.rotation.y += dt * 0.004
    this.renderer.render(this.scene, this.camera)
  }
}
