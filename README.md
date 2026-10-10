# Elementary — a 3D periodic table

An interactive, learn-by-exploring periodic table built with **React 19 · Vite · Tailwind CSS v4 · Three.js**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in ./dist
npm run preview    # serve the build on :4173
```

## What's inside

| Feature | Notes |
| --- | --- |
| **All 118 elements** | Real 18-column layout with the f-block pulled out, 7 periods, group/period/block data. |
| **Click any element** | Camera flies in; a panel shows a 3D Bohr atom (protons, neutrons, shells, orbiting electrons), a fun fact, uses, properties, electron configuration, discovery history, a melt/boil strip, neighbours and a side-by-side **Compare**. |
| **4 layouts** | Table, Rings (one ring per period), Helix, Sphere — tiles glide between them. |
| **Colour modes** | Category, state of matter, orbital block, discovery era, and heatmaps for electronegativity, ionisation energy, density, melting/boiling point and atomic mass. |
| **Temperature slider** | Drag from 0 K to 6,000 K to melt and boil the table (with presets like "Iron melts"). |
| **Raise by value** | Extrudes tiles in 3D in proportion to the value shown. |
| **Legend filter** | Click a swatch to isolate a family. Search results also highlight on the table. |
| **Quiz** | 10 questions, 3 levels, 7 question types, streaks, saved best scores, "view in 3D" after each answer. |
| **Shareable links** | The URL hash tracks the selected element, e.g. `/#Au`. |
| **Keyboard** | `/` search · `← →` previous/next · `↑ ↓` move a row · `1–4` layouts · `Esc` close. |
| **Accessible** | Keyboard focus rings, labelled controls, reduced-motion support, responsive down to phones. |

## Project layout

```
src/
  data/raw.js          the 118-element dataset (edit facts here)
  data/elements.js     derives category, position, block, electron config, phase
  data/categories.js   colours + blurbs
  lib/engine.js        Three.js scene: tiles, layouts, camera, picking
  lib/layouts.js       table / rings / helix / sphere maths
  lib/scales.js        colour modes and ramps
  lib/config.js        electron configurations (Madelung rule + exceptions)
  components/          React UI (Dock, DetailPanel, AtomViewer, Quiz, ...)
scripts/screenshots.mjs  Puppeteer visual smoke test
```

## Puppeteer visual test

```bash
npm run build && npm run preview &
CHROME_PATH=/path/to/chrome npm run shots   # writes PNGs to ./shots
```

The script uses `puppeteer-core` (no browser download). It reports any console errors.

## Data notes

Values come from standard references (IUPAC / CRC style). Melting points, boiling points and densities for the heaviest elements are estimates or unmeasured and are shown as "—" or flagged. Lutetium and lawrencium sit in the f-block rows, as in many textbook tables.
