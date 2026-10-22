interface Props {
  value: number
  max: number
  size?: number
  stroke?: number
  color: string
  label?: string
}

export default function ProgressRing({ value, max, size = 96, stroke = 10, color, label }: Props) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold text-slate-900">{Math.round(pct * 100)}%</div>
        {label && <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>}
      </div>
    </div>
  )
}
