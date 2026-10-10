import { useCallback, useEffect, useMemo, useState } from 'react'
import { LEVELS, buildQuiz } from '../lib/quiz.js'
import { CAT_BY_ID } from '../data/categories.js'
import { CloseIcon, FlameIcon, CheckIcon } from './Icons.jsx'

const BEST_KEY = 'elementary:best'
const loadBest = () => {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {} } catch { return {} }
}

export default function Quiz({ onClose, onShowElement }) {
  const [phase, setPhase] = useState('setup') // setup | play | done
  const [level, setLevel] = useState('starter')
  const [qs, setQs] = useState([])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [missed, setMissed] = useState([])
  const [best, setBest] = useState(loadBest)

  const start = (id) => {
    setLevel(id)
    setQs(buildQuiz(id, 10))
    setI(0)
    setPicked(null)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setMissed([])
    setPhase('play')
  }

  const q = qs[i]

  const answer = useCallback(
    (idx) => {
      if (picked != null || !q) return
      setPicked(idx)
      if (q.options[idx].correct) {
        setScore((s) => s + 1)
        setStreak((s) => {
          setBestStreak((b) => Math.max(b, s + 1))
          return s + 1
        })
      } else {
        setStreak(0)
        setMissed((m) => [...m, q.el])
      }
    },
    [picked, q],
  )

  const next = useCallback(() => {
    if (picked == null) return
    if (i + 1 >= qs.length) {
      setPhase('done')
      setBest((b) => {
        const nb = { ...b, [level]: Math.max(b[level] ?? 0, score) }
        try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)) } catch { /* ignore */ }
        return nb
      })
    } else {
      setI(i + 1)
      setPicked(null)
    }
  }, [picked, i, qs.length, level, score])

  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (/^[1-4]$/.test(e.key)) answer(+e.key - 1)
      else if (e.key === 'Enter' || e.key === ' ') {
        if (picked != null) {
          e.preventDefault()
          next()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer, next, picked])

  const verdict = useMemo(() => {
    if (phase !== 'done') return ''
    if (score === qs.length) return 'Flawless. You could teach this class.'
    if (score >= 8) return 'Excellent work — nearly there.'
    if (score >= 5) return 'Solid. A few more rounds and these will stick.'
    return 'Every chemist started here. Review the misses below and try again.'
  }, [phase, score, qs.length])

  const cat = q ? CAT_BY_ID[q.el.category] : null

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/70 p-3 backdrop-blur-sm" style={{ animation: 'fade-in .2s both' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Element quiz" className="glass relative w-full max-w-[580px] rounded-3xl p-5 md:p-7" style={{ animation: 'pop-in .3s cubic-bezier(.2,.8,.2,1) both' }}>
        <button onClick={onClose} aria-label="Close quiz" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow">
          <CloseIcon />
        </button>

        {phase === 'setup' && (
          <>
            <h2 className="font-display text-3xl font-bold tracking-tight">Test yourself</h2>
            <p className="mt-1.5 max-w-[44ch] text-muted">Ten questions on symbols, numbers, families, states of matter and the stories behind the elements. Pick a level to begin.</p>
            <div className="mt-5 grid gap-2.5">
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => start(l.id)} className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-accent/60 hover:bg-white/[0.08]">
                  <span>
                    <span className="block font-display text-xl font-semibold">{l.label}</span>
                    <span className="block text-sm text-muted">{l.blurb}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm text-muted">
                    {best[l.id] != null ? <>Best<br /><b className="font-display text-xl text-snow">{best[l.id]}/10</b></> : 'Not played'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'play' && q && (
          <>
            <div className="flex items-center gap-3 pr-10">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={qs.length}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((i + (picked != null ? 1 : 0)) / qs.length) * 100}%` }} />
              </div>
              <span className="text-sm text-muted">{i + 1} of {qs.length}</span>
              <span className="flex items-center gap-1 text-sm" title="Current streak">
                <FlameIcon className={`size-4 ${streak >= 2 ? 'text-[#ff9a3d]' : 'text-faint'}`} />
                {streak}
              </span>
            </div>

            <h2 className="mt-6 font-display text-[26px] font-semibold leading-tight tracking-tight">{q.prompt}</h2>
            {q.quote && <blockquote className="mt-3 rounded-2xl border-l-4 border-accent/70 bg-white/[0.05] p-4 text-[16px] leading-relaxed">{q.quote}</blockquote>}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {q.options.map((o, idx) => {
                const chosen = picked === idx
                const reveal = picked != null
                let cls = 'border-white/10 bg-white/[0.04] hover:border-accent/60 hover:bg-white/[0.09]'
                if (reveal && o.correct) cls = 'border-good/70 bg-good/15'
                else if (reveal && chosen) cls = 'border-bad/70 bg-bad/15'
                else if (reveal) cls = 'border-white/5 bg-white/[0.02] opacity-55'
                return (
                  <button key={idx} disabled={reveal} onClick={() => answer(idx)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[17px] font-medium transition ${cls}`}>
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/10 text-xs text-muted">{idx + 1}</span>
                    <span className="flex-1">{o.label}</span>
                    {reveal && o.correct && <CheckIcon className="size-5 text-good" />}
                  </button>
                )
              })}
            </div>

            {picked != null && (
              <div className="mt-5 rounded-2xl bg-white/[0.05] p-4" style={{ animation: 'pop-in .25s both' }} aria-live="polite">
                <p className="font-semibold" style={{ color: q.options[picked].correct ? 'var(--color-good)' : 'var(--color-bad)' }}>
                  {q.options[picked].correct ? 'Correct!' : `Not quite. The answer is ${q.options.find((o) => o.correct).label}.`}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  <b style={{ color: cat.color }}>{q.el.name} ({q.el.symbol}, no. {q.el.z}).</b> {q.el.fact}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button autoFocus onClick={next} className="rounded-xl bg-snow px-4 py-2 font-semibold text-ink transition hover:bg-white">
                    {i + 1 >= qs.length ? 'See results' : 'Next question'}
                  </button>
                  <button onClick={() => onShowElement(q.el.z)} className="rounded-xl border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10">
                    View {q.el.name} in 3D
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'done' && (
          <>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {score} out of {qs.length}
            </h2>
            <p className="mt-1.5 text-muted">{verdict}</p>
            <div className="mt-4 flex gap-3 text-sm">
              <span className="rounded-xl bg-white/[0.06] px-3 py-2">Best streak <b>{bestStreak}</b></span>
              <span className="rounded-xl bg-white/[0.06] px-3 py-2">Level best <b>{best[level] ?? score}/10</b></span>
            </div>
            {missed.length > 0 && (
              <div className="mt-5">
                <h3 className="font-display text-lg font-semibold">Worth another look</h3>
                <p className="text-sm text-muted">Select one to see it in the 3D table.</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {missed.map((e) => (
                    <li key={e.z}>
                      <button onClick={() => onShowElement(e.z)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition hover:bg-white/10">
                        <span className="grid size-8 place-items-center rounded-lg font-display text-sm font-bold text-ink" style={{ background: CAT_BY_ID[e.category].color }}>{e.symbol}</span>
                        {e.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => start(level)} className="rounded-xl bg-snow px-4 py-2.5 font-semibold text-ink transition hover:bg-white">Play again</button>
              <button onClick={() => setPhase('setup')} className="rounded-xl border border-white/15 px-4 py-2.5 transition hover:bg-white/10">Change level</button>
              <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-muted transition hover:text-snow">Back to the table</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
