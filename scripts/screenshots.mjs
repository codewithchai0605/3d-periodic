// Visual smoke test: drives the built app with Puppeteer and saves screenshots to ./shots
// Usage:  npm run build && npm run preview &   then   npm run shots
// Set CHROME_PATH if Puppeteer can't find a browser (puppeteer-core does not download one).
import puppeteer from 'puppeteer-core'
import { mkdirSync, existsSync } from 'node:fs'

const URL = process.env.URL || 'http://localhost:4173/'
const CANDIDATES = [process.env.CHROME_PATH, '/opt/google/chrome/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean)
const executablePath = CANDIDATES.find((p) => existsSync(p))
if (!executablePath) throw new Error('No Chrome found. Set CHROME_PATH=/path/to/chrome')

mkdirSync('shots', { recursive: true })
const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
})
const errors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(w, h, hash = '') {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${w}] ${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${w}] pageerror: ${e.message}`))
  await page.evaluateOnNewDocument(() => localStorage.setItem('elementary:seen', '1'))
  await page.goto(URL + hash, { waitUntil: 'networkidle0' })
  await sleep(9000) // intro animation (software WebGL is slow)
  return page
}
const shot = (page, name) => page.screenshot({ path: `shots/${name}.png` })

// Desktop
let page = await open(1440, 900)
await shot(page, '01-table')

await page.keyboard.press('/')
await page.keyboard.type('iron')
await sleep(600)
await shot(page, '02-search')
await page.keyboard.press('Enter')
await sleep(6000)
await shot(page, '03-element-iron')

await page.keyboard.press('Escape')
await sleep(5000)
await page.select('select', 'state')
await sleep(300)
await shot(page, '04-state-293K')
await page.$eval('#temp', (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '1500'); el.dispatchEvent(new Event('input', { bubbles: true })) })
await sleep(4000)
await shot(page, '05-state-1500K')

await page.select('select', 'en')
await page.keyboard.press('Escape')
const bars = await page.$$('button[aria-pressed]')
for (const b of bars) { const t = await b.evaluate((n) => n.textContent); if (t.includes('Raise')) await b.click() }
await sleep(5000)
await shot(page, '06-bars-electronegativity')
await page.keyboard.press('3')
await sleep(6000)
await shot(page, '07-helix')
await page.keyboard.press('4')
await sleep(6000)
await shot(page, '08-sphere')
await page.keyboard.press('2')
await sleep(6000)
await shot(page, '09-rings')
await page.close()

// Quiz
page = await open(1440, 900)
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Quiz'))?.click())
await sleep(500)
await shot(page, '10-quiz-setup')
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Starter'))?.click())
await sleep(400)
await page.keyboard.press('1')
await sleep(400)
await shot(page, '11-quiz-question')
await page.close()

// Mobile
page = await open(390, 844)
await shot(page, '12-mobile-table')
await page.close()
page = await open(390, 844, '#Au')
await sleep(4000)
await shot(page, '13-mobile-gold')
await page.close()

await browser.close()
console.log(errors.length ? 'Console issues:\n' + [...new Set(errors)].join('\n') : 'No console errors or warnings.')
