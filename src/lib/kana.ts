/** Convert katakana to hiragana (イチ → いち), leaving other characters unchanged. */
export function toHiragana(value: string): string {
  return value.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  )
}

/** Normalize a reading or search query: hiragana + lowercase. */
export function normalizeReading(value: string): string {
  return toHiragana(value.trim().toLowerCase())
}
