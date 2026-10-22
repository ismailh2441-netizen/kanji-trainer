export interface Point {
  x: number
  y: number
}

const TOKEN_RE = /([MmLlCcSsQqTtHhVvZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi

/**
 * Samples an SVG path (KanjiVG uses M/C/S cubic beziers in a 109×109 grid)
 * into a polyline of points.
 */
export function samplePath(d: string, perCurve = 10): Point[] {
  const tokens: (string | number)[] = []
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(d)) !== null) {
    tokens.push(m[1] ?? Number(m[2]))
  }

  const pts: Point[] = []
  let i = 0
  let cmd = ''
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let prevC2x = 0
  let prevC2y = 0
  let prevQx = 0
  let prevQy = 0
  let prevWasCubic = false
  let prevWasQuad = false

  const num = (): number => tokens[i++] as number
  const push = (x: number, y: number) => {
    const last = pts[pts.length - 1]
    if (!last || Math.hypot(x - last.x, y - last.y) > 1e-6) pts.push({ x, y })
  }
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    const x0 = cx
    const y0 = cy
    for (let s = 1; s <= perCurve; s++) {
      const t = s / perCurve
      const u = 1 - t
      push(
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y,
      )
    }
  }
  const quad = (x1: number, y1: number, x: number, y: number) => {
    const x0 = cx
    const y0 = cy
    for (let s = 1; s <= perCurve; s++) {
      const t = s / perCurve
      const u = 1 - t
      push(
        u * u * x0 + 2 * u * t * x1 + t * t * x,
        u * u * y0 + 2 * u * t * y1 + t * t * y,
      )
    }
  }

  while (i < tokens.length) {
    const t = tokens[i]
    if (typeof t === 'string') {
      cmd = t
      i++
    } else if (!cmd) {
      break
    }
    const abs = cmd === cmd.toUpperCase()
    const rel = !abs

    switch (cmd.toUpperCase()) {
      case 'M': {
        const x = num() + (rel ? cx : 0)
        const y = num() + (rel ? cy : 0)
        cx = sx = x
        cy = sy = y
        push(x, y)
        cmd = rel ? 'l' : 'L'
        prevWasCubic = false
        prevWasQuad = false
        break
      }
      case 'L': {
        cx = num() + (rel ? cx : 0)
        cy = num() + (rel ? cy : 0)
        push(cx, cy)
        prevWasCubic = false
        prevWasQuad = false
        break
      }
      case 'H': {
        cx = num() + (rel ? cx : 0)
        push(cx, cy)
        prevWasCubic = false
        prevWasQuad = false
        break
      }
      case 'V': {
        cy = num() + (rel ? cy : 0)
        push(cx, cy)
        prevWasCubic = false
        prevWasQuad = false
        break
      }
      case 'C': {
        let x1 = num()
        let y1 = num()
        let x2 = num()
        let y2 = num()
        let x = num()
        let y = num()
        if (rel) {
          x1 += cx
          y1 += cy
          x2 += cx
          y2 += cy
          x += cx
          y += cy
        }
        cubic(x1, y1, x2, y2, x, y)
        prevC2x = x2
        prevC2y = y2
        cx = x
        cy = y
        prevWasCubic = true
        prevWasQuad = false
        break
      }
      case 'S': {
        let x2 = num()
        let y2 = num()
        let x = num()
        let y = num()
        if (rel) {
          x2 += cx
          y2 += cy
          x += cx
          y += cy
        }
        const x1 = prevWasCubic ? 2 * cx - prevC2x : cx
        const y1 = prevWasCubic ? 2 * cy - prevC2y : cy
        cubic(x1, y1, x2, y2, x, y)
        prevC2x = x2
        prevC2y = y2
        cx = x
        cy = y
        prevWasCubic = true
        prevWasQuad = false
        break
      }
      case 'Q': {
        let x1 = num()
        let y1 = num()
        let x = num()
        let y = num()
        if (rel) {
          x1 += cx
          y1 += cy
          x += cx
          y += cy
        }
        quad(x1, y1, x, y)
        prevQx = x1
        prevQy = y1
        cx = x
        cy = y
        prevWasCubic = false
        prevWasQuad = true
        break
      }
      case 'T': {
        let x = num()
        let y = num()
        if (rel) {
          x += cx
          y += cy
        }
        const x1 = prevWasQuad ? 2 * cx - prevQx : cx
        const y1 = prevWasQuad ? 2 * cy - prevQy : cy
        quad(x1, y1, x, y)
        prevQx = x1
        prevQy = y1
        cx = x
        cy = y
        prevWasCubic = false
        prevWasQuad = true
        break
      }
      case 'Z': {
        cx = sx
        cy = sy
        push(cx, cy)
        prevWasCubic = false
        prevWasQuad = false
        break
      }
      default:
        i = tokens.length
    }
  }

  return pts
}

export function distToPolyline(p: Point, line: Point[]): number {
  let best = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const d = distToSegment(p, line[i], line[i + 1])
    if (d < best) best = d
  }
  if (line.length === 1 && line[0]) {
    best = Math.hypot(p.x - line[0].x, p.y - line[0].y)
  }
  return best
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function polylineLength(line: Point[]): number {
  let len = 0
  for (let i = 1; i < line.length; i++) {
    len += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y)
  }
  return len
}
