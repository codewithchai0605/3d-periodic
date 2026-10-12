// Visual smoke test: drives the built app with Puppeteer and saves screenshots to ./shots
// Usage:  npm run build && npm run preview   (in one terminal)   then   npm run shots
// Set CHROME_PATH if no browser is found (puppeteer-core does not download one).
import puppeteer from 'puppeteer-core'
import { mkdirSync, existsSync } from 'node:fs'

const URL = process.env.URL || 'http://localhost:4173/'
const CANDIDATES = [process.env.CHROME_PATH, '/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean)
const executablePath = CANDIDATES.find((p) => existsSync(p))
if (!executablePath) throw new Error('No Chrome found. Set CHROME_PATH=/path/to/chrome')

mkdirSync('shots', { recursive: true })
const GL = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const launch = (args = GL) => puppeteer.launch({ executablePath, headless: 'new', args })
const errors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(browser, w, h, hash = '', wait = 7000) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${w}] ${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${w}] pageerror: ${e.message}`))
  await page.evaluateOnNewDocument(() => localStorage.setItem('elementary:seen', '1'))
  await page.goto(URL + hash, { waitUntil: 'networkidle0' })
  await sleep(wait)
  return page
}
const shot = (page, name) => page.screenshot({ path: `shots/${name}.png` })
const clickText = (page, text, sel = 'button') =>
  page.evaluate((t, s) => { const b = [...document.querySelectorAll(s)].find((x) => x.textContent.trim().includes(t)); b?.click(); return !!b }, text, sel)
const clickLabel = (page, label) => page.evaluate((l) => { document.querySelector(`[aria-label="${l}"]`)?.click() }, label)

const browser = await launch()

/* ---------- desktop ---------- */
let page = await open(browser, 1440, 900)
await shot(page, '01-table')

await page.keyboard.press('/')
await page.keyboard.type('radioactive')
await sleep(1500)
await shot(page, '02-search-radioactive')
await page.keyboard.press('Escape')
await page.keyboard.press('Escape')
await page.evaluate(() => document.activeElement?.blur())

await page.goto(URL + '#Fe', { waitUntil: 'networkidle0' })
await sleep(6000)
await clickText(page, 'Orbitals', '[role=tab]')
await sleep(1500)
await shot(page, '03-orbital-4s')
await clickText(page, '3d', '[aria-label="Occupied orbitals"] button')
await sleep(300)
await clickText(page, 'dxy', '[aria-label="Orientation"] button')
await sleep(2000)
await shot(page, '04-orbital-3d')
await page.evaluate(() => document.querySelector('aside .overflow-y-auto')?.scrollTo(0, 700))
await sleep(500)
await clickText(page, 'Melting point', 'aside button')
await sleep(400)
await shot(page, '05-panel-properties')
await page.close()

page = await open(browser, 1440, 900)
await page.select('select', 'crust')
await clickText(page, 'Raise by value')
await sleep(6000)
await shot(page, '06-crust-bars')
await page.close()

page = await open(browser, 1440, 900)
await clickLabel(page, 'Trends explorer')
await sleep(1000)
await shot(page, '07-trends-ie')
await page.select('[role=dialog] label:nth-of-type(1) select', 'en')
await sleep(500)
await page.evaluate(() => { const g = document.querySelectorAll('svg g[role=button]')[8]; g?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); g?.dispatchEvent(new MouseEvent('mouseenter')) })
await sleep(400)
await shot(page, '08-trends-en')
await page.close()

page = await open(browser, 1440, 900)
await clickLabel(page, 'Show a random element') // sanity: random works
await sleep(300)
await page.keyboard.press('Escape')
await sleep(1000)
await clickText(page, 'Tour')
await sleep(3500)
await shot(page, '09-tour-0')
for (let i = 0; i < 3; i++) { await clickLabel(page, 'Next step').catch(() => {}); await clickText(page, 'Next'); await sleep(300) }
await sleep(5500)
await shot(page, '10-tour-alkali')
for (let i = 0; i < 6; i++) { await clickText(page, 'Next'); await sleep(200) }
await sleep(4500)
await shot(page, '11-tour-melt')
await page.close()

/* ---------- tablet + phone ---------- */
page = await open(browser, 820, 1100)
await shot(page, '12-tablet')
await page.close()

page = await open(browser, 390, 844)
await shot(page, '13-mobile-table')
await clickLabel(page, 'More')
await sleep(400)
await shot(page, '14-mobile-menu')
await page.close()

page = await open(browser, 390, 844, '#Au', 6500)
await shot(page, '15-mobile-gold')
await clickLabel(page, 'Expand details')
await sleep(1200)
await shot(page, '16-mobile-gold-expanded')
await page.close()

await browser.close()

/* ---------- no-WebGL fallback ---------- */
const nogl = await launch(['--no-sandbox', '--disable-gpu', '--disable-3d-apis', '--disable-webgl'])
page = await open(nogl, 1280, 800, '', 2500)
await shot(page, '17-fallback-2d')
await nogl.close()

console.log(errors.length ? 'Console issues:\n' + [...new Set(errors)].join('\n') : 'No console errors or warnings.')
