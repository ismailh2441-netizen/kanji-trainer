// Downloads KanjiVG stroke-order data for the kana charts.
// Usage: node scripts/fetch-kana-strokes.mjs [--skip-existing]
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SVG_BASE = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/'
const skipExisting = process.argv.includes('--skip-existing')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'kanji-trainer-data-script' },
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return await res.text()
    } catch (err) {
      if (attempt === 3) throw err
      await sleep(500 * attempt)
    }
  }
  return null
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Read the kana characters out of the chart data so the two stay in sync. */
async function kanaCharacters() {
  const source = await readFile(join(ROOT, 'src', 'data', 'kana.ts'), 'utf8')
  const chars = new Set()
  for (const match of source.matchAll(/cell\('(.)'/g)) chars.add(match[1])
  return [...chars]
}

async function main() {
  const started = Date.now()
  const kana = await kanaCharacters()
  console.log(`Fetching KanjiVG stroke data for ${kana.length} kana...`)

  const strokesDir = join(ROOT, 'public', 'strokes')
  await mkdir(strokesDir, { recursive: true })

  const missing = []
  let written = 0

  for (const char of kana) {
    const hex = char.codePointAt(0).toString(16).padStart(5, '0')
    const out = join(strokesDir, `${hex}.json`)
    if (skipExisting && (await exists(out))) continue

    const svg = await get(`${SVG_BASE}${hex}.svg`)
    if (svg == null) {
      missing.push(char)
      continue
    }
    const strokes = [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
    if (strokes.length === 0) {
      missing.push(char)
      continue
    }
    await writeFile(out, JSON.stringify({ strokes }), 'utf8')
    written++
  }

  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log(`  stroke files written: ${written}`)
  if (missing.length > 0) {
    console.log(`  no stroke data (${missing.length}): ${missing.join(' ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
