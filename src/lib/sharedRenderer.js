import * as THREE from 'three'

/**
 * The atom and orbital viewers share ONE WebGL renderer (and therefore one GPU context).
 * Creating a context per viewer exhausts mobile browsers: they cap active contexts, and
 * rapid create/destroy cycles can crash the GPU process.
 */
let shared = null

function getRenderer() {
  if (shared) return shared
  shared = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const el = shared.domElement
  el.style.display = 'block'
  el.style.touchAction = 'none'
  el.addEventListener('webglcontextlost', (e) => e.preventDefault())
  return shared
}

/** Mount the shared canvas inside `node`. Returns the renderer, or null if WebGL is unavailable. */
export function acquireRenderer(node) {
  try {
    const r = getRenderer()
    node.appendChild(r.domElement)
    return r
  } catch {
    return null
  }
}

/** Detach the canvas from `node` (the renderer itself stays alive for the next viewer). */
export function releaseRenderer(node) {
  if (shared && shared.domElement.parentNode === node) node.removeChild(shared.domElement)
}

/**
 * Animation loop for a viewer: ~60 fps cap, pauses while off-screen or in a hidden tab.
 * @returns {() => void} stop function
 */
export function runViewerLoop(node, step) {
  let raf = 0
  let visible = true
  let last = 0
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
  io.observe(node)
  const timer = new THREE.Timer()
  timer.connect(document)
  const tick = (ts) => {
    raf = requestAnimationFrame(tick)
    if (!visible || document.hidden || ts - last < 12) return
    last = ts
    timer.update(ts)
    step(Math.min(timer.getDelta(), 0.1))
  }
  raf = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    timer.dispose()
  }
}
