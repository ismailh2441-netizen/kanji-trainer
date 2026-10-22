// Auto-fetch example words/sentences for deck entries that have none, from
// Jisho (words/glosses/jlpt tier) + Tatoeba (sentences/translations),
// then write them back into the deck .ts file it was pointed at.
//
// Targets entries with empty examples. Word quality rules:
// - prefer jlpt-n5 > n4 > n3 > untagged; exclude n1/n2 words entirely
// - words ending in a stray particle (多いに) are dropped
// - BLOCK/CURATED below are quality overrides tuned for N5 vocabulary
import fs from 'fs'

const DECK = 'src/data/decks/n5.ts'
const PREFIX = 'export const deck: KanjiEntry[] = '
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
const KANA_RE = /^[ぁ-んー～]+$/
const PARTICLE_END = /[にはをもがでへとに]$/
// Clearly-beyond-N5 / odd words that slipped through auto-fetching
const BLOCK = new Set(
  ('田舎者 口紅 口笛 口実 門戸 門下 肉眼 肉体的 肉体 魚類 魚介類 耳障り 耳より ' +
    '古墳 古着 短命 短時間 買収 朝鮮 鳥皮 鳥かご 社会学 内閣 元日 寺子屋 速球 ' +
    '花粉 目標 分析 多少 傘下 好い 魚雷 多様性 分野 好運 肉食 耳鳴り 鳥肌 ' +
    '社会保障 青年 肉体労働').split(' '),
)
// N5-appropriate words to try first for kanji whose auto-fetched picks
// drifted too advanced (reading/gloss still resolved via Jisho).
const CURATED = {
  口: ['出口', '入口'],
  私: ['私たち'],
  曜: ['日曜日', '火曜日'],
  魚: ['魚屋', '魚釣り'],
  多: ['多く'],
  分: ['部分', '気分'],
  好: ['好み'],
  肉: ['肉じゃが', '肉屋'],
  耳: ['耳かき'],
  鳥: ['鳥居'],
  社: ['社'],
  青: ['青空'],
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA })
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (i + 1))
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch {
      await sleep(1500 * (i + 1))
    }
  }
  return null
}

/** 0 = n5, 1 = n4, 2 = n3, 3 = untagged, -1 = excluded (n1/n2). */
function jlptTier(e) {
  const j = e.jlpt ?? []
  if (j.includes('jlpt-n5')) return 0
  if (j.includes('jlpt-n4')) return 1
  if (j.includes('jlpt-n3')) return 2
  if (j.includes('jlpt-n2') || j.includes('jlpt-n1')) return -1
  return 3
}

/** Jisho word candidates containing the kanji, best first. */
async function jishoCandidates(kanji, usedWords) {
  const all = []
  for (let page = 1; page <= 2; page++) {
    const url =
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(kanji)}&page=${page}`
    const json = await getJson(url)
    if (!json || !Array.isArray(json.data)) break
    all.push(...json.data)
    await sleep(250)
    if (json.data.length < 20) break
  }

  const scored = []
  all.forEach((e, jishoIdx) => {
    const tier = jlptTier(e)
    if (tier === -1) return
    const jp = (e.japanese ?? []).find((j) => j.word && j.word.includes(kanji))
    if (!jp) return
    const word = jp.word
    if (BLOCK.has(word)) return
    const len = [...word].length
    if (len < 1 || len > 4) return
    if (len >= 2 && PARTICLE_END.test(word)) return
    const reading = jp.reading
    if (!reading || !KANA_RE.test(reading)) return
    const gloss = e.senses?.[0]?.english_definitions?.slice(0, 2).join(', ')
    if (!gloss) return

    let bonus = 0
    if (e.is_common) bonus += 2
    if (len === 2 || len === 3) bonus += 1
    if (usedWords.has(word)) bonus -= 3
    scored.push({ word, reading, gloss: gloss.slice(0, 60), tier, jishoIdx, bonus })
  })
  scored.sort(
    (a, b) => a.tier - b.tier || b.bonus - a.bonus || a.jishoIdx - b.jishoIdx,
  )
  return scored.slice(0, 8)
}

/** Resolve reading + gloss for an exact word via Jisho. */
async function jishoWordInfo(word) {
  const json = await getJson(
    `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`,
  )
  if (!json || !Array.isArray(json.data)) return null
  const e = json.data.find((x) => (x.japanese ?? []).some((j) => j.word === word))
  if (!e) return null
  const jp = e.japanese.find((j) => j.word === word)
  if (!jp?.reading || !KANA_RE.test(jp.reading)) return null
  const gloss = e.senses?.[0]?.english_definitions?.slice(0, 2).join(', ')
  if (!gloss) return null
  return { word, reading: jp.reading, gloss: gloss.slice(0, 60) }
}

/** Tatoeba sentence pair containing the word. */
async function tatoebaSentence(word) {
  const url = `https://tatoeba.org/en/api_v0/search?from=jpn&to=eng&query=${encodeURIComponent(word)}`
  const json = await getJson(url)
  if (!json || !Array.isArray(json.results)) return null
  const hit = json.results.find(
    (r) => r.text && r.text.includes(word) && [...r.text].length <= 60,
  )
  if (!hit) return null
  const en = (hit.translations ?? [])
    .flat()
    .find((t) => (t.lang === 'eng' || t.lang === 'en') && t.text)
  if (!en) return null
  if (en.text.length > 140) return null
  return { sentence: hit.text, sentenceEnglish: en.text }
}

async function main() {
  const src = fs.readFileSync(DECK, 'utf8')
  const idx = src.indexOf(PREFIX)
  if (idx === -1) throw new Error('deck prefix not found')
  const jsonStart = idx + PREFIX.length
  let json = src.slice(jsonStart).trim()
  if (json.endsWith(';')) json = json.slice(0, -1)
  const deck = JSON.parse(json)

  const targets = deck.filter((e) => e.examples.length === 0)
  console.log(`Fetching examples for ${targets.length} kanji...`)

  const usedWords = new Set()
  for (const entry of deck) for (const ex of entry.examples) usedWords.add(ex.word)

  for (const entry of targets) {
    const auto = await jishoCandidates(entry.kanji, usedWords)
    const candidates = []
    for (const w of CURATED[entry.kanji] ?? []) {
      const info = await jishoWordInfo(w)
      await sleep(300)
      if (info) candidates.push({ ...info, tier: -0.5 })
    }
    candidates.push(...auto)
    const fresh = []
    for (const c of candidates) {
      if (fresh.length >= 3) break
      const s = await tatoebaSentence(c.word)
      await sleep(300)
      if (!s) continue
      if (fresh.some((x) => x.word === c.word)) continue
      fresh.push({
        word: c.word,
        reading: c.reading,
        english: c.gloss,
        sentence: s.sentence,
        sentenceEnglish: s.sentenceEnglish,
      })
      usedWords.add(c.word)
    }

    // Merge: fresh results first, then eligible existing ones not re-fetched
    const old = entry.examples.filter(
      (o) => !BLOCK.has(o.word) && !fresh.some((f) => f.word === o.word),
    )
    const merged = [...fresh, ...old].slice(0, 3)
    if (fresh.length > 0 || entry.examples.length === 0) entry.examples = merged
    else if (old.length > 0) entry.examples = old.slice(0, 3)

    console.log(
      `${entry.kanji}: ${entry.examples.length} example(s)` +
        (entry.examples.length ? ` — ${entry.examples.map((e) => e.word).join(', ')}` : ''),
    )
    await sleep(300)
  }

  fs.writeFileSync(DECK, src.slice(0, jsonStart) + JSON.stringify(deck) + ';\n')
  const stillEmpty = deck.filter((e) => e.examples.length === 0).map((e) => e.kanji)
  console.log(`\nDone. Still empty: ${stillEmpty.length ? stillEmpty.join(' ') : 'none'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
