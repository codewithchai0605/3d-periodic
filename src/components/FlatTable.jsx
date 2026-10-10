import { ELEMENTS } from '../data/elements.js'
import { styleFor, luminance } from '../lib/scales.js'

/** 2D fallback used when WebGL is unavailable. Honours colour mode, temperature and highlights. */
export default function FlatTable({ mode, temp, highlight, selected, onSelect }) {
  return (
    <div className="absolute inset-0 overflow-auto px-3 pb-64 pt-20 scroll-thin">
      <div className="mx-auto mb-3 max-w-[1100px] rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-sm text-muted">
        3D graphics aren’t available in this browser, so here’s the flat table. Everything else still works.
      </div>
      <div className="mx-auto grid min-w-[880px] max-w-[1100px] gap-1" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
        {ELEMENTS.map((e) => {
          const { color } = styleFor(mode, e, { temp })
          const dim = highlight && !highlight.has(e.z)
          const dark = luminance(color) > 0.6
          return (
            <button
              key={e.z}
              onClick={() => onSelect(e.z)}
              aria-label={`${e.name}, atomic number ${e.z}`}
              aria-pressed={selected === e.z}
              className="relative aspect-[0.85] rounded-md text-center transition hover:scale-110 hover:z-10"
              style={{ gridColumn: e.col, gridRow: e.row, background: color, color: dark ? '#10142a' : '#fff', opacity: dim ? 0.25 : 1, outline: selected === e.z ? '2px solid #fff' : 'none' }}
            >
              <span className="absolute left-1 top-0.5 text-[9px] font-semibold">{e.z}</span>
              <span className="font-display text-base font-extrabold">{e.symbol}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
