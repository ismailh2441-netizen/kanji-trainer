import { useMemo } from 'react'
import { samplePath } from '../lib/svgpath'

/** Seconds each stroke takes to draw, plus the pause before the next one. */
const STROKE_DUR = 0.5
const STROKE_GAP = 0.2

/**
 * Animated stroke-order display (writing motion).
 * Draws each KanjiVG stroke in sequence over a faint guide of the full character,
 * with numbered markers at each stroke's starting point.
 * `run` acts as a remount key so Replay restarts the animation.
 */
export default function StrokeAnimation({
  strokes,
  run,
  className = '',
}: {
  strokes: string[]
  run: number
  className?: string
}) {
  const starts = useMemo(() => strokes.map((d) => samplePath(d)[0]), [strokes])
  return (
    <svg
      key={run}
      viewBox="0 0 109 109"
      className={`mx-auto rounded-xl border border-slate-100 bg-slate-50/80 ${className}`}
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
