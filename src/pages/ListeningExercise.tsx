import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLevel } from '../hooks/useLevel'
import { getListeningExercise, getListeningLevel } from '../data/listening/n5'
import { markListeningComplete } from '../lib/listening-storage'
import { toHiragana } from '../lib/kana'

/** Strip punctuation/spaces and unify katakana → hiragana + width. */
function normalizeJapanese(s: string): string {
  return toHiragana(
    s
      .trim()
      .replace(/[。、！？\.\,\!\?\s　「」『』（）()]/g, '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .toLowerCase(),
  )
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'at', 'and', 'or', 'it', 'this', 'that',
  'i', 'my', 'me', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
  'do', 'does', 'did', 'will', 'would', 'there', 'here',
])

function contentWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
}

/**
 * Lenient meaning check: accept when the user's answer covers most of the
 * significant words of any acceptable meaning (or matches one exactly).
 */
function checkMeaningAnswer(user: string, acceptable: string[]): boolean {
  const normalizedUser = user.toLowerCase().replace(/[.,!?;:'"()\-]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalizedUser) return false

  return acceptable.some((acc) => {
    const normalizedAcc = acc.toLowerCase().replace(/[.,!?;:'"()\-]/g, ' ').replace(/\s+/g, ' ').trim()
    if (normalizedAcc === normalizedUser) return true

    const accWords = contentWords(acc)
    if (accWords.length === 0) return false
    const userText = ` ${normalizedUser} `
    const hits = accWords.filter((word) => userText.includes(` ${word} `)).length
    // Also count words that appear as substrings (handles plurals / verb forms).
    const looseHits = accWords.filter((word) => normalizedUser.includes(word)).length
    const matched = Math.max(hits, looseHits)
    return matched / accWords.length >= 0.7
  })
}

export default function ListeningExercise() {
  const level = useLevel()
  const navigate = useNavigate()
  const { listeningLevel, exerciseId } = useParams()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [mode, setMode] = useState<'japanese' | 'meaning'>('japanese')
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [romajiMode, setRomajiMode] = useState(true)

  function toKanaRomaji(input: string): string {
    if (!input) return input
    const isUpper = input === input.toUpperCase() && /[A-Z]/.test(input)
    let s = input
    // Handle small tsu (double consonants)
    s = s.replace(/([bcdfghjklmpqrstvwxyz])\1/gi, 'っ$1')
    // Handle nn -> ん only (no standalone n -> ん)
    s = s.replace(/nn/gi, 'ん')
    // Youon (longer patterns first)
    s = s.replace(/kya/gi, 'きゃ').replace(/kyu/gi, 'きゅ').replace(/kyo/gi, 'きょ')
    s = s.replace(/sha/gi, 'しゃ').replace(/shu/gi, 'しゅ').replace(/sho/gi, 'しょ')
    s = s.replace(/cha/gi, 'ちゃ').replace(/chu/gi, 'ちゅ').replace(/cho/gi, 'ちょ')
    s = s.replace(/nya/gi, 'にゃ').replace(/nyu/gi, 'にゅ').replace(/nyo/gi, 'にょ')
    s = s.replace(/hya/gi, 'ひゃ').replace(/hyu/gi, 'ひゅ').replace(/hyo/gi, 'ひょ')
    s = s.replace(/mya/gi, 'みゃ').replace(/myu/gi, 'みゅ').replace(/myo/gi, 'みょ')
    s = s.replace(/rya/gi, 'りゃ').replace(/ryu/gi, 'りゅ').replace(/ryo/gi, 'りょ')
    s = s.replace(/gya/gi, 'ぎゃ').replace(/gyu/gi, 'ぎゅ').replace(/gyo/gi, 'ぎょ')
    s = s.replace(/ja/gi, 'じゃ').replace(/ju/gi, 'じゅ').replace(/jo/gi, 'じょ')
    s = s.replace(/bya/gi, 'びゃ').replace(/byu/gi, 'びゅ').replace(/byo/gi, 'びょ')
    s = s.replace(/pya/gi, 'ぴゃ').replace(/pyu/gi, 'ぴゅ').replace(/pyo/gi, 'ぴょ')
    // Syllables with 2 chars (longer first)
    s = s.replace(/chi/gi, 'ち').replace(/shi/gi, 'し').replace(/si/gi, 'し').replace(/tsu/gi, 'つ').replace(/fu/gi, 'ふ').replace(/hu/gi, 'ふ')
    s = s.replace(/ji/gi, 'じ').replace(/zi/gi, 'じ').replace(/ti/gi, 'ち').replace(/di/gi, 'ぢ').replace(/du/gi, 'づ')
    // Gojuon
    s = s.replace(/ka/gi, 'か').replace(/ki/gi, 'き').replace(/ku/gi, 'く').replace(/ke/gi, 'け').replace(/ko/gi, 'こ')
    s = s.replace(/sa/gi, 'さ').replace(/su/gi, 'す').replace(/se/gi, 'せ').replace(/so/gi, 'そ')
    s = s.replace(/ta/gi, 'た').replace(/te/gi, 'て').replace(/to/gi, 'と')
    s = s.replace(/na/gi, 'な').replace(/ni/gi, 'に').replace(/nu/gi, 'ぬ').replace(/ne/gi, 'ね').replace(/no/gi, 'の')
    s = s.replace(/ha/gi, 'は').replace(/hi/gi, 'ひ').replace(/he/gi, 'へ').replace(/ho/gi, 'ほ')
    s = s.replace(/ma/gi, 'ま').replace(/mi/gi, 'み').replace(/mu/gi, 'む').replace(/me/gi, 'め').replace(/mo/gi, 'も')
    s = s.replace(/ya/gi, 'や').replace(/yu/gi, 'ゆ').replace(/yo/gi, 'よ')
    s = s.replace(/ra/gi, 'ら').replace(/ri/gi, 'り').replace(/ru/gi, 'る').replace(/re/gi, 'れ').replace(/ro/gi, 'ろ')
    s = s.replace(/wa/gi, 'わ').replace(/wo/gi, 'を')
    s = s.replace(/ga/gi, 'が').replace(/gi/gi, 'ぎ').replace(/gu/gi, 'ぐ').replace(/ge/gi, 'げ').replace(/go/gi, 'ご')
    s = s.replace(/za/gi, 'ざ').replace(/zu/gi, 'ず').replace(/ze/gi, 'ぜ').replace(/zo/gi, 'ぞ')
    s = s.replace(/da/gi, 'だ').replace(/de/gi, 'で').replace(/do/gi, 'ど')
    s = s.replace(/ba/gi, 'ば').replace(/bi/gi, 'び').replace(/bu/gi, 'ぶ').replace(/be/gi, 'べ').replace(/bo/gi, 'ぼ')
    s = s.replace(/pa/gi, 'ぱ').replace(/pi/gi, 'ぴ').replace(/pu/gi, 'ぷ').replace(/pe/gi, 'ぺ').replace(/po/gi, 'ぽ')
    s = s.replace(/a/gi, 'あ').replace(/i/gi, 'い').replace(/u/gi, 'う').replace(/e/gi, 'え').replace(/o/gi, 'お')
    if (isUpper) {
      const katakanaMap: Record<string, string> = {
        'あ': 'ア','い': 'イ','う': 'ウ','え': 'エ','お': 'オ',
        'か': 'カ','き': 'キ','く': 'ク','け': 'ケ','こ': 'コ',
        'さ': 'サ','し': 'シ','す': 'ス','せ': 'セ','そ': 'ソ',
        'た': 'タ','ち': 'チ','つ': 'ツ','て': 'テ','と': 'ト',
        'な': 'ナ','に': 'ニ','ぬ': 'ヌ','ね': 'ネ','の': 'ノ',
        'は': 'ハ','ひ': 'ヒ','ふ': 'フ','へ': 'ヘ','ほ': 'ホ',
        'ま': 'マ','み': 'ミ','む': 'ム','め': 'メ','も': 'モ',
        'や': 'ヤ','ゆ': 'ユ','よ': 'ヨ',
        'ら': 'ラ','り': 'リ','る': 'ル','れ': 'レ','ろ': 'ロ',
        'わ': 'ワ','を': 'ヲ','ん': 'ン',
        'が': 'ガ','ぎ': 'ギ','ぐ': 'グ','げ': 'ゲ','ご': 'ゴ',
        'ざ': 'ザ','じ': 'ジ','ず': 'ズ','ぜ': 'ゼ','ぞ': 'ゾ',
        'だ': 'ダ','ぢ': 'ヂ','づ': 'ヅ','で': 'デ','ど': 'ド',
        'ば': 'バ','び': 'ビ','ぶ': 'ブ','べ': 'ベ','ぼ': 'ボ',
        'ぱ': 'パ','ぴ': 'ピ','ぷ': 'プ','ぺ': 'ペ','ぽ': 'ポ',
        'っ': 'ッ',
        'きゃ': 'キャ','きゅ': 'キュ','きょ': 'キョ',
        'しゃ': 'シャ','しゅ': 'シュ','しょ': 'ショ',
        'ちゃ': 'チャ','ちゅ': 'チュ','ちょ': 'チョ',
        'にゃ': 'ニャ','にゅ': 'ニュ','にょ': 'ニョ',
        'ひゃ': 'ヒャ','ひゅ': 'ヒュ','ひょ': 'ヒョ',
        'みゃ': 'ミャ','みゅ': 'ミュ','みょ': 'ミョ',
        'りゃ': 'リャ','りゅ': 'リュ','りょ': 'リョ',
        'ぎゃ': 'ギャ','ぎゅ': 'ギュ','ぎょ': 'ギョ',
        'じゃ': 'ジャ','じゅ': 'ジュ','じょ': 'ジョ',
        'びゃ': 'ビャ','びゅ': 'ビュ','びょ': 'ビョ',
        'ぴゃ': 'ピャ','ぴゅ': 'ピュ','ぴょ': 'ピョ',
      }
      // Only convert the last syllable to katakana
      s = s.replace(/([きしちにひみりぎじびぴ][ゃゅょ]|[あ-んっ])$/, (m) => katakanaMap[m] || m.toUpperCase())
    }
    return s
  }

  const lvlNum = Number.parseInt(listeningLevel ?? '', 10) as 1 | 2 | 3
  const lvl = getListeningLevel(lvlNum)
  const exercise = exerciseId ? getListeningExercise(lvlNum, exerciseId) : undefined

  useEffect(() => {
    setInput('')
    setSubmitted(false)
    setCorrect(false)
  }, [exerciseId])

  if (!level || level !== 'n5' || !lvl || !exercise) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Exercise not found</h2>
        <p className="mt-1 text-slate-500">Listening practice is currently only available for N5.</p>
        <Link
          to={level ? `/${level}/listening` : '/'}
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to listening
        </Link>
      </div>
    )
  }

  const levelKey = `${level}-l${lvl.id}`
  const exercises = lvl.exercises
  const currentIndex = exercises.findIndex((e) => e.id === exercise.id)
  const nextExercise = currentIndex >= 0 && currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null

  function handleSubmit() {
    if (!input.trim()) return
    let isCorrect = false
    if (mode === 'japanese') {
      const user = normalizeJapanese(input)
      const targets = [exercise!.scriptJa, exercise!.scriptKana]
        .filter((t): t is string => Boolean(t))
        .map(normalizeJapanese)
      isCorrect = user.length > 0 && targets.includes(user)
    } else {
      isCorrect = checkMeaningAnswer(input, exercise!.acceptableMeanings)
    }
    setCorrect(isCorrect)
    setSubmitted(true)
    if (isCorrect) {
      markListeningComplete(levelKey, exercise!.id)
    }
  }

  function handleTryAgain() {
    setInput('')
    setSubmitted(false)
    setCorrect(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    const value2 = value.replace(/--/g, 'ー')
    if (mode === 'japanese' && romajiMode && !submitted) {
      setInput(toKanaRomaji(value2))
    } else {
      setInput(value2)
    }
  }

  function switchMode(next: 'japanese' | 'meaning') {
    if (next === mode) return
    setMode(next)
    setInput('')
    setSubmitted(false)
    setCorrect(false)
  }

  function handleNext() {
    if (nextExercise) {
      navigate(`/${level}/listening/${lvl!.id}/${nextExercise.id}`)
    } else {
      navigate(`/${level}/listening/${lvl!.id}`)
    }
  }

  function toggleAudio() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  function replayAudio() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="text-sm text-slate-500">
          <Link to={`/${level}/listening`} className="hover:text-slate-800">
            Listening
          </Link>{' '}
          /{' '}
          <Link to={`/${level}/listening/${lvl.id}`} className="hover:text-slate-800">
            {lvl.name}
          </Link>{' '}
          / Exercise {currentIndex + 1}
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{lvl.name} - Exercise {currentIndex + 1}</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="text-center">
          <audio
            ref={audioRef}
            src={exercise.audioUrl}
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={toggleAudio}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-500"
            >
              {playing ? (
                <>
                  <svg className="size-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.75 3.5A1.75 1.75 0 004 5.25v9.5c0 .966.784 1.75 1.75 1.75h1.5A1.75 1.75 0 009 14.75v-9.5A1.75 1.75 0 007.25 3.5h-1.5zM12.75 3.5A1.75 1.75 0 0011 5.25v9.5c0 .966.784 1.75 1.75 1.75h1.5A1.75 1.75 0 0016 14.75v-9.5A1.75 1.75 0 0014.25 3.5h-1.5z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="size-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Play Audio
                </>
              )}
            </button>
            <button
              onClick={replayAudio}
              title="Replay from the beginning"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12a9 9 0 1 0 3.5-7.1M3 4.5V9h4.5"
                />
              </svg>
              Replay
            </button>
          </div>
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const t = Number(e.target.value)
                if (audioRef.current) audioRef.current.currentTime = t
                setCurrentTime(t)
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{currentTime.toFixed(1)}s</span>
              <span>{duration.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <button
            onClick={() => switchMode('japanese')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'japanese'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Write in Japanese
          </button>
          <button
            onClick={() => switchMode('meaning')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'meaning'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Write the meaning
          </button>
        </div>

        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>{mode === 'japanese' ? 'Type what you hear in Japanese' : 'Type the meaning in English'}</span>
            {mode === 'japanese' && (
              <button
                type="button"
                onClick={() => setRomajiMode((v) => !v)}
                disabled={submitted && correct}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  romajiMode
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                Romaji {romajiMode ? 'ON' : 'OFF'}
              </button>
            )}
          </label>
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder={mode === 'japanese' ? (romajiMode ? 'konnichiwa...' : 'こんにちは...') : 'Today is...'}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            rows={3}
            disabled={submitted && correct}
          />
        </div>

        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={`w-full rounded-xl px-5 py-3 font-semibold text-white transition ${
              !input.trim() ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            Submit Answer
          </button>
        )}

        {submitted && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              {correct ? (
                <>
                  <span className="text-2xl">✓</span>
                  <span className="text-lg font-bold text-emerald-700">Correct!</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">✗</span>
                  <span className="text-lg font-bold text-rose-700">Not quite</span>
                </>
              )}
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold text-slate-700">Correct Japanese script:</div>
              <div className="rounded-lg bg-white p-3 font-jp text-lg text-slate-900">{exercise.scriptJa}</div>
              {exercise.scriptKana && (
                <div className="mt-1 rounded-lg bg-white p-3 font-jp text-sm text-slate-600">
                  {exercise.scriptKana}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold text-slate-700">Acceptable meanings:</div>
              <ul className="space-y-1 rounded-lg bg-white p-3">
                {exercise.acceptableMeanings.map((m, i) => (
                  <li key={i} className="text-slate-900">
                    • {m}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTryAgain}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Try Again
              </button>
              <button
                onClick={handleNext}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500"
              >
                {nextExercise ? 'Next Exercise' : 'Back to List'}
              </button>
            </div>
          </div>
        )}
      </div>

      <Link
        to={`/${level}/listening/${lvl.id}`}
        className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Back to exercises
      </Link>
    </div>
  )
}
