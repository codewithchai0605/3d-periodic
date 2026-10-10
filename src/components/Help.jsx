import { CloseIcon } from './Icons.jsx'
import { byZ } from '../data/elements.js'
import { CAT_BY_ID } from '../data/categories.js'

const KEYS = [
  ['← →', 'Previous / next element'],
  ['↑ ↓', 'Move up / down a row'],
  ['/', 'Search'],
  ['1 – 4', 'Table, rings, helix, sphere'],
  ['Esc', 'Close panel or dialog'],
]

/** Same element for everyone on a given day. */
export const elementOfTheDay = () => byZ((Math.floor(Date.now() / 86400000) % 118) + 1)

export default function Help({ onClose, onExplore, onTour }) {
  const eod = elementOfTheDay()
  const c = CAT_BY_ID[eod.category]
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/70 p-3 backdrop-blur-sm" style={{ animation: 'fade-in .2s both' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="How to use Elementary" className="glass relative my-auto w-full max-w-[640px] rounded-3xl p-6 md:p-8" style={{ animation: 'pop-in .3s cubic-bezier(.2,.8,.2,1) both' }}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow"><CloseIcon /></button>
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">Welcome to Elementary</h2>
        <p className="mt-2 max-w-[50ch] text-muted">All 118 known elements, floating in 3D. Poke around — nothing here can explode.</p>

        <button onClick={() => onExplore(eod.z)} className="group mt-5 flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left transition hover:bg-white/[0.09]">
          <span className="grid size-16 shrink-0 place-items-center rounded-xl font-display text-3xl font-extrabold text-ink" style={{ background: c.color }}>{eod.symbol}</span>
          <span className="min-w-0">
            <span className="block text-xs text-muted">Element of the day</span>
            <span className="block font-display text-xl font-semibold">{eod.name}</span>
            <span className="line-clamp-2 text-sm text-muted">{eod.fact}</span>
          </span>
        </button>

        <ol className="mt-5 grid gap-3 text-[15px]">
          <li className="flex gap-3"><b className="shrink-0 font-display text-lg text-accent">Look around.</b><span className="text-muted">Drag to orbit, scroll or pinch to zoom, right-drag to pan.</span></li>
          <li className="flex gap-3"><b className="shrink-0 font-display text-lg text-accent">Click an element.</b><span className="text-muted">The camera flies in and a panel opens: a spinning atom, a 3D orbital explorer, its story, properties, shells and more.</span></li>
          <li className="flex gap-3"><b className="shrink-0 font-display text-lg text-accent">Change the view.</b><span className="text-muted">Rearrange the elements as a table, rings, helix or sphere. Colour them by family, state of matter at any temperature, crust abundance or a heatmap, then raise tiles by value.</span></li>
          <li className="flex gap-3"><b className="shrink-0 font-display text-lg text-accent">Go deeper.</b><span className="text-muted">Take the guided tour, plot trends against each other, search by words like “radioactive” or “battery”, or test yourself with the quiz.</span></li>
        </ol>

        <div className="mt-6 rounded-2xl bg-white/[0.05] p-4">
          <h3 className="font-display text-base font-semibold">Keyboard</h3>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {KEYS.map(([k, d]) => (
              <div key={k} className="flex items-center gap-2.5">
                <dt><kbd className="rounded-md border border-white/20 bg-white/[0.06] px-1.5 py-0.5 text-xs">{k}</kbd></dt>
                <dd className="text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button autoFocus onClick={onTour} className="rounded-xl bg-snow px-5 py-2.5 font-semibold text-ink transition hover:bg-white">Take the 2-minute tour</button>
          <button onClick={onClose} className="rounded-xl border border-white/15 px-5 py-2.5 transition hover:bg-white/10">Start exploring</button>
        </div>
      </div>
    </div>
  )
}
