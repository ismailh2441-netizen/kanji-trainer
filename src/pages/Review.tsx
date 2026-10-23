import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useScopedDeck } from '../hooks/useScopedDeck'
import { useLevel } from '../hooks/useLevel'
import { useStrokes } from '../hooks/useDeck'
import { buildQueue, LEVEL_THEME } from '../lib/levels'
import { dateStr, previewIvl } from '../lib/srs'
import { getProgress, recordStudy, useProgress } from '../lib/storage'
import { masuForms } from '../data/masu-forms'
import { samplePath } from '../lib/svgpath'
import type { Grade, KanjiEntry } from '../types'

const GRADE_BUTTONS: { grade: Grade; label: string; key: string; cls: string }[] = [
  { grade: 1, label: 'Again', key: '1', cls: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 active:scale-95' },
  { grade: 2, label: 'Hard', key: '2', cls: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 active:scale-95' },
  { grade: 3, label: 'Good', key: '3', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95' },
  { grade: 4, label: 'Easy', key: '4', cls: 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 active:scale-95' },
]

const TALLY_LABEL: Record<Grade, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }

/** Seconds each stroke takes to draw, plus the pause before the next one. */
const STROKE_DUR = 0.5
const STROKE_GAP = 0.2

/**
 * Animated stroke-order display (writing motion).
 * Draws each KanjiVG stroke in sequence over a faint guide of the full character,
 * with numbered markers at each stroke's starting point.
 * `run` acts as a remount key so Replay restarts the animation.
 */
function StrokeAnimation({ strokes, run }: { strokes: string[]; run: number }) {
  const starts = useMemo(() => strokes.map((d) => samplePath(d)[0]), [strokes])
  return (
    <svg
      key={run}
      viewBox="0 0 109 109"
      className="mx-auto mt-3 w-44 rounded-xl border border-slate-100 bg-slate-50/80"
      role="img"
      aria-label="Stroke order animation"
    >
      {/* Faint guide of the complete character */}
      {strokes.map((d, i) => (
        <path
          key={`guide-${i}`}
          d={d}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* Strokes drawn one by one (writing motion) */}
      {strokes.map((d, i) => (
        <path
          key={`draw-${i}`}
          d={d}
          fill="none"
          stroke="#1e293b"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="kanji-stroke-anim"
          style={{
            strokeDasharray: 1,
            animation: `kanji-stroke-draw ${STROKE_DUR}s ease-out ${
              i * (STROKE_DUR + STROKE_GAP)
            }s both`,
          }}
        />
      ))}
      {/* Numbered start markers, appearing as each stroke begins */}
      {starts.map((p, i) =>
        p ? (
          <g
            key={`num-${i}`}
            className="kanji-marker-anim"
            style={{ animation: `kanji-marker-in 0.15s ease-out ${i * (STROKE_DUR + STROKE_GAP)}s both` }}
          >
            <circle cx={p.x} cy={p.y} r={5.5} fill="#6366f1" />
            <text
              x={p.x}
              y={p.y + 2.6}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight="bold"
              fill="#ffffff"
            >
              {i + 1}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  )
}

export default function Review() {
  const level = useLevel()
  const progress = useProgress()
  const { deck, section } = useScopedDeck(level ?? 'n5')
  const location = useLocation()
  const practice = new URLSearchParams(location.search).get('practice') === '1'
  const practiceHref = `${location.pathname}?${location.search ? `${location.search.slice(1)}&` : ''}practice=1`

  const [session, setSession] = useState(0)
  const [forceAll, setForceAll] = useState(false)
  const [queue, setQueue] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [tally, setTally] = useState<Record<Grade, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })
  const [done, setDone] = useState(false)
  const [showStrokes, setShowStrokes] = useState(false)
  const [strokeRun, setStrokeRun] = useState(0)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [feedbackKey, setFeedbackKey] = useState(0)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cardAnim, setCardAnim] = useState<'in' | 'out' | null>(null)

  useEffect(() => {
    if (!deck || !level) return
    if (practice) {
      setQueue(deck.map((e) => e.kanji))
    } else {
      const p = getProgress()
      const limit = forceAll || section ? Number.MAX_SAFE_INTEGER : p.settings.newPerDay
      setQueue(buildQueue(deck, p, level, limit))
    }
    setRevealed(false)
    setTally({ 1: 0, 2: 0, 3: 0, 4: 0 })
    setDone(false)
    setShowStrokes(false)
    setCombo(0)
    setFeedback(null)
    setCardAnim(null)
  }, [deck, level, session, forceAll, practice, section])

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    }
  }, [])

  const index = useMemo(() => queue[0], [queue])
  const entry: KanjiEntry | undefined = useMemo(
    () => deck?.find((e) => e.kanji === index),
    [deck, index],
  )

  useEffect(() => {
    if (cardAnim === 'in') {
      const timer = setTimeout(() => setCardAnim(null), 400)
      return () => clearTimeout(timer)
    }
  }, [cardAnim])

  const { strokes, loading: strokesLoading } = useStrokes(entry?.kanji ?? null)

  function grade(g: Grade) {
    if (!entry || !level || done || cardAnim === 'out') return
    recordStudy(level, entry.kanji, g)
    setTally((t) => ({ ...t, [g]: t[g] + 1 }))

    if (g === 1) {
      setCombo(0)
      setFeedback('wrong')
      setFeedbackKey((k) => k + 1)
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setFeedback(null), 420)
      setQueue((q) => [...q.slice(1), q[0]])
    } else {
      setCombo((c) => c + 1)
      setFeedback('correct')
      setFeedbackKey((k) => k + 1)
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setFeedback(null), 520)
      const nextQueue = queue.slice(1)
      setCardAnim('out')
      setTimeout(() => {
        setQueue(nextQueue)
        if (nextQueue.length === 0) {
          setDone(true)
          setCardAnim(null)
        } else {
          setRevealed(false)
          setShowStrokes(false)
          setCardAnim('in')
        }
        setFeedback(null)
      }, 400)
      return
    }
    setRevealed(false)
    setShowStrokes(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
        setShowStrokes(true)
        return
      }
      if (revealed && entry) {
        const btn = GRADE_BUTTONS.find((b) => b.key === e.key)
        if (btn) {
          e.preventDefault()
          grade(btn.grade)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!level) return null
  const theme = LEVEL_THEME[level]

  if (!deck) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Loading deck…</div>
  }

  if (done) {
    const total = tally[1] + tally[2] + tally[3] + tally[4]
    const perfect = tally[1] === 0
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm animate-fade-in-scale">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 animate-pop-in">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 animate-fade-in-up">Session complete</h2>
        <p className="mt-1 text-slate-500 animate-fade-in-up">
          {total} card{total === 1 ? '' : 's'} reviewed{perfect && total > 0 ? ' · Perfect!' : ''}.
        </p>
        <div className="mt-5 flex justify-center gap-3 text-sm">
          {GRADE_BUTTONS.map((b, idx) => (
            <div
              key={b.grade}
              className="rounded-xl border border-slate-200 px-3 py-2 animate-fade-in-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="text-slate-500">{TALLY_LABEL[b.grade]}</div>
              <div className="font-bold text-slate-900">{tally[b.grade]}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '280ms' }}>
          <Link
            to={`/${level}${location.search}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => { setForceAll(true); setSession((s) => s + 1); }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-95 transition-transform"
          >
            {practice ? 'Practice again' : 'Keep studying'}
          </button>
        </div>
      </div>
    )
  }

  if (!entry) {
    const newLeft = deck.filter((e) => progress.levels[level].cards[e.kanji] === undefined).length
    const limited = newLeft > 0
    const lpNow = progress.levels[level]
    const learnedToday = lpNow.newToday.date === dateStr(Date.now()) ? lpNow.newToday.count : 0
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className={`mx-auto grid size-14 place-items-center rounded-full text-2xl font-bold ${limited ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
        >
          {limited ? '!' : '✓'}
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          {limited ? 'Daily limit reached' : 'All caught up'}
        </h2>
        <p className="mt-1 text-slate-500">
          {limited
            ? `You've learned ${learnedToday} new kanji today (your limit: ${progress.settings.newPerDay} per day). ` +
              'Come back tomorrow, or continue now.'
            : 'No cards are due right now.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/${level}${location.search}`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <Link
            to={practiceHref}
            className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            {section ? `Practice section ${section.id} again` : 'Practice again'}
          </Link>
          {limited && (
            <button
              type="button"
              onClick={() => {
                setForceAll(true)
                setSession((s) => s + 1)
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Learn new cards anyway
            </button>
          )}
        </div>
      </div>
    )
  }

  const card = progress.levels[level].cards[entry.kanji]
  const previews = revealed
    ? GRADE_BUTTONS.map((b) => previewIvl(card, b.grade, Date.now()))
    : null

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {section ? `Section ${section.id} · ` : ''}
          {practice ? 'Practice · ' : ''}
          {queue.length} card{queue.length === 1 ? '' : 's'} left
        </span>
        <div className="flex items-center gap-2">
          {combo > 1 && (
            <span key={combo} className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 animate-pop-in">
              Combo {combo}x
            </span>
          )}
          <span>{entry.strokes} strokes</span>
        </div>
      </div>

      <div
        key={`${entry.kanji}-${feedbackKey}`}
        className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform ${
          feedback === 'wrong' ? 'animate-shake' : cardAnim === 'out' ? 'animate-slide-out-left' : cardAnim === 'in' ? 'animate-slide-in-right-edge' : ''
        }`}
      >
        <div
          className={`flex min-h-56 flex-col items-center justify-center rounded-t-2xl px-6 py-10 ${theme.bg}`}
        >
          <div className={`font-jp text-8xl leading-none text-slate-900 ${feedback === 'correct' ? 'animate-pop-in' : ''}`}>
            {entry.kanji}
          </div>
        </div>

        {revealed && (
          <div className="border-t border-slate-200 px-6 py-5 animate-fade-in-up">
            <div className="font-bold text-slate-900">{entry.meanings.join(', ')}</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">On</span>
                <span className="font-jp text-slate-800">{entry.on.join(' · ') || '—'}</span>
              </div>
              <div>
                <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">Kun</span>
                <span className="font-jp text-slate-800">{entry.kun.join(' · ') || '—'}</span>
              </div>
            </div>

            {/* Stroke order / writing motion */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">Stroke order</span>
                <div className="flex gap-2">
                  {showStrokes && strokes && strokes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStrokeRun((r) => r + 1)}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
                    >
                      Replay
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowStrokes((v) => !v)}
                    className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-transform"
                  >
                    {showStrokes ? 'Hide' : 'Show writing motion'}
                  </button>
                </div>
              </div>

              {showStrokes && (
                <div className="mt-2">
                  {strokesLoading ? (
                    <p className="text-center text-sm text-slate-500">Loading strokes…</p>
                  ) : strokes && strokes.length > 0 ? (
                    <>
                      <StrokeAnimation strokes={strokes} run={strokeRun} />
                      <p className="mt-2 text-center text-xs text-slate-500">
                        {strokes.length} strokes · drawn in order
                      </p>
                    </>
                  ) : (
                    <p className="text-center text-sm text-slate-500">
                      Stroke data unavailable for {entry.kanji}.
                    </p>
                  )}
                </div>
              )}
            </div>

            {entry.examples.length > 0 && (
              <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                {entry.examples.slice(0, 3).map((ex, i) => {
                  const masu = masuForms[ex.word]
                  return (
                    <li key={i} className="text-sm">
                      <div>
                        <span className="font-jp font-semibold text-slate-900">
                          {ex.word}
                          {masu && ` / ${masu.masu}`}
                        </span>
                        <span className="font-jp ml-2 text-slate-500">
                          {ex.reading}
                          {masu && ` / ${masu.masuReading}`}
                        </span>
                        <span className="ml-2 text-slate-600">— {ex.english}</span>
                      </div>
                      <div className="mt-0.5 text-slate-500">
                        <span className="font-jp">{ex.sentence}</span>
                        <span className="ml-2 text-xs">({ex.sentenceEnglish})</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 p-4">
          {!revealed ? (
            <button
              type="button"
              onClick={() => {
                setRevealed(true)
                setShowStrokes(true)
              }}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
            >
              Show answer
              <span className="ml-2 text-xs font-normal text-indigo-200">Space</span>
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {GRADE_BUTTONS.map((b, i) => (
                <button
                  key={b.grade}
                  type="button"
                  onClick={() => grade(b.grade)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition-transform ${b.cls}`}
                >
                  <div>{b.label}</div>
                  <div className="text-xs font-normal opacity-70">
                    {previews?.[i]} · {b.key}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
