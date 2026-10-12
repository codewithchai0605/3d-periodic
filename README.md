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
| **Click any element** | Camera flies in; a panel shows a 3D Bohr atom, a fun fact, uses, properties, electron configuration, discovery history, a melt/boil strip, neighbours and a side-by-side **Compare**. |
| **Orbital explorer** | Switch the panel to *Orbitals* to see s, p, d and f orbitals as 3D probability clouds (blue/pink = wave-function sign). Tap any orbital in an element's electron configuration to jump straight to it. |
| **Guided tour** | A 12-step walkthrough that moves the camera, lights up families, raises tiles and melts the table while explaining why the periodic table looks the way it does. |
| **Trends explorer** | Plot any property against any other (ionisation energy vs atomic number shows the periodic law as a sawtooth). Hover to read, click to open the element. |
| **Compound lab** | 140 NEET/JEE structures as rotatable 3D models: VSEPR shapes (BeCl₂ → IF₇), ions (SO₄²⁻, Cr₂O₇²⁻), oxoacids, CrO₅, B₂H₆, P₄O₁₀, coordination compounds (cis/trans isomers, ferrocene), 56 organic molecules (conformers, cis/trans, R/S enantiomers, glucose anomers), carbon allotropes (diamond, graphite, C₆₀) and unit cells (SC, BCC, FCC, HCP, NaCl, CsCl, ZnS, CaF₂, Na₂O). Toggle ball-and-stick / space-filling / sticks, lone pairs, net dipole and labels; click atoms to measure distances and angles; read shape, hybridisation, bond angle, polarity and exam notes. Includes a VSEPR cheat sheet. |
| **Combine atoms** | Drop atoms into a flask: the lab finds the compound, handles leftovers (limiting reagent), shows isomers, writes the balanced formation equation and shows the 3D structure. |
| **Ionic formulas** | Criss-cross formula writing, naming, solubility rules, precipitate and solution colours (qualitative analysis), plus 3D polyatomic ions. |
| **4 layouts** | Table, Rings (one ring per period), Helix, Sphere — tiles ripple between them. |
| **Colour modes** | Category, state of matter, orbital block, discovery era, and heatmaps for electronegativity, ionisation energy, density, melting/boiling point, atomic mass and abundance in Earth's crust. |
| **Temperature slider** | 0 K to 6,000 K with presets, in K, °C or °F. |
| **Raise by value** | Extrudes tiles in 3D in proportion to the value shown. |
| **Smart search** | Names, symbols, numbers, plus words like `radioactive`, `noble`, `gas`, `synthetic`, `battery` or a discoverer such as `curie`. Matches light up on the table. |
| **Property explainers** | Tap any property card to see what it means in plain language. |
| **Quiz** | 10 questions, 4 levels (including a *Molecules (NEET/JEE)* level on shape, hybridisation, angle, lone pairs and polarity), 8+ question types, streaks, saved best scores, "view in 3D" after each answer. |
| **Element of the day, random element** | Greets first-time visitors; the dice button jumps to a random element. |
| **Shareable links** | The URL hash tracks the selected element, e.g. `/#Au`. |
| **Keyboard** | `/` search, arrows previous/next/up/down, `1-4` layouts, `Esc` close. |
| **Responsive & accessible** | Side panel on desktop, a snapping bottom sheet (swipe the handle) on phones, a menu for secondary actions, focus rings, labelled controls, reduced-motion support, and a flat 2D table when WebGL is unavailable. |

## Project layout

```
src/
  data/molecules.json  generated 3D structures + exam notes (see tools/)
  lib/chem.js          library index, search, compound prediction, equations, ionic engine
  data/raw.js          the 118-element dataset (edit facts here)
  data/elements.js     derives category, position, block, electron config, phase
  data/categories.js   colours + blurbs
  lib/engine.js        Three.js scene: tiles, layouts, camera, picking
  lib/layouts.js       table / rings / helix / sphere maths
  lib/scales.js        colour modes and ramps
  lib/config.js        electron configurations (Madelung rule + exceptions)
  lib/orbitals.js      orbital point-cloud sampling (hydrogen-like wave functions)
  lib/tour.js          guided tour script
  components/          React UI (Dock, DetailPanel, AtomViewer, OrbitalViewer, Trends, Tour, Quiz, ...)
tools/                 Python builders for the molecule library (VSEPR/Z-matrix geometry, RDKit for organics, crystal lattices)
scripts/screenshots.mjs  Puppeteer visual smoke test
```

## Mobile performance & stability

Phones are much stricter than desktops about GPU resources, so the app is built to stay light:

- **Two WebGL contexts, total.** The atom and orbital viewers share one renderer, so browsing elements never creates new contexts.
- **Idle means idle.** The main scene stops drawing when nothing is moving (0 draw calls/second at rest), is capped to ~60 fps on 90/120 Hz screens, and pulses the selection glow at ~30 fps.
- **Touch-device budget.** No MSAA, a cap on rendered pixels, smaller label textures, and throttled resize handling (the mobile address bar fires many resizes).
- **Context-loss recovery.** If the browser reclaims the GPU, the scene resumes automatically when it is handed back. If it is not, the flat 2D table appears with a **Try 3D again** button.

`npm run stress` emulates a phone, flips through elements and tabs, and reports contexts created and idle draw calls. `npm run recovery` simulates a lost GPU context.

## Puppeteer visual test

```bash
npm run build && npm run preview &
CHROME_PATH=/path/to/chrome npm run shots   # writes PNGs to ./shots
```

The script uses `puppeteer-core` (no browser download). It reports any console errors.

## Data notes

Values come from standard references (IUPAC / CRC style). Melting points, boiling points and densities for the heaviest elements are estimates or unmeasured and are shown as "—" or flagged. Lutetium and lawrencium sit in the f-block rows, as in many textbook tables.

## Adding or editing molecules

The structure library is generated by Python so every angle and bond length is checked numerically.

```bash
pip install rdkit numpy          # RDKit is only needed for the organic molecules
python tools/build_molecules.py  # rewrites src/data/molecules.json
```

- `tools/inorganic.py`: VSEPR shapes, ions, oxoacids, complexes (add a molecule with `vs(...)` and `reg(...)`).
- `tools/organic.py`: add a line with a SMILES string; 3D coordinates come from RDKit (ETKDG + MMFF).
- `tools/solids.py`: unit cells and carbon allotropes.

`npm run lab` (`node scripts/lab.mjs`) drives the lab with Puppeteer and saves screenshots.
