// Mobile stress test: emulates a phone, flips through elements/tabs, and reports how many
// WebGL contexts were created and how many draw calls happen while the app is idle.
// Usage: npm run build && npm run preview   then   node scripts/stress.mjs
import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const URL = process.env.URL || 'http://localhost:4173/'
const exe = [process.env.CHROME_PATH, '/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.emulate({
  viewport: { width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
})
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('elementary:seen', '1')
  window.__ctx = 0
  window.__draws = 0
  window.__lost = 0
  const get = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    if (/webgl/.test(type)) {
      window.__ctx++
      this.addEventListener('webglcontextlost', () => window.__lost++)
    }
    return get.call(this, type, ...a)
  }
  for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      const o = C.prototype[k]
      C.prototype[k] = function (...a) { window.__draws++; return o.apply(this, a) }
    }
  }
})
const logs = []
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(m.type() + ': ' + m.text()))
await page.goto(URL + '#Fe', { waitUntil: 'networkidle0' })
await sleep(5000)
const click = (sel, text) => page.evaluate((s, t) => { const b = [...document.querySelectorAll(s)].find((x) => !t || x.textContent.trim().startsWith(t)); b?.click(); return !!b }, sel, text)

const after = async (label) => console.log(label.padEnd(34), 'contexts:', await page.evaluate(() => window.__ctx), ' lost:', await page.evaluate(() => window.__lost))
await after('after load')
for (let i = 0; i < 25; i++) { await click('[aria-label="Next element"]'); await sleep(120) }
await after('after 25 x next element')
for (let i = 0; i < 8; i++) { await click('[role=tab]', i % 2 ? 'Atom' : 'Orbitals'); await sleep(250) }
await after('after 8 x tab switches')

// idle draw-call rate: close the panel, let everything settle, then watch for 4 s
await click('[aria-label="Close details"]')
await sleep(6000)
const d0 = await page.evaluate(() => window.__draws)
await sleep(4000)
const d1 = await page.evaluate(() => window.__draws)
console.log('idle draw calls per second:'.padEnd(34), ((d1 - d0) / 4).toFixed(0))
console.log(logs.length ? 'console:\n' + [...new Set(logs)].join('\n') : 'console clean')
await browser.close()
