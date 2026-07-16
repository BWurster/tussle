import { useState } from 'react'
import { Trash2, Plus, Sparkles, Trophy } from 'lucide-react'
import type { NameEntry, Gender, Settings } from '../types'
import { generateSentimentAnalysis } from '../lib/ai'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'

interface Props {
  gender: Gender
  names: NameEntry[]
  settings: Settings
  onDelete: (id: string) => void
  onAdd: (name: string) => void
}

const MIN_COMPARISONS = 3

export function Leaderboard({ gender, names, settings, onDelete, onAdd }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<NameEntry | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const ranked = [...names]
    .filter(n => n.comparisons >= MIN_COMPARISONS)
    .sort((a, b) => b.score - a.score)

  const learning = [...names]
    .filter(n => n.comparisons < MIN_COMPARISONS)
    .sort((a, b) => b.addedAt - a.addedAt)

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

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {ranked.length === 0 && learning.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Trophy size={32} className="text-gray-300 dark:text-gray-600" />
            <p className="text-gray-400 text-sm text-center">No names yet.<br />Head to Play to start ranking!</p>
          </div>
        )}

        {ranked.length > 0 && (
          <div className="space-y-2">
            {ranked.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <span className="w-6 text-sm font-bold text-gray-400 text-center shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span className="flex-1 text-base font-semibold text-gray-900 dark:text-white truncate">
                  {entry.name}
                </span>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className={`text-lg font-bold ${accent}`}>{entry.score}</span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">{entry.comparisons}</span>
                </div>
                <button
                  onClick={() => setDeleteTarget(entry)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {learning.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-0.5">
              Still learning...
            </p>
            <div className="space-y-1.5">
              {learning.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50"
                >
                  <span className="flex-1 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {entry.name}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">{entry.comparisons}/3</span>
                  <button
                    onClick={() => setDeleteTarget(entry)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
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
