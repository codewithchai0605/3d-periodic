export const CATEGORIES = [
  { id: 'alkali',     label: 'Alkali metals',        color: '#ff5d6c', blurb: 'Group 1. Soft, shiny and wildly reactive — each has a single outer electron it is eager to give away.' },
  { id: 'alkaline',   label: 'Alkaline earth metals', color: '#ff9a3d', blurb: 'Group 2. Harder and denser than the alkali metals, still reactive, with two outer electrons.' },
  { id: 'transition', label: 'Transition metals',     color: '#f0cc4d', blurb: 'Groups 3–12. Strong, dense metals that form colourful compounds and can lose different numbers of electrons.' },
  { id: 'post',       label: 'Post-transition metals', color: '#9fd356', blurb: 'Softer metals with lower melting points, sitting between the transition metals and the metalloids.' },
  { id: 'metalloid',  label: 'Metalloids',            color: '#43c59e', blurb: 'Part metal, part non-metal. They conduct electricity only a little, which makes them ideal semiconductors.' },
  { id: 'nonmetal',   label: 'Reactive nonmetals',    color: '#38b6e8', blurb: 'Poor conductors, often gases or brittle solids. Carbon, nitrogen, oxygen and their neighbours build living things.' },
  { id: 'halogen',    label: 'Halogens',              color: '#5b86f5', blurb: 'Group 17. Reactive non-metals one electron short of a full shell, so they readily form salts with metals.' },
  { id: 'noble',      label: 'Noble gases',           color: '#9b7bf3', blurb: 'Group 18. Full outer shells make them colourless, odourless and extremely unreactive.' },
  { id: 'lanthanide', label: 'Lanthanides',           color: '#e982e6', blurb: 'The 15 "rare-earth" metals La–Lu. Silvery and chemically similar — vital for magnets, lasers and screens.' },
  { id: 'actinide',   label: 'Actinides',             color: '#cf5a9c', blurb: 'The 15 heavy elements Ac–Lr. All are radioactive, and include uranium and plutonium.' },
]

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

export const BLOCKS = [
  { id: 's', label: 's-block', color: '#ff7a6b', blurb: 'The last electron goes into an s orbital. Groups 1–2 plus helium.' },
  { id: 'p', label: 'p-block', color: '#4fb8e8', blurb: 'The last electron goes into a p orbital. Groups 13–18 (except helium).' },
  { id: 'd', label: 'd-block', color: '#f0cc4d', blurb: 'The last electron goes into a d orbital. The transition metals.' },
  { id: 'f', label: 'f-block', color: '#c77ae6', blurb: 'The last electron goes into an f orbital. The lanthanides and actinides.' },
]
export const BLOCK_BY_ID = Object.fromEntries(BLOCKS.map((b) => [b.id, b]))

export const ERAS = [
  { id: 'ancient',  label: 'Known since antiquity', color: '#e9b44c', test: (y) => y === 0 },
  { id: 'early',    label: 'Before 1800',           color: '#e8795f', test: (y) => y > 0 && y < 1800 },
  { id: 'chem',     label: '1800 – 1899',           color: '#6db7e8', test: (y) => y >= 1800 && y < 1900 },
  { id: 'atomic',   label: '1900 – 1949',           color: '#5fd4a8', test: (y) => y >= 1900 && y < 1950 },
  { id: 'lab',      label: '1950 – today (made in labs)', color: '#b184f2', test: (y) => y >= 1950 },
]

export const STATES = [
  { id: 'solid',   label: 'Solid',   color: '#6a8cff' },
  { id: 'liquid',  label: 'Liquid',  color: '#2fd0c0' },
  { id: 'gas',     label: 'Gas',     color: '#ff7aa0' },
  { id: 'unknown', label: 'Unknown', color: '#4a5168' },
]
