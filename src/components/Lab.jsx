import { useEffect, useMemo, useState } from 'react'
import MoleculeViewer from './MoleculeViewer.jsx'
import MolInfo, { measureText } from './MolInfo.jsx'
import LabStructures from './LabStructures.jsx'
import { MixTools, MixResult } from './LabMix.jsx'
import { IonicTools, IonicResult } from './LabIonic.jsx'
import { CloseIcon, FlaskIcon, SpinIcon, ResetIcon } from './Icons.jsx'
import { MOL_BY_ID, CATIONS, ANIONS, react, ionResult, dipoleVector } from '../lib/chem.js'

const TABS = [['structures', 'Structures'], ['combine', 'Combine atoms'], ['ionic', 'Ionic formulas']]
const MODES = [['ball', 'Ball & stick'], ['space', 'Space-filling'], ['stick', 'Sticks']]

function Toggle({ on, onClick, children, disabled, title }) {
  return (
    <button onClick={onClick} aria-pressed={on} disabled={disabled} title={title} className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-35 ${on ? 'border-accent/70 bg-accent/25 text-snow' : 'border-white/15 bg-ink/60 text-muted hover:text-snow'}`}>
      {children}
    </button>
  )
}

export default function Lab({ initial = {}, onClose, onOpenElement }) {
  const [tab, setTab] = useState(initial.tab ?? 'structures')
  const [molId, setMolId] = useState(initial.molId ?? 'h2o')
  const [flask, setFlask] = useState(initial.flask ?? { H: 2, O: 1 })
  const [sel, setSel] = useState(0)
  const [form, setForm] = useState(0)
  const [catId, setCatId] = useState('na')
  const [anId, setAnId] = useState('cl')
  const [ionView, setIonView] = useState('compound')

  const [mode, setMode] = useState('ball')
  const [showLp, setShowLp] = useState(false)
  const [showDipole, setShowDipole] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [spin, setSpin] = useState(true)
  const [size, setSize] = useState(0.55)
  const [picks, setPicks] = useState([])
  const [resetKey, setResetKey] = useState(0)

  const outcome = useMemo(() => react(flask), [flask])
  useEffect(() => { setSel(0); setForm(0) }, [flask])

  const cat = CATIONS.find((c) => c.id === catId)
  const an = ANIONS.find((c) => c.id === anId)
  const ionRes = useMemo(() => ionResult(cat, an), [cat, an])

  /* ---- which structure does the 3D view show? ---- */
  let current = null
  if (tab === 'structures') current = MOL_BY_ID[molId]
  else if (tab === 'combine') {
    if (outcome?.type === 'compound') {
      const r = outcome.results[sel] ?? outcome.results[0]
      if (r) current = r.source === 'library' ? MOL_BY_ID[r.ids[form] ?? r.ids[0]] : r.model
    } else if (outcome?.type === 'element') current = outcome.forms[form] ?? outcome.forms[0] ?? null
  } else {
    const wanted = { compound: ionRes.lib ?? ionRes.model, cat: cat.mol && MOL_BY_ID[cat.mol], an: an.mol && MOL_BY_ID[an.mol] }
    current = wanted[ionView] ?? wanted.compound ?? wanted.an ?? wanted.cat ?? null
  }
  const viewKey = tab === 'ionic' ? (ionView === 'compound' && !(ionRes.lib ?? ionRes.model) ? (an.mol ? 'an' : cat.mol ? 'cat' : 'compound') : ionView) : ionView

  useEffect(() => {
    setPicks([])
    if (current) setShowLabels(current.atoms.length <= 9 && current.kind !== 'lattice')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const dp = current ? dipoleVector(current) : null
  const onPick = (i) => setPicks((p) => (i == null ? [] : p.includes(i) ? p.filter((x) => x !== i) : p.length >= 3 ? [i] : [...p, i]))
  const live = current && picks.length >= 2 ? measureText(current, picks) : null
  const pickMol = (id) => { setMolId(id); setTab('structures') }

  const tools = tab === 'structures' ? <LabStructures molId={molId} onPick={setMolId} />
    : tab === 'combine' ? <MixTools flask={flask} setFlask={setFlask} outcome={outcome} />
    : <IonicTools cat={catId} an={anId} setCat={(v) => { setCatId(v); setIonView('compound') }} setAn={(v) => { setAnId(v); setIonView('compound') }} />

  const molInfo = current && (
    current.model ? (
      <div className="rounded-2xl bg-white/[0.045] p-3 text-sm text-muted"><b className="text-snow">{current.name}.</b> {current.notes[0]}</div>
    ) : (
      <MolInfo mol={current} picks={picks} setPicks={setPicks} onPickMol={pickMol} onOpenElement={onOpenElement} />
    )
  )
  const info = tab === 'structures' ? molInfo : (
    <div className="space-y-5">
      {tab === 'combine' ? <MixResult flask={flask} setFlask={setFlask} outcome={outcome} sel={sel} setSel={setSel} form={form} setForm={setForm} /> : <IonicResult cat={cat} an={an} res={ionRes} view={viewKey} setView={setIonView} />}
      {molInfo}
    </div>
  )

  return (
    <div className="fixed inset-0 z-30 bg-ink/80 backdrop-blur-md" style={{ animation: 'fade-in .2s both' }}>
      <div role="dialog" aria-modal="true" aria-label="Compound lab" className="glass absolute inset-1.5 flex flex-col overflow-hidden rounded-3xl md:inset-4" style={{ animation: 'pop-in .3s cubic-bezier(.2,.8,.2,1) both' }}>
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-3 py-2.5 md:px-5">
          <div className="flex items-center gap-2">
            <FlaskIcon className="size-5 text-accent" />
            <h1 className="font-display text-xl font-bold tracking-tight">Compound lab</h1>
          </div>
          <div role="tablist" aria-label="Lab sections" className="order-3 flex w-full rounded-xl border border-white/10 bg-white/[0.04] p-0.5 md:order-none md:w-auto">
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex-1 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-sm font-medium transition md:flex-none ${tab === id ? 'bg-snow text-ink shadow' : 'text-muted hover:text-snow'}`}>{label}</button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close the lab" className="ml-auto grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow"><CloseIcon /></button>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:overflow-hidden">
          {/* 3D viewer */}
          <div className="sticky top-0 z-10 order-1 h-[44dvh] min-h-[260px] bg-[radial-gradient(circle_at_50%_40%,#1b2658,#0b0f26_78%)] lg:relative lg:col-start-2 lg:row-start-1 lg:h-auto">
            {current ? (
              <MoleculeViewer mol={current} mode={mode} showLp={showLp} showDipole={showDipole} showLabels={showLabels} spin={spin} size={size} picks={picks} onPick={onPick} resetKey={resetKey} className="absolute inset-0" />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">{tab === 'combine' ? 'Add atoms to the flask to see what they form.' : 'No 3D structure for this selection.'}</div>
            )}
            {current && (
              <>
                <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
                  <div role="radiogroup" aria-label="Display style" className="flex rounded-lg border border-white/15 bg-ink/70 p-0.5 backdrop-blur">
                    {MODES.map(([id, label]) => (
                      <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className={`rounded-md px-2 py-1 text-xs font-medium transition ${mode === id ? 'bg-snow text-ink' : 'text-muted hover:text-snow'}`}>{label}</button>
                    ))}
                  </div>
                  <Toggle on={showLabels} onClick={() => setShowLabels(!showLabels)}>Labels</Toggle>
                  {current.lp?.length > 0 && <Toggle on={showLp} onClick={() => setShowLp(!showLp)} title="Show the lone pairs on the central atom">Lone pairs</Toggle>}
                  {dp && <Toggle on={showDipole} onClick={() => setShowDipole(!showDipole)} title="Show the net dipole moment">Dipole</Toggle>}
                  <Toggle on={spin} onClick={() => setSpin(!spin)} title="Auto-rotate"><SpinIcon className="inline size-3.5" /></Toggle>
                  <Toggle on={false} onClick={() => setResetKey((k) => k + 1)} title="Reset the view"><ResetIcon className="inline size-3.5" /></Toggle>
                </div>
                {current.kind === 'lattice' && (
                  <label className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg border border-white/15 bg-ink/70 px-2.5 py-1 text-xs text-muted backdrop-blur">
                    Atom size
                    <input type="range" min={0.2} max={1} step={0.05} value={size} onChange={(e) => setSize(+e.target.value)} aria-label="Atom size" className="h-1 w-24 accent-[#8ab4ff]" />
                  </label>
                )}
                {showDipole && dp && dp.mag < 0.15 && <div className="absolute bottom-2 right-2 rounded-lg border border-white/15 bg-ink/70 px-2.5 py-1 text-xs backdrop-blur">Net dipole ≈ 0: the bond dipoles cancel</div>}
                {showDipole && dp && dp.mag >= 0.15 && <div className="absolute bottom-2 right-2 rounded-lg border border-[#ffd23f]/40 bg-ink/70 px-2.5 py-1 text-xs backdrop-blur">Arrow points toward the δ⁻ end</div>}
                {live && <div className="absolute right-2 top-2 rounded-xl border border-[#ffd23f]/50 bg-ink/80 px-3 py-1.5 text-right backdrop-blur"><div className="text-[11px] text-muted">{live.title}</div><div className="font-display text-xl font-bold text-[#ffd23f]">{live.value}</div></div>}
              </>
            )}
          </div>

          {/* tools */}
          <div className={`scroll-thin px-3 py-4 md:px-5 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:overflow-y-auto lg:border-r lg:border-white/10 ${tab === 'structures' ? 'order-3' : 'order-2'}`}>{tools}</div>

          {/* info */}
          <div className={`scroll-thin px-3 pb-8 pt-4 md:px-5 lg:col-start-2 lg:row-start-2 lg:max-h-[46vh] lg:overflow-y-auto lg:border-t lg:border-white/10 lg:pb-5 ${tab === 'structures' ? 'order-2' : 'order-3'}`}>{info}</div>
        </div>
      </div>
    </div>
  )
}
