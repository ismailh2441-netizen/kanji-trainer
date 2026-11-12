export interface KanaCell {
  kana: string
  romaji: string
}

export interface KanaRow {
  /** Consonant group label, e.g. "k" or "g". */
  label: string
  cells: (KanaCell | null)[]
}

export interface KanaChart {
  basic: KanaRow[]
  voiced: KanaRow[]
}

const row = (label: string, ...cells: (KanaCell | null)[]): KanaRow => ({
  label,
  cells,
})

const cell = (kana: string, romaji: string): KanaCell => ({ kana, romaji })

export const HIRAGANA: KanaChart = {
  basic: [
    row('a', cell('あ', 'a'), cell('い', 'i'), cell('う', 'u'), cell('え', 'e'), cell('お', 'o')),
    row('k', cell('か', 'ka'), cell('き', 'ki'), cell('く', 'ku'), cell('け', 'ke'), cell('こ', 'ko')),
    row('s', cell('さ', 'sa'), cell('し', 'shi'), cell('す', 'su'), cell('せ', 'se'), cell('そ', 'so')),
    row('t', cell('た', 'ta'), cell('ち', 'chi'), cell('つ', 'tsu'), cell('て', 'te'), cell('と', 'to')),
    row('n', cell('な', 'na'), cell('に', 'ni'), cell('ぬ', 'nu'), cell('ね', 'ne'), cell('の', 'no')),
    row('h', cell('は', 'ha'), cell('ひ', 'hi'), cell('ふ', 'fu'), cell('へ', 'he'), cell('ほ', 'ho')),
    row('m', cell('ま', 'ma'), cell('み', 'mi'), cell('む', 'mu'), cell('め', 'me'), cell('も', 'mo')),
    row('y', cell('や', 'ya'), null, cell('ゆ', 'yu'), null, cell('よ', 'yo')),
    row('r', cell('ら', 'ra'), cell('り', 'ri'), cell('る', 'ru'), cell('れ', 're'), cell('ろ', 'ro')),
    row('w', cell('わ', 'wa'), null, null, null, cell('を', 'wo')),
    row('n', cell('ん', 'n'), null, null, null, null),
  ],
  voiced: [
    row('g', cell('が', 'ga'), cell('ぎ', 'gi'), cell('ぐ', 'gu'), cell('げ', 'ge'), cell('ご', 'go')),
    row('z', cell('ざ', 'za'), cell('じ', 'ji'), cell('ず', 'zu'), cell('ぜ', 'ze'), cell('ぞ', 'zo')),
    row('d', cell('だ', 'da'), cell('ぢ', 'di'), cell('づ', 'du'), cell('で', 'de'), cell('ど', 'do')),
    row('b', cell('ば', 'ba'), cell('び', 'bi'), cell('ぶ', 'bu'), cell('べ', 'be'), cell('ぼ', 'bo')),
    row('p', cell('ぱ', 'pa'), cell('ぴ', 'pi'), cell('ぷ', 'pu'), cell('ぺ', 'pe'), cell('ぽ', 'po')),
  ],
}

export const KATAKANA: KanaChart = {
  basic: [
    row('a', cell('ア', 'a'), cell('イ', 'i'), cell('ウ', 'u'), cell('エ', 'e'), cell('オ', 'o')),
    row('k', cell('カ', 'ka'), cell('キ', 'ki'), cell('ク', 'ku'), cell('ケ', 'ke'), cell('コ', 'ko')),
    row('s', cell('サ', 'sa'), cell('シ', 'shi'), cell('ス', 'su'), cell('セ', 'se'), cell('ソ', 'so')),
    row('t', cell('タ', 'ta'), cell('チ', 'chi'), cell('ツ', 'tsu'), cell('テ', 'te'), cell('ト', 'to')),
    row('n', cell('ナ', 'na'), cell('ニ', 'ni'), cell('ヌ', 'nu'), cell('ネ', 'ne'), cell('ノ', 'no')),
    row('h', cell('ハ', 'ha'), cell('ヒ', 'hi'), cell('フ', 'fu'), cell('ヘ', 'he'), cell('ホ', 'ho')),
    row('m', cell('マ', 'ma'), cell('ミ', 'mi'), cell('ム', 'mu'), cell('メ', 'me'), cell('モ', 'mo')),
    row('y', cell('ヤ', 'ya'), null, cell('ユ', 'yu'), null, cell('ヨ', 'yo')),
    row('r', cell('ラ', 'ra'), cell('リ', 'ri'), cell('ル', 'ru'), cell('レ', 're'), cell('ロ', 'ro')),
    row('w', cell('ワ', 'wa'), null, null, null, cell('ヲ', 'wo')),
    row('n', cell('ン', 'n'), null, null, null, null),
  ],
  voiced: [
    row('g', cell('ガ', 'ga'), cell('ギ', 'gi'), cell('グ', 'gu'), cell('ゲ', 'ge'), cell('ゴ', 'go')),
    row('z', cell('ザ', 'za'), cell('ジ', 'ji'), cell('ズ', 'zu'), cell('ゼ', 'ze'), cell('ゾ', 'zo')),
    row('d', cell('ダ', 'da'), cell('ヂ', 'di'), cell('ヅ', 'du'), cell('デ', 'de'), cell('ド', 'do')),
    row('b', cell('バ', 'ba'), cell('ビ', 'bi'), cell('ブ', 'bu'), cell('ベ', 'be'), cell('ボ', 'bo')),
    row('p', cell('パ', 'pa'), cell('ピ', 'pi'), cell('プ', 'pu'), cell('ペ', 'pe'), cell('ポ', 'po')),
  ],
}
