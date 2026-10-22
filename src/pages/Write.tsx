import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useScopedDeck } from '../hooks/useScopedDeck'
import { useLevel } from '../hooks/useLevel'
import { useStrokes } from '../hooks/useDeck'
import { distToPolyline, polylineLength, samplePath, type Point } from '../lib/svgpath'


export default function Write() {
  const level = useLevel()
  const { deck, section } = useScopedDeck(level ?? 'n5')
  const [index, setIndex] = useState(0)
  const safeIndex = deck && deck.length > 0 ? Math.min(index, deck.length - 1) : 0
  const entry = deck?.[safeIndex]
  const { strokes: svgStrokes } = useStrokes(entry?.kanji ?? null)

  const [mode, setMode] = useState<'trace' | 'guide'>('guide')
  const [step, setStep] = useState(0)
  const [drew, setDrew] = useState<Point[]>([])
  const [score, setScore] = useState<number | null>(null)

  const canvRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  const targets = useMemo(
    () => (svgStrokes ?? []).map((d) => samplePath(d)),
    [svgStrokes],
  )
  const currentTarget = targets[step] ?? []

  useEffect(() => {
    setStep(0)
    setDrew([])
    setScore(null)
  }, [entry, svgStrokes])

  function clear() {
    setDrew([])
    setScore(null)
  }

  function drawGuide(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.strokeStyle = '#cbd5f5'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const t of targets) {
      if (t.length === 0) continue
      ctx.beginPath()
      ctx.moveTo(t[0].x, t[0].y)
      for (let i = 1; i < t.length; i++) ctx.lineTo(t[i].x, t[i].y)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawTrace(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.setLineDash([4, 6])
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let s = 0; s < step; s++) {
      const t = targets[s]
      if (!t.length) continue
      ctx.beginPath()
      ctx.moveTo(t[0].x, t[0].y)
      for (let i = 1; i < t.length; i++) ctx.lineTo(t[i].x, t[i].y)
      ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (drew.length) {
      ctx.beginPath()
      ctx.moveTo(drew[0].x, drew[0].y)
      for (let i = 1; i < drew.length; i++) ctx.lineTo(drew[i].x, drew[i].y)
      ctx.stroke()
    }
    ctx.restore()
  }

  function redraw() {
    const c = canvRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 109, 109)

    if (mode === 'guide') drawGuide(ctx)
    else drawTrace(ctx)
  }

  useEffect(redraw, [mode, step, drew, targets])

  useEffect(() => {
    const c = canvRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.scale(1, 1)
    redraw()
  })

  function getPos(e: MouseEvent | TouchEvent): Point | null {
    const c = canvRef.current
    if (!c) return null
    const r = c.getBoundingClientRect()
    const p =
      e instanceof TouchEvent
        ? e.touches[0]
        : (e as MouseEvent)
    const x = ((p.clientX - r.left) * 109) / r.width
    const y = ((p.clientY - r.top) * 109) / r.height
    return { x, y }
  }

  function startDraw(e: MouseEvent | TouchEvent) {
    e.preventDefault()
    if (mode !== 'trace') return
    const p = getPos(e)
    if (!p) return
    drawing.current = true
    setDrew([p])
  }

  function moveDraw(e: MouseEvent | TouchEvent) {
    e.preventDefault()
    if (!drawing.current || mode !== 'trace') return
    const p = getPos(e)
    if (!p) return
    setDrew((d) => [...d, p])
  }

  function endDraw(e: MouseEvent | TouchEvent) {
    e.preventDefault()
    if (!drawing.current) return
    drawing.current = false
    gradeStroke()
  }

  useEffect(() => {
    const c = canvRef.current
    if (!c) return
    const onMouseDown = (ev: MouseEvent) => startDraw(ev)
    const onMouseMove = (ev: MouseEvent) => moveDraw(ev)
    const onMouseUp = (ev: MouseEvent) => endDraw(ev)
    const onTouchStart = (ev: TouchEvent) => startDraw(ev)
    const onTouchMove = (ev: TouchEvent) => moveDraw(ev)
    const onTouchEnd = (ev: TouchEvent) => endDraw(ev)
    c.addEventListener('mousedown', onMouseDown)
    c.addEventListener('mousemove', onMouseMove)
    c.addEventListener('mouseup', onMouseUp)
    c.addEventListener('touchstart', onTouchStart, { passive: false })
    c.addEventListener('touchmove', onTouchMove, { passive: false })
    c.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      c.removeEventListener('mousedown', onMouseDown)
      c.removeEventListener('mousemove', onMouseMove)
      c.removeEventListener('mouseup', onMouseUp)
      c.removeEventListener('touchstart', onTouchStart)
      c.removeEventListener('touchmove', onTouchMove)
      c.removeEventListener('touchend', onTouchEnd)
    }
  })

  function gradeStroke() {
    if (currentTarget.length === 0 || drew.length === 0) return
    const start = currentTarget[0]
    const end = currentTarget[currentTarget.length - 1]
    const dStart = Math.hypot(drew[0].x - start.x, drew[0].y - start.y)
    const dEnd = Math.hypot(drew[drew.length - 1].x - end.x, drew[drew.length - 1].y - end.y)
    let sum = 0
    for (const p of drew) {
      sum += distToPolyline(p, currentTarget)
    }
    const avg = sum / drew.length
    const coverage = drew.length > 1 ? polylineLength(drew) : 0
    const covOk = coverage >= polylineLength(currentTarget) * 0.6
    const ok = dStart < 8 && dEnd < 12 && avg < 4 && covOk
    setScore(ok ? 1 : 0)
  }

  if (!level) return null

  if (!deck) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Loading deck…</div>
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No kanji</h2>
        <Link to={`/${level}`} className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">
            Writing{section ? ` · Section ${section.id}` : ''} · {safeIndex + 1}/{deck.length}
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-jp">{entry.kanji}</h2>
          <div className="text-sm text-slate-500">{entry.meanings.join(', ')}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('guide')}
            className={`rounded-xl px-3 py-1.5 text-sm ${mode === 'guide' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
          >
            Guide
          </button>
          <button
            onClick={() => setMode('trace')}
            className={`rounded-xl px-3 py-1.5 text-sm ${mode === 'trace' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
          >
            Trace
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-center">
          <canvas
            ref={canvRef}
            width={109}
            height={109}
            className="aspect-square w-64 touch-none border border-slate-100 bg-slate-50/80"
            onMouseDown={(e) => startDraw(e.nativeEvent)}
            onMouseMove={(e) => moveDraw(e.nativeEvent)}
            onMouseUp={(e) => endDraw(e.nativeEvent)}
            onTouchStart={(e) => startDraw(e.nativeEvent)}
            onTouchMove={(e) => moveDraw(e.nativeEvent)}
            onTouchEnd={(e) => endDraw(e.nativeEvent)}
          />
        </div>
        {mode === 'trace' && (
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
            <button onClick={() => setStep((s) => Math.max(0, s))} className="rounded-xl border border-slate-300 px-3 py-1.5">
              Reset step
            </button>
            <button onClick={clear} className="rounded-xl border border-slate-300 px-3 py-1.5">
              Clear
            </button>
            <button
              onClick={() => setStep((s) => Math.min(targets.length, s + 1))}
              disabled={step >= targets.length}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-white disabled:bg-slate-200"
            >
              Next stroke
            </button>
            <span className="self-center text-slate-500">
              Stroke {step + 1}/{targets.length}
            </span>
            {score !== null && (
              <span className={score ? 'text-emerald-700' : 'text-rose-700'}>
                {score ? 'Good' : 'Try again'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setIndex(Math.max(0, safeIndex - 1))}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
        >
          Prev
        </button>
        <Link to={`/${level}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">
          Back to dashboard
        </Link>
        <button
          onClick={() => setIndex(Math.min((deck?.length ?? 1) - 1, safeIndex + 1))}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white"
        >
          Next
        </button>
      </div>
    </div>
  )
}

