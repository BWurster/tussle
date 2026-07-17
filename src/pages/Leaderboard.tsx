import { useEffect, useRef, useState } from 'react'
import { Trash2, Plus, Sparkles, Trophy, Check, X } from 'lucide-react'
import type { NameEntry, Gender, Settings } from '../types'
import { generateSentimentAnalysis } from '../lib/ai'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'

interface Props {
  gender: Gender
  names: NameEntry[]
  settings: Settings
  onDelete: (id: string) => void
  onDeleteMany: (ids: string[]) => void
  onAdd: (name: string) => void
}

const LONG_PRESS_MS = 500

export function Leaderboard({ gender, names, settings, onDelete, onDeleteMany, onAdd }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<NameEntry | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const pressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  const selectMode = selectedIds.size > 0

  useEffect(() => {
    setSelectedIds(new Set())
    setShowBulkConfirm(false)
  }, [gender])

  const ranked = [...names].sort((a, b) => b.score - a.score)

  function startPress(id: string) {
    if (selectMode) return
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      setSelectedIds(new Set([id]))
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRowClick(id: string) {
    // A long-press that just activated selection also fires a trailing
    // click on release (mouse and touch alike) — swallow that one click
    // so it doesn't immediately toggle the name back off.
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    if (selectMode) toggleSelect(id)
  }

  function selectBelowBottommost() {
    const indices = ranked
      .map((n, i) => (selectedIds.has(n.id) ? i : -1))
      .filter(i => i >= 0)
    if (indices.length === 0) return
    const maxIndex = Math.max(...indices)
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (let i = maxIndex; i < ranked.length; i++) next.add(ranked[i].id)
      return next
    })
  }

  const isBoy = gender === 'boy'
  const accent = isBoy ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'
  const accentBg = isBoy ? 'bg-blue-600' : 'bg-pink-500'
  const accentFlat = isBoy ? 'bg-blue-500' : 'bg-pink-500'

  const hasApiKey = settings.aiProvider === 'claude' ? !!settings.claudeApiKey : !!settings.openaiApiKey
  const aiAvailable = settings.aiEnabled && hasApiKey

  async function handleAnalysis() {
    if (!aiAvailable) return
    setAnalysisLoading(true)
    setShowAnalysis(true)
    try {
      const top = ranked.slice(0, 10).map(n => n.name)
      const result = await generateSentimentAnalysis(top, gender, settings)
      setAnalysis(result)
    } catch {
      setAnalysis('Unable to generate analysis. Please try again.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  function handleAdd() {
    const name = addValue.trim()
    if (!name) return
    onAdd(name)
    setAddValue('')
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header actions */}
      {selectMode ? (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectBelowBottommost}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
            >
              Select below
            </button>
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white shadow-sm active:scale-95 transition-transform"
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-2">
          <button
            onClick={handleAnalysis}
            disabled={!aiAvailable || ranked.length < 3}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
              ${aiAvailable && ranked.length >= 3
                ? `${accentFlat} text-white shadow-sm active:scale-95`
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
            title={!aiAvailable ? 'Enable AI in Play tab' : ranked.length < 3 ? 'Need more ranked names' : ''}
          >
            <Sparkles size={13} />
            Analyze my taste
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${accentBg} text-white shadow-sm active:scale-95 transition-transform`}
          >
            <Plus size={13} />
            Add name
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {ranked.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Trophy size={32} className="text-gray-300 dark:text-gray-600" />
            <p className="text-gray-400 text-sm text-center">No names yet.<br />Head to Play to start ranking!</p>
          </div>
        )}

        {ranked.length > 0 && (
          <div className="space-y-2">
            {ranked.map((entry, i) => {
              const selected = selectedIds.has(entry.id)
              return (
                <div
                  key={entry.id}
                  onPointerDown={() => startPress(entry.id)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={e => e.preventDefault()}
                  onClick={() => handleRowClick(entry.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border shadow-sm select-none transition-colors
                    ${selectMode ? 'cursor-pointer' : ''}
                    ${selected
                      ? isBoy
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                        : 'bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-700'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                    }`}
                >
                  {selectMode ? (
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${selected ? `${accentBg} border-transparent` : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      {selected && <Check size={14} className="text-white" />}
                    </span>
                  ) : (
                    <span className="w-6 text-sm font-bold text-gray-400 text-center shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                  )}
                  <span className="flex-1 text-base font-semibold text-gray-900 dark:text-white truncate">
                    {entry.name}
                  </span>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className={`text-lg font-bold ${accent}`}>{entry.score}</span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">{entry.comparisons}</span>
                  </div>
                  {!selectMode && (
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); setDeleteTarget(entry) }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title={`Remove "${deleteTarget.name}"?`}
          message="This name will be permanently removed from your list. This cannot be undone."
          confirmLabel="Remove"
          onConfirm={() => {
            onDelete(deleteTarget.id)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Bulk delete confirm */}
      {showBulkConfirm && (
        <ConfirmDialog
          title={`Remove ${selectedIds.size} name${selectedIds.size === 1 ? '' : 's'}?`}
          message="These names will be permanently removed from your list. This cannot be undone."
          confirmLabel="Remove"
          onConfirm={() => {
            onDeleteMany(Array.from(selectedIds))
            setSelectedIds(new Set())
            setShowBulkConfirm(false)
          }}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}

      {/* Add name modal */}
      {showAdd && (
        <Modal title="Add a name" onClose={() => setShowAdd(false)}>
          <div className="p-6 flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Enter a name..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
            />
            <button
              onClick={handleAdd}
              className={`w-full py-3 rounded-xl ${accentFlat} text-white font-semibold shadow-sm active:scale-95 transition-transform`}
            >
              Add to pool
            </button>
          </div>
        </Modal>
      )}

      {/* Analysis modal */}
      {showAnalysis && (
        <Modal title="Your Name Taste ✨" onClose={() => { setShowAnalysis(false); setAnalysis(null) }}>
          <div className="p-6">
            {analysisLoading ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${accentFlat} animate-bounce`}
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-400">Analyzing your taste...</p>
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {analysis}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
