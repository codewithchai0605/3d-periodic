import { CATIONS, ANIONS, supNum } from '../lib/chem.js'

const ionLabel = (i, plus) => `${i.f}${supNum(i.q > 1 ? i.q : '')}${plus ? '⁺' : '⁻'}`.replace('⁺⁺', '⁺')

function Group({ title, items, sel, setSel, plus }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted/90">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <button key={i.id} onClick={() => setSel(i.id)} aria-pressed={sel === i.id} title={i.name} className={`rounded-lg border px-2.5 py-1.5 font-display text-[15px] font-semibold transition ${sel === i.id ? 'border-white/70 bg-accent/30' : 'border-white/10 bg-white/[0.04] hover:bg-white/10'}`}>
            {ionLabel(i, plus)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function IonicTools({ cat, an, setCat, setAn }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Pick a cation and an anion. The lab balances the charges (the criss-cross method), names the compound and predicts its solubility.</p>
      {[1, 2, 3].map((q) => <Group key={`c${q}`} title={`Cations ${q}+`} items={CATIONS.filter((c) => c.q === q)} sel={cat} setSel={setCat} plus />)}
      {[1, 2, 3].map((q) => <Group key={`a${q}`} title={`Anions ${q}−`} items={ANIONS.filter((c) => c.q === q)} sel={an} setSel={setAn} />)}
    </div>
  )
}

function Beaker({ res }) {
  const liquid = res.solution?.color ?? '#7fb8ff'
  const ppt = res.ppt
  return (
    <svg viewBox="0 0 140 150" className="mx-auto h-36 w-32" role="img" aria-label={ppt ? `Beaker with a ${ppt.text} precipitate` : 'Beaker with a clear solution'}>
      <defs><clipPath id="beaker"><path d="M28 14h84l-6 112a12 12 0 0 1-12 11H46a12 12 0 0 1-12-11L28 14Z" /></clipPath></defs>
      <g clipPath="url(#beaker)">
        <rect x="20" y="48" width="100" height="100" fill={liquid} opacity={res.solution?.color ? 0.75 : 0.28} />
        {ppt && Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={42 + ((i * 37) % 58)} cy={122 - ((i * 53) % 22) } r={3 + (i % 3)} fill={ppt.color} stroke="#0003" style={{ animation: `settle .9s ${i * 0.04}s both` }} />
        ))}
      </g>
      <path d="M28 14h84l-6 112a12 12 0 0 1-12 11H46a12 12 0 0 1-12-11L28 14Z" fill="none" stroke="rgb(255 255 255 / .55)" strokeWidth="2.5" />
      <path d="M24 14h92" stroke="rgb(255 255 255 / .55)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function IonicResult({ cat, an, res, view, setView }) {
  const sol = { soluble: ['Soluble in water', 'text-good bg-good/15'], sparingly: ['Sparingly soluble', 'text-[#ffd23f] bg-[#ffd23f]/15'], insoluble: ['Insoluble: forms a precipitate', 'text-bad bg-bad/15'], acid: ['Acid (dissolves, releases H⁺)', 'text-accent bg-accent/15'] }[res.solubility]
  const sym = (i) => i.f
  const opts = [
    res.lib || res.model ? ['compound', res.lib ? `The ${res.formula} structure` : 'Lattice model'] : null,
    cat.mol ? ['cat', `${ionLabel(cat, true)} ion`] : null,
    an.mol ? ['an', `${ionLabel(an, false)} ion`] : null,
  ].filter(Boolean)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/15 to-transparent p-4">
        <div className="text-xs text-muted">Criss-cross method</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 font-display text-2xl font-bold">
            <span>{ionLabel(cat, true)}</span><span className="text-muted">+</span><span>{ionLabel(an, false)}</span>
          </div>
          <span className="text-2xl text-muted">→</span>
          <span className="font-display text-4xl font-bold">{res.formula}</span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {res.note ? res.note : (
            <>
              Charge of the cation ({cat.q}) becomes the subscript of the anion, and the anion’s charge ({an.q}) becomes the subscript of the cation: <b className="text-snow">{res.nCat} {sym(cat)}</b> and <b className="text-snow">{res.nAn} {sym(an)}</b>
              {res.g > 1 ? ' after dividing by the common factor' : ''}. Check: ({res.nCat} × +{cat.q}) + ({res.nAn} × −{an.q}) = 0 ✓
            </>
          )}
        </p>
        <div className="mt-2 font-display text-lg font-semibold capitalize">{res.name}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <Beaker res={res} />
        <div className="space-y-2 self-center">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${sol[1]}`}>{sol[0]}</span>
          {res.ppt && (
            <p className="flex items-center gap-2 text-[15px]"><i className="size-4 rounded-full border border-white/30" style={{ background: res.ppt.color }} />Precipitate: {res.ppt.text}</p>
          )}
          {res.solution && <p className="flex items-center gap-2 text-[15px]">{res.solution.color && <i className="size-4 rounded-full border border-white/30" style={{ background: res.solution.color }} />}{res.solution.text[0].toUpperCase() + res.solution.text.slice(1)}</p>}
          <p className="text-xs text-muted">Based on the standard solubility rules taught for NEET / JEE. Real solubility is a matter of degree.</p>
        </div>
      </div>

      {opts.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-semibold">See it in 3D</div>
          <div className="flex flex-wrap gap-1.5">
            {opts.map(([id, label]) => (
              <button key={id} onClick={() => setView(id)} aria-pressed={view === id} className={`rounded-xl border px-3 py-1.5 text-sm transition ${view === id ? 'border-white/60 bg-white/15' : 'border-white/10 hover:bg-white/10'}`}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
