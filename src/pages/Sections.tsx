import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeck } from '../hooks/useDeck'
import { useLevel } from '../hooks/useLevel'
import { LEVEL_THEME } from '../lib/levels'
import { levelSections, splitBySize, type Section } from '../lib/sections'
import {
  useProgress,
  setCustomSections,
  resetCustomSections,
} from '../lib/storage'
import type { CustomSection } from '../types'

export default function Sections() {
  const level = useLevel()
  const progress = useProgress()
  const { deck } = useDeck(level ?? 'n5')

  const [editing, setEditing] = useState(false)
  const [splitSpec, setSplitSpec] = useState('')
  const [preview, setPreview] = useState<Section[] | null>(null)
  const [customSections, setCustomSectionsState] = useState<CustomSection[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  if (!level) return null
  const activeLevel = level
  const theme = LEVEL_THEME[activeLevel]

  if (!deck) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Loading deck…
      </div>
    )
  }

  const activeDeck = deck
  const sections = levelSections(activeLevel, activeDeck)
  const cards = progress.levels[activeLevel].cards
  const now = Date.now()
  const hasCustom = progress.levels[activeLevel].sections != null

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 2500)
  }

  function buildCustomFromPreview(): CustomSection[] | null {
    if (!preview || preview.length === 0) return null
    return preview.map((s, i) => ({
      id: i + 1,
      name: customSections?.[i]?.name ?? `Section ${i + 1}`,
      kanji: [...s.kanji],
    }))
  }

  function handleSplitChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSplitSpec(e.target.value)
    const size = Number.parseInt(e.target.value, 10)
    setPreview(splitBySize(activeDeck, size) ?? null)
  }

  function applySplit() {
    const next = buildCustomFromPreview()
    if (!next) {
      flash('Enter a valid number of kanji per section, e.g. 10')
      return
    }
    setCustomSectionsState(next)
    setCustomSections(activeLevel, next)
    setEditing(false)
    setSplitSpec('')
    setPreview(null)
    flash('Sections saved.')
  }

  function resetLayout() {
    setCustomSectionsState(null)
    resetCustomSections(activeLevel)
    setEditing(false)
    setSplitSpec('')
    setPreview(null)
    flash('Reset to default sections.')
  }

  function startEdit() {
    setCustomSectionsState(progress.levels[activeLevel].sections ?? null)
    setPreview(null)
    setSplitSpec('')
    setEditing(true)
  }

  function updateSectionName(index: number, value: string) {
    setCustomSectionsState((prev) => {
      if (!prev) return null
      const next = [...prev]
      next[index] = { ...next[index], name: value || `Section ${index + 1}` }
      return next
    })
  }

  function removeKanjiFromSection(sectionIndex: number, kanji: string) {
    setCustomSectionsState((prev) => {
      if (!prev) return null
      const next = [...prev]
      next[sectionIndex] = {
        ...next[sectionIndex],
        kanji: next[sectionIndex].kanji.filter((k) => k !== kanji),
      }
      return next
    })
  }

  function deleteSection(index: number) {
    setCustomSectionsState((prev) => {
      if (!prev) return null
      return prev.filter((_, i) => i !== index)
    })
  }

  function addSection() {
    setCustomSectionsState((prev) => {
      if (!prev) return [{ id: 1, name: 'Section 1', kanji: [] }]
      return [...prev, { id: prev.length + 1, name: `Section ${prev.length + 1}`, kanji: [] }]
    })
  }

  function saveManual() {
    const next = customSections
    if (!next || next.length === 0) {
      flash('Add at least one section.')
      return
    }
    // Validate all deck kanji are covered exactly once
    const allKanji = next.flatMap((s) => s.kanji)
    const covered = new Set(allKanji)
    const missing = activeDeck.filter((e) => !covered.has(e.kanji))
    const duplicates = allKanji.filter((k, i, arr) => arr.indexOf(k) !== i)

    if (missing.length > 0) {
      flash(`Missing ${missing.length} kanji from sections.`)
      return
    }
    if (duplicates.length > 0) {
      flash('Some kanji appear in multiple sections.')
      return
    }

    const renumbered = next.map((s, i) => ({ ...s, id: i + 1 }))
    setCustomSectionsState(renumbered)
    setCustomSections(activeLevel, renumbered)
    setEditing(false)
    flash('Sections saved.')
  }

  return (
    <div className="space-y-4">
      {!editing ? (
        <>
          <p className="text-sm text-slate-500">
            Learn in small batches: pick a section, study its kanji, then quiz yourself on that
            section only.
          </p>

          {msg && <div className="text-sm text-indigo-600">{msg}</div>}

          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              hasCustom ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-900">
                {hasCustom ? 'Custom sections' : 'Default sections'}
              </div>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {hasCustom ? 'Edit layout' : 'Customize'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Sections are used by Review and Quiz. {hasCustom ? 'Your custom layout is active.' : 'Auto-balanced by level.'}
            </p>
            {hasCustom && (
              <button
                type="button"
                onClick={resetLayout}
                className="text-xs text-rose-600 hover:underline"
              >
                Reset to default
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s) => {
              const known = s.kanji.filter((k) => cards[k] !== undefined)
              const learned = known.filter((k) => cards[k].state !== 'learning').length
              const due = known.filter((k) => cards[k].due <= now).length
              const pct = Math.round((learned / s.kanji.length) * 100)
              return (
                <Link
                  key={s.id}
                  to={`/${activeLevel}/sections/${s.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{s.name ?? `Section ${s.id}`}</span>
                    {due > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {due} due
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {s.kanji.length} kanji · {known.length} started · {pct}%
                  </div>
                  <div className="mt-2 truncate font-jp text-lg text-slate-700">
                    {s.kanji.slice(0, 6).join(' ')}
                    {s.kanji.length > 6 ? ' …' : ''}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: theme.fill }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-slate-900">Customize sections</h2>
          <p className="text-sm text-slate-500 mb-4">
            Enter how many kanji you want in each section, then click Split. The last section
            holds any leftover kanji.
          </p>

          {msg && <div className="mb-3 text-sm text-indigo-600">{msg}</div>}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-semibold text-slate-700">Kanji per section</label>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={splitSpec}
                onChange={handleSplitChange}
                placeholder="e.g. 10"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={applySplit}
                disabled={!preview || preview.length === 0}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500"
              >
                Split
              </button>
            </div>
            {preview && preview.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {preview.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                  >
                    <div className="font-semibold text-slate-800 mb-1">
                      {customSections?.[i]?.name ?? `Section ${i + 1}`}
                    </div>
                    <div className="text-slate-500">{s.kanji.length} kanji</div>
                    <div className="mt-1 truncate font-jp text-sm text-slate-700">
                      {s.kanji.slice(0, 8).join(' ')}
                      {s.kanji.length > 8 ? ' …' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={resetLayout}
              className="mt-3 text-xs text-rose-600 hover:underline"
            >
              Reset to default
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Manual edit</h3>
              <button
                type="button"
                onClick={addSection}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Add section
              </button>
            </div>
            {customSections ? (
              customSections.map((section, index) => (
                <div
                  key={section.id}
                  className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={section.name}
                      onChange={(e) => updateSectionName(index, e.target.value)}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => deleteSection(index)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                      title="Delete section"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {section.kanji.map((k) => (
                      <div
                        key={k}
                        className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                      >
                        <span className="font-jp">{k}</span>
                        <button
                          type="button"
                          onClick={() => removeKanjiFromSection(index, k)}
                          className="rounded text-slate-400 hover:text-rose-600"
                          title="Remove from section"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400">
                    {section.kanji.length} kanji
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No sections yet. Enter a number above and click Split.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={saveManual}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Save sections
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
