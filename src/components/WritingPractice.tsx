import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import StrokeAnimation from './StrokeAnimation'
import { distToPolyline, polylineLength, samplePath, type Point } from '../lib/svgpath'

/** KanjiVG paths use a 109×109 view box. All drawing happens in that space. */
const VIEW = 109

type Mode = 'guided' | 'free'
type Feedback = 'good' | 'retry' | 'incomplete' | null

interface Gesture {
  points: Point[]
  kind: 'correct' | 'wrong' | 'free'
  /** Guided step index (correct strokes only). */
  step?: number
}

interface WritingPracticeProps {
  kanji: string
  strokes: string[] | null
  loading?: boolean
  className?: string
}

function drawPolyline(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (pts.length === 0) return
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y)
  ctx.stroke()
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = '#e9eef7'
  ctx.lineWidth = 0.6
  ctx.setLineDash([2.5, 3])
  ctx.beginPath()
  ctx.moveTo(VIEW / 2, 0)
  ctx.lineTo(VIEW / 2, VIEW)
  ctx.moveTo(0, VIEW / 2)
  ctx.lineTo(VIEW, VIEW / 2)
  ctx.stroke()
  ctx.strokeStyle = '#f0f4fa'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(VIEW, VIEW)
  ctx.moveTo(VIEW, 0)
  ctx.lineTo(0, VIEW)
  ctx.stroke()
  ctx.restore()
}

function drawStartDot(ctx: CanvasRenderingContext2D, p: Point, n: number) {
  ctx.save()
  ctx.fillStyle = '#6366f1'
  ctx.beginPath()
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 7px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(n), p.x, p.y + 0.4)
  ctx.restore()
}

/** True when a drawn polyline starts and ends near the target stroke and follows it. */
function isStrokeMatch(pts: Point[], target: Point[]): boolean {
  if (target.length === 0 || pts.length === 0) return false

  const len = polylineLength(target)
  const first = pts[0]
  const last = pts[pts.length - 1]
  const startTol = Math.min(12, Math.max(6, len * 0.25))
  const endTol = Math.min(16, Math.max(8, len * 0.3))

  let sum = 0
  for (const p of pts) sum += distToPolyline(p, target)
  const avg = sum / pts.length
  const coverage = len > 0 ? polylineLength(pts) / len : 0
  const minCoverage = len < 12 ? 0.25 : 0.55
  const enoughPoints = pts.length > 1 || len < 10

  return (
    enoughPoints &&
    Math.hypot(first.x - target[0].x, first.y - target[0].y) <= startTol &&
    Math.hypot(last.x - target[target.length - 1].x, last.y - target[target.length - 1].y) <= endTol &&
    avg <= 6 &&
    coverage >= minCoverage
  )
}

function gradeFreeDrawing(
  gestures: Gesture[],
  targets: Point[][],
): { ok: boolean; onTarget: boolean } {
  const pts = gestures.flatMap((g) => g.points)
  if (pts.length < 2 || targets.length === 0) return { ok: false, onTarget: false }

  let sum = 0
  for (const p of pts) {
    let nearest = Infinity
    for (const t of targets) {
      if (!t.length) continue
      nearest = Math.min(nearest, distToPolyline(p, t))
    }
    sum += nearest === Infinity ? 0 : nearest
  }
  const avg = sum / pts.length
  const totalLen = targets.reduce((acc, t) => acc + polylineLength(t), 0)
  const drawnLen = gestures.reduce((acc, g) => acc + polylineLength(g.points), 0)
  const coverage = totalLen > 0 ? drawnLen / totalLen : 0
  const onTarget = avg <= 7

  return { ok: onTarget && coverage >= 0.45, onTarget }
}

/**
 * Interactive writing practice: shows the animated stroke order beside a canvas
 * where the character can be traced stroke by stroke (guided) or freely.
 * Completed strokes stay on the canvas until undone or cleared.
 */
export default function WritingPractice({
  kanji,
  strokes,
  loading = false,
  className = '',
}: WritingPracticeProps) {
  const targets = useMemo(() => (strokes ?? []).map((d) => samplePath(d)), [strokes])

  const [mode, setMode] = useState<Mode>('guided')
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState<boolean[]>([])
  const [gestures, setGestures] = useState<Gesture[]>([])
  const [live, setLive] = useState<Point[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [done, setDone] = useState(false)
  const [hinting, setHinting] = useState(true)
  const [hintRun, setHintRun] = useState(0)
  const [animRun, setAnimRun] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const gesturesRef = useRef<Gesture[]>([])
  const liveRef = useRef<Point[]>([])
  const lastRef = useRef<Point | null>(null)

  // Reset everything whenever the card (or its stroke data) changes.
  useEffect(() => {
    setStep(0)
    setCompleted(new Array(targets.length).fill(false))
    gesturesRef.current = []
    setGestures([])
    liveRef.current = []
    setLive([])
    lastRef.current = null
    pointerIdRef.current = null
    drawingRef.current = false
    setFeedback(null)
    setDone(false)
    setHinting(true)
    setHintRun(0)
    setAnimRun((r) => r + 1)
  }, [kanji, targets])

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scale = canvas.width / VIEW
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.clearRect(0, 0, VIEW, VIEW)
    drawGrid(ctx)

    if (targets.length === 0) return

    // Guide layer.
    if (mode === 'guided') {
      // Remaining strokes stay faint so the full shape is still readable.
      ctx.save()
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 4.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 0; i < targets.length; i++) {
        if (completed[i] || i === step) continue
        drawPolyline(ctx, targets[i])
      }
      ctx.restore()
    } else {
      // Free mode: the whole character is the guide.
      ctx.save()
      ctx.strokeStyle = '#cbd5f5'
      ctx.lineWidth = 4.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const t of targets) drawPolyline(ctx, t)
      ctx.restore()

      ctx.save()
      ctx.fillStyle = '#94a3b8'
      for (const t of targets) {
        if (!t.length) continue
        ctx.beginPath()
        ctx.arc(t[0].x, t[0].y, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // Committed strokes: keep every attempt on the canvas.
    if (gestures.length > 0) {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const g of gestures) {
        ctx.strokeStyle = g.kind === 'wrong' ? '#fb7185' : '#0f172a'
        ctx.lineWidth = g.kind === 'wrong' ? 5 : 6
        drawPolyline(ctx, g.points)
      }
      ctx.restore()
    }

    // Current stroke + its numbered start dot, above old ink so it stays visible.
    if (mode === 'guided') {
      const current = targets[step]
      if (current?.length && !done) {
        ctx.save()
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.setLineDash([4, 5])
        drawPolyline(ctx, current)
        ctx.restore()
        drawStartDot(ctx, current[0], step + 1)
      }
    }

    // The stroke currently under the pointer.
    if (live.length > 0) {
      ctx.save()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      drawPolyline(ctx, live)
      ctx.restore()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1))
    const size = Math.round(VIEW * 3 * dpr)
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size
      canvas.height = size
    }
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, step, completed, gestures, live, done, targets])

  function commitGestures(next: Gesture[]) {
    gesturesRef.current = next
    setGestures(next)
  }

  function resetLive() {
    liveRef.current = []
    lastRef.current = null
    setLive([])
  }

  function toPoint(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * VIEW) / rect.width,
      y: ((e.clientY - rect.top) * VIEW) / rect.height,
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (drawingRef.current || done) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture is best-effort; drawing still works without it.
    }
    drawingRef.current = true
    pointerIdRef.current = e.pointerId
    setHinting(false)
    setFeedback(null)
    const p = toPoint(e)
    liveRef.current = [p]
    lastRef.current = p
    setLive([p])
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || e.pointerId !== pointerIdRef.current) return
    e.preventDefault()
    const p = toPoint(e)
    const last = lastRef.current
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.6) return
    lastRef.current = p
    liveRef.current.push(p)
    setLive([...liveRef.current])
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || e.pointerId !== pointerIdRef.current) return
    drawingRef.current = false
    pointerIdRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const pts = liveRef.current
    resetLive()
    if (pts.length === 0) return
    if (mode === 'guided') commitGuidedStroke(pts)
    else commitFreeStroke(pts)
  }

  function onPointerCancel(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== pointerIdRef.current) return
    drawingRef.current = false
    pointerIdRef.current = null
    resetLive()
  }

  function commitGuidedStroke(pts: Point[]) {
    const target = targets[step]
    if (!target?.length) return

    if (!isStrokeMatch(pts, target)) {
      commitGestures([...gesturesRef.current, { points: pts, kind: 'wrong' }])
      setFeedback('retry')
      setHinting(true)
      return
    }

    commitGestures([...gesturesRef.current, { points: pts, kind: 'correct', step }])
    setCompleted((prev) => {
      const next = [...prev]
      next[step] = true
      return next
    })
    setFeedback('good')

    if (step >= targets.length - 1) {
      setDone(true)
      setHinting(false)
    } else {
      setStep(step + 1)
      setHinting(true)
    }
  }

  function commitFreeStroke(pts: Point[]) {
    const next = [...gesturesRef.current, { points: pts, kind: 'free' as const }]
    commitGestures(next)
    const result = gradeFreeDrawing(next, targets)
    setFeedback(result.ok ? 'good' : result.onTarget ? 'incomplete' : 'retry')
    setHinting(!result.ok)
  }

  function undoStroke() {
    const list = gesturesRef.current
    if (list.length === 0) return
    const last = list[list.length - 1]
    commitGestures(list.slice(0, -1))

    if (last.kind === 'correct' && last.step !== undefined) {
      const prevStep = last.step
      setCompleted((c) => {
        const next = [...c]
        next[prevStep] = false
        return next
      })
      setStep(prevStep)
      setDone(false)
    }

    setFeedback(null)
    setHinting(true)
    setHintRun((r) => r + 1)
  }

  function clearMistakes() {
    if (mode === 'free') {
      commitGestures([])
    } else {
      commitGestures(gesturesRef.current.filter((g) => g.kind !== 'wrong'))
    }
    setFeedback(null)
    setHinting(true)
    setHintRun((r) => r + 1)
  }

  function restart() {
    setStep(0)
    setCompleted(new Array(targets.length).fill(false))
    commitGestures([])
    resetLive()
    setFeedback(null)
    setDone(false)
    setHinting(true)
    setHintRun((r) => r + 1)
    setAnimRun((r) => r + 1)
  }

  function changeMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setStep(0)
    setCompleted(new Array(targets.length).fill(false))
    commitGestures([])
    resetLive()
    setFeedback(null)
    setDone(false)
    setHinting(true)
    setHintRun((r) => r + 1)
  }

  function showHint() {
    setHinting(true)
    setHintRun((r) => r + 1)
    setFeedback(null)
  }

  const total = targets.length
  const hasWrong = gestures.some((g) => g.kind === 'wrong')

  if (loading) {
    return (
      <p className={`rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 ${className}`}>
        Loading strokes…
      </p>
    )
  }

  if (!strokes || strokes.length === 0) {
    return (
      <p className={`rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 ${className}`}>
        Stroke data unavailable for {kanji}.
      </p>
    )
  }

  const currentPath = mode === 'guided' && !done ? strokes[step] : null
  const showHintDot = Boolean(hinting && currentPath)
  const completedCount = completed.filter(Boolean).length
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0

  const status = done ? (
    <span className="inline-block font-semibold text-emerald-600 animate-pop-in">Kanji complete 🎉</span>
  ) : feedback === 'good' ? (
    <span className="inline-block font-semibold text-emerald-600 animate-pop-in">
      {mode === 'guided' ? 'Nice!' : 'Nice match!'}
    </span>
  ) : feedback === 'incomplete' ? (
    <span className="font-semibold text-amber-600">Keep going — trace the rest of the character</span>
  ) : feedback === 'retry' ? (
    <span className="font-semibold text-rose-600">
      {mode === 'guided' ? 'Try again — follow the dashed stroke' : 'Trace closer to the guide'}
    </span>
  ) : (
    <span className="text-slate-500">
      {mode === 'guided' ? 'Start at the numbered dot' : 'Draw the whole character'}
    </span>
  )

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {mode === 'guided' ? `Stroke ${Math.min(step + 1, total)}/${total}` : `${total} strokes`}
        </span>
        <div className="inline-flex rounded-xl border border-slate-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => changeMode('guided')}
            aria-pressed={mode === 'guided'}
            className={`rounded-[10px] px-2.5 py-1 font-semibold transition-colors ${
              mode === 'guided' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Guided
          </button>
          <button
            type="button"
            onClick={() => changeMode('free')}
            aria-pressed={mode === 'free'}
            className={`rounded-[10px] px-2.5 py-1 font-semibold transition-colors ${
              mode === 'free' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Free
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-32">
          <StrokeAnimation strokes={strokes} run={animRun} className="w-full" />
          <button
            type="button"
            onClick={() => setAnimRun((r) => r + 1)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
          >
            Replay
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative mx-auto aspect-square w-full max-w-[288px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
            <canvas
              ref={canvasRef}
              width={VIEW * 3}
              height={VIEW * 3}
              role="img"
              aria-label={`Practice writing ${kanji}`}
              className="block size-full touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
            />
            {showHintDot && (
              <svg
                key={`hint-${step}-${hintRun}`}
                viewBox="0 0 109 109"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full"
              >
                <g className="kanji-hint-dot">
                  <circle r={6} fill="#6366f1" opacity={0.16} />
                  <circle r={3.4} fill="#6366f1" />
                  <animateMotion dur="1.1s" repeatCount="indefinite" path={currentPath ?? undefined} />
                </g>
              </svg>
            )}
          </div>

          <p className="mt-2 min-h-4 text-center text-xs" role="status" aria-live="polite">
            {status}
          </p>

          {mode === 'guided' && (
            <div className="mx-auto mt-1 h-1 max-w-[288px] overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={showHint}
          disabled={mode === 'free' || done}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-transform"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={undoStroke}
          disabled={gestures.length === 0}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-transform"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clearMistakes}
          disabled={mode === 'guided' ? !hasWrong : gestures.length === 0}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {mode === 'guided' ? 'Clear mistakes' : 'Clear ink'}
        </button>
        <button
          type="button"
          onClick={restart}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
        >
          Restart
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {mode === 'guided'
          ? 'Trace each dashed stroke from its numbered dot. Your strokes stay on the canvas; mistakes turn pink until you undo them.'
          : 'Every stroke stays on the canvas. Undo removes the last one; Restart clears everything.'}
      </p>
    </div>
  )
}
