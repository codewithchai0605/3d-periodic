import { ELEMENTS } from '../data/elements.js'

const cat = (id) => ELEMENTS.filter((e) => e.category === id).map((e) => e.z)

/**
 * Each step re-arranges the table: colour mode, which family to light up (filter),
 * which elements the camera should frame, and optionally an element to open.
 */
export const TOUR = [
  {
    title: '118 elements, one pattern',
    body: 'Every known element is here, ordered by atomic number: the number of protons in its nucleus. Rows are called periods and columns are groups. Elements in the same column behave alike. This tour shows why.',
    mode: 'category',
  },
  {
    title: 'Why is the table that shape?',
    body: 'Colour now shows which kind of orbital receives each element’s last electron. The s-block is 2 columns wide, the p-block 6, the d-block 10 and the f-block 14. Those widths are the numbers of electrons each orbital type can hold. The shape of the table is quantum mechanics made visible.',
    mode: 'block',
  },
  {
    title: 'Hydrogen: where everything starts',
    body: 'One proton and one electron — the simplest atom there is. It sits above the alkali metals but behaves like nothing else. Open the Orbitals tab to see its spherical 1s cloud.',
    mode: 'category',
    select: 1,
    frame: [1],
  },
  {
    title: 'Alkali metals: the eager ones',
    body: 'Group 1 has a single outer electron that it is desperate to lose. Lithium, sodium and potassium are soft enough to cut with a knife and react vigorously with water, more fiercely as you go down the column.',
    mode: 'category',
    filter: 'alkali',
    frame: cat('alkali'),
  },
  {
    title: 'Noble gases: the aloof ones',
    body: 'Group 18 has completely full outer shells, so these gases almost never react. That is why helium is safe in balloons and why neon, argon and xenon glow so reliably in lamps and signs.',
    mode: 'category',
    filter: 'noble',
    frame: cat('noble'),
  },
  {
    title: 'Halogens: the greedy ones',
    body: 'Group 17 is one electron short of a full shell, so these elements grab electrons hungrily, fluorine most of all. Pair a halogen with an alkali metal and you get a salt, such as sodium chloride on your table.',
    mode: 'category',
    filter: 'halogen',
    frame: cat('halogen'),
  },
  {
    title: 'Transition metals: the workhorses',
    body: 'The middle of the table holds strong, dense metals: iron, copper, nickel, gold. They can lose different numbers of electrons, which is why their compounds come in so many colours.',
    mode: 'category',
    filter: 'transition',
    frame: cat('transition'),
  },
  {
    title: 'The hidden rows',
    body: 'These 30 elements are pulled out of the table so it fits on a page. The lanthanides (top row) make the magnets and screens in modern devices. The actinides (bottom row) are all radioactive and include uranium and plutonium.',
    mode: 'category',
    filter: 'lanthanide',
    frame: [...cat('lanthanide'), ...cat('actinide')],
  },
  {
    title: 'A trend you can see',
    body: 'Tiles are now raised by electronegativity, how strongly an atom pulls on shared electrons. It climbs left to right across each period and falls down each group, peaking at fluorine. Orbit the table to see the landscape from the side.',
    mode: 'en',
    bars: true,
  },
  {
    title: 'Melt the periodic table',
    body: 'Drag the slider. At room temperature only mercury and bromine are liquid. Iron melts near 1,800 K, and tungsten holds out beyond 3,600 K. Which element boils away first?',
    mode: 'state',
    temp: 293,
    slider: true,
  },
  {
    title: 'Made by people',
    body: 'Almost everything after uranium was created in laboratories, atom by atom, in reactors and particle accelerators. The newest, oganesson, has only ever been made as a few atoms that last a fraction of a second.',
    mode: 'era',
    filter: 'lab',
    frame: ELEMENTS.filter((e) => e.year >= 1950).map((e) => e.z),
  },
  {
    title: 'Your turn',
    body: 'Click any tile for its atom, orbitals and story. Re-arrange the table as rings, a helix or a sphere. Plot trends, or test what you have learned.',
    mode: 'category',
    end: true,
  },
]
