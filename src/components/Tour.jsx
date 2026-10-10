import { useEffect, useRef } from 'react'
import { TOUR } from '../lib/tour.js'
import { TempControl } from './Dock.jsx'
import { ChevronL, ChevronR, CloseIcon, QuizIcon } from './Icons.jsx'

export default function Tour({ step, setStep, onExit, onQuiz, temp, setTemp, rightInset, onHeight }) {
  const box = useRef(null)
  const s = TOUR[step]
  const last = step === TOUR.length - 1

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => onHeight?.(e.target.getBoundingClientRect().height))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [onHeight])

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-10 flex justify-center px-2 pb-2 transition-[right] duration-300 md:px-3 md:pb-3" style={{ right: rightInset }}>
      <section ref={box} aria-label="Guided tour" className="glass pointer-events-auto w-full max-w-[680px] rounded-2xl p-4 md:p-5" style={{ animation: 'pop-in .3s both' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted">Guided tour · {step + 1} of {TOUR.length}</div>
            <h2 key={step} className="mt-0.5 font-display text-[22px] font-bold leading-tight tracking-tight md:text-[26px]" style={{ animation: 'fade-in .3s both' }}>{s.title}</h2>
          </div>
          <button onClick={onExit} aria-label="Exit the tour" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow"><CloseIcon /></button>
        </div>
        <p key={`b${step}`} className="mt-2 text-[15px] leading-relaxed text-snow/90" style={{ animation: 'fade-in .35s both' }}>{s.body}</p>

        {s.slider && <div className="mt-3"><TempControl temp={temp} setTemp={setTemp} compact /></div>}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={TOUR.length} aria-valuenow={step + 1}>
            {TOUR.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className="group grid h-4 flex-1 place-items-center">
                <span className={`h-1.5 w-full rounded-full transition ${i === step ? 'bg-accent' : i < step ? 'bg-white/40' : 'bg-white/15 group-hover:bg-white/30'}`} />
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={() => setStep(step - 1)} disabled={step === 0} aria-label="Previous step" className="grid size-10 place-items-center rounded-xl border border-white/15 text-snow transition hover:bg-white/10 disabled:opacity-30"><ChevronL /></button>
            {last ? (
              <>
                <button onClick={onQuiz} className="flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-medium transition hover:bg-white/10"><QuizIcon className="size-4" />Quiz me</button>
                <button onClick={onExit} className="h-10 rounded-xl bg-snow px-4 font-semibold text-ink transition hover:bg-white">Explore</button>
              </>
            ) : (
              <button onClick={() => setStep(step + 1)} autoFocus className="flex h-10 items-center gap-1.5 rounded-xl bg-snow pl-4 pr-2.5 font-semibold text-ink transition hover:bg-white">Next <ChevronR className="size-4" /></button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
