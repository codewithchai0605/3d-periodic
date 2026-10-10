import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { sampleOrbital } from '../lib/orbitals.js'

/** Point-cloud view of one orbital (n, l, orientation index). Blue = positive lobe, pink = negative lobe. */
export default function OrbitalViewer({ n, l, mi, className = '', label }) {
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
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
    camera.position.set(4.2, 3.0, 5.6)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 1.4
    controls.minDistance = 3
    controls.maxDistance = 14

    // faint axes + nucleus marker for orientation
    const axes = new THREE.Group()
    for (const [dir, col] of [[[1, 0, 0], '#ff6b6b'], [[0, 1, 0], '#6bff9c'], [[0, 0, 1], '#6bb7ff']]) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...dir).multiplyScalar(-2.6), new THREE.Vector3(...dir).multiplyScalar(2.6)])
      axes.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.22 })))
    }
    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    scene.add(axes, nucleus)

    const mat = new THREE.PointsMaterial({ size: 0.038, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
    let cloud = null
    let born = 0

    function show(n, l, mi) {
      if (cloud) {
        scene.remove(cloud)
        cloud.geometry.dispose()
      }
      const { positions, colors } = sampleOrbital(n, l, mi)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      cloud = new THREE.Points(geo, mat)
      cloud.scale.setScalar(reduced ? 1 : 0.5)
      born = 0
      scene.add(cloud)
    }

    const timer = new THREE.Timer()
    timer.connect(document)
    renderer.setAnimationLoop(() => {
      timer.update()
      const dt = Math.min(timer.getDelta(), 0.1)
      if (cloud && born < 1 && !reduced) {
        born = Math.min(1, born + dt / 0.5)
        cloud.scale.setScalar(0.5 + 0.5 * (1 - Math.pow(1 - born, 3)))
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

    api.current = { show }
    show(n, l, mi)

    return () => {
      api.current = null
      ro.disconnect()
      renderer.setAnimationLoop(null)
      timer.dispose()
      controls.dispose()
      if (cloud) cloud.geometry.dispose()
      mat.dispose()
      axes.children.forEach((c) => { c.geometry.dispose(); c.material.dispose() })
      nucleus.geometry.dispose()
      nucleus.material.dispose()
      renderer.dispose()
      renderer.forceContextLoss() // free the GPU context right away when switching tabs
      renderer.domElement.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.current?.show(n, l, mi)
  }, [n, l, mi])

  return <div ref={host} className={className} role="img" aria-label={label} />
}
