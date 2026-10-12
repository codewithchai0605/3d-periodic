// Drives the Compound Lab and saves screenshots to ./shots/lab-*.png
import puppeteer from 'puppeteer-core'
import { existsSync, mkdirSync } from 'node:fs'
const URL = process.env.URL || 'http://localhost:4173/'
const exe = [process.env.CHROME_PATH, '/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync('shots', { recursive: true })
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const logs = []
async function open(w, h, mobile = false) {
  const page = await browser.newPage()
  if (mobile) await page.emulate({ viewport: { width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36' })
  else await page.setViewport({ width: w, height: h })
  await page.evaluateOnNewDocument(() => { localStorage.setItem('elementary:seen', '1'); window.__ctx = 0; const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (/webgl/.test(t)) window.__ctx++; return g.call(this, t, ...a) } })
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(`[${w}] ${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[${w}] pageerror: ${e.message}`))
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await sleep(5000)
  return page
}
const shot = (p, n) => p.screenshot({ path: `shots/lab-${n}.png` })
const click = (p, sel, text) => p.evaluate((s, t) => { const b = [...document.querySelectorAll(s)].find((x) => !t || x.textContent.trim().startsWith(t)); b?.click(); return !!b }, sel, text)
const search = async (p, q) => { await p.$eval('[aria-label="Search structures"]', (el) => { el.focus(); el.select() }); await p.keyboard.type(q); await sleep(300); await click(p, '[role=dialog] ul button'); await sleep(1800) }
const dialog = '[role=dialog] '

let page = await open(1440, 900)
await click(page, 'button[title^="Build compounds"]')
await sleep(3000)
await shot(page, '01-h2o')
await click(page, dialog + 'button', 'Lone pairs'); await click(page, dialog + 'button', 'Dipole'); await click(page, dialog + 'button', 'Show H–O–H')
await sleep(1500); await shot(page, '02-h2o-lp-dipole-angle')
await page.click('[aria-label="Search structures"]'); await page.keyboard.type('CrO5'); await sleep(400)
await click(page, dialog + 'ul button'); await sleep(2500); await shot(page, '03-cro5')
await search(page, 'XeF4'); await click(page, dialog + 'button', 'Lone pairs'); await sleep(1500); await shot(page, '04-xef4')
await search(page, 'benzene'); await sleep(1500); await shot(page, '05-benzene')
await search(page, 'c60'); await click(page, dialog + 'button', 'Labels'); await sleep(2000); await shot(page, '06-c60')
await search(page, 'nacl'); await sleep(2000); await shot(page, '07-nacl')
await click(page, dialog + 'button', 'VSEPR cheat sheet'); 
await click(page, '[role=tab]', 'Combine atoms'); await sleep(2500); await shot(page, '08-combine-h2o')
await click(page, dialog + 'button', 'C₂H₅OH'); await sleep(2500); await shot(page, '09-combine-ethanol')
await click(page, dialog + 'button', 'XeF₄'); await sleep(2500); await shot(page, '10-combine-xef4')
await click(page, '[role=tab]', 'Ionic formulas'); await sleep(1500)
await click(page, dialog + 'button', 'Al³⁺'); await click(page, dialog + 'button', 'SO₄²⁻'); await sleep(2500); await shot(page, '11-ionic-al2so43')
await click(page, dialog + 'button', 'Pb²⁺'); await click(page, dialog + 'button', 'I⁻'); await sleep(1500); await shot(page, '12-ionic-pbi2')
console.log('contexts after desktop session:', await page.evaluate(() => window.__ctx))
await page.close()

page = await open(390, 844, true)
await click(page, 'button[aria-label="More"]'); await sleep(400)
await click(page, '[role=menuitem]', 'Compound lab'); await sleep(3000)
await shot(page, '13-mobile-h2o')
await page.evaluate(() => document.querySelector('[role=dialog] .overflow-y-auto')?.scrollTo(0, 600)); await sleep(600); await shot(page, '14-mobile-scrolled')
await click(page, '[role=tab]', 'Combine atoms'); await sleep(2500); await shot(page, '15-mobile-combine')
console.log('contexts after mobile session:', await page.evaluate(() => window.__ctx))
await browser.close()
console.log(logs.length ? 'console:\n' + [...new Set(logs)].join('\n') : 'console clean')
