// Simulates a phone reclaiming the GPU: (1) context lost then restored, (2) lost for good -> flat table -> "Try 3D again".
import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'
const URL = process.env.URL || 'http://localhost:4173/'
const exe = [process.env.CHROME_PATH, '/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.evaluateOnNewDocument(() => localStorage.setItem('elementary:seen', '1'))
const logs = []
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(m.type() + ': ' + m.text()))
await page.goto(URL, { waitUntil: 'networkidle0' })
await sleep(6000)
const state = () => page.evaluate(() => ({ canvases: document.querySelectorAll('[data-testid=scene] canvas').length, flat: !!document.body.innerText.match(/flat table/), toast: !!document.body.innerText.match(/Recovering/), retry: !!document.body.innerText.match(/Try 3D again/) }))
const lose = () => page.evaluate(() => { const c = document.querySelector('[data-testid=scene] canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); window.__ext = gl.getExtension('WEBGL_lose_context'); window.__ext.loseContext() })

console.log('start            ', JSON.stringify(await state()))
// 1) lost, then restored after 1.5 s
await lose(); await sleep(800)
console.log('lost             ', JSON.stringify(await state()))
await page.evaluate(() => window.__ext.restoreContext()); await sleep(2500)
console.log('restored         ', JSON.stringify(await state()))
await page.screenshot({ path: 'shots/21-recovered.png' })

// 2) lost and never restored -> flat table after ~6 s, then retry
await lose(); await sleep(7500)
console.log('lost for good    ', JSON.stringify(await state()))
await page.screenshot({ path: 'shots/22-flat-after-loss.png' })
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Try 3D again'))?.click())
await sleep(6000)
console.log('after retry      ', JSON.stringify(await state()))
await page.screenshot({ path: 'shots/23-retry-ok.png' })
console.log(logs.length ? 'console:\n' + [...new Set(logs)].join('\n') : 'console clean')
await browser.close()
