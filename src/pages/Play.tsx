import { useState, useCallback } from 'react'
import { Sparkles, WifiOff, KeyRound } from 'lucide-react'
import type { NameEntry, Gender, Settings } from '../types'
import boyNamesData from '../data/boyNames.json'
import girlNamesData from '../data/girlNames.json'

import { generateNewName } from '../lib/ai'

const BACKUP_BOY_NAMES: string[] = [...boyNamesData.popular, ...boyNamesData.backup]
const BACKUP_GIRL_NAMES: string[] = [...girlNamesData.popular, ...girlNamesData.backup]

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  gender: Gender
  names: NameEntry[]
  settings: Settings
  isOnline: boolean
  onMatchup: (winnerId: string, loserId: string) => void
  onAddName: (name: string) => NameEntry
  onUpdateSettings: (patch: Partial<Settings>) => void
}

function pickRandom<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter(x => x !== exclude) : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

function pickWeightedByFewComparisons(names: NameEntry[], exclude?: NameEntry): NameEntry {
  const pool = exclude ? names.filter(n => n.id !== exclude.id) : names
  if (pool.length === 0) return names[0]
  const maxComp = Math.max(...pool.map(n => n.comparisons), 1)
  const weights = pool.map(n => maxComp - n.comparisons + 1)
  const total = weights.reduce((a, b) => a + b, 0)
  const r = Math.random() * total
  let cum = 0
  for (let i = 0; i < pool.length; i++) {
    cum += weights[i]
    if (r <= cum) return pool[i]
  }
  return pool[pool.length - 1]
}

type MatchupState = { left: NameEntry; right: NameEntry; mode: 'explore' | 'refine' } | null

export function Play({ gender, names, settings, isOnline, onMatchup, onAddName, onUpdateSettings }: Props) {
  const [matchup, setMatchup] = useState<MatchupState>(null)
  const [chosen, setChosen] = useState<'left' | 'right' | null>(null)
  const [loading, setLoading] = useState(false)

  const hasApiKey = settings.aiProvider === 'claude' ? !!settings.claudeApiKey : !!settings.openaiApiKey
  const aiAvailable = isOnline && hasApiKey
  const aiToggleLocked = !aiAvailable
  const aiToggleReason = !isOnline
    ? 'offline'
    : !hasApiKey
    ? 'no-key'
    : null

  const getBackupPool = useCallback(() => {
    const pool = gender === 'boy' ? BACKUP_BOY_NAMES : BACKUP_GIRL_NAMES
    const existing = new Set(names.map(n => n.name.toLowerCase()))
    return shuffleArray(pool.filter(n => !existing.has(n.toLowerCase())))
  }, [gender, names])

  const buildMatchup = useCallback(async () => {
    if (names.length < 2) return
    setLoading(true)

    const shouldExplore = names.length < 10 || Math.random() < settings.exploreRatio

    if (shouldExplore) {
      let newName: NameEntry | null = null

      if (settings.aiEnabled && isOnline && hasApiKey) {
        try {
          const generated = await generateNewName(names, settings, gender)
          if (generated && !names.some(n => n.name.toLowerCase() === generated.toLowerCase())) {
            newName = onAddName(generated)
          }
        } catch (e) {
          console.error('AI generation failed', e)
        }
      }

      if (!newName) {
        const backup = getBackupPool()
        if (backup.length > 0) {
          const picked = pickRandom(backup)
          newName = onAddName(picked)
        }
      }

      if (newName) {
        const opponent = pickWeightedByFewComparisons(names)
        const flip = Math.random() > 0.5
        setMatchup({
          left: flip ? newName : opponent,
          right: flip ? opponent : newName,
          mode: 'explore',
        })
        setLoading(false)
        return
      }
    }

    // Refine: two existing names
    const a = pickWeightedByFewComparisons(names)
    const b = pickWeightedByFewComparisons(names, a)
    setMatchup({ left: a, right: b, mode: 'refine' })
    setLoading(false)
  }, [names, settings, isOnline, hasApiKey, gender, onAddName, getBackupPool])

  // Auto-build first matchup on mount / when names change
  const [initialized, setInitialized] = useState(false)
  if (!initialized && names.length >= 2 && !matchup && !loading) {
    setInitialized(true)
    buildMatchup()
  }

  async function handleChoice(side: 'left' | 'right') {
    if (!matchup || chosen) return
    setChosen(side)

    const winner = side === 'left' ? matchup.left : matchup.right
    const loser = side === 'left' ? matchup.right : matchup.left
    onMatchup(winner.id, loser.id)

    setTimeout(async () => {
      setChosen(null)
      setMatchup(null)
      await buildMatchup()
    }, 400)
  }

  const isBoy = gender === 'boy'
  const accentFlat = isBoy ? 'bg-blue-500' : 'bg-pink-500'
  const accentText = isBoy ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'
  const accentBg = isBoy ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-pink-50 dark:bg-pink-950/40'
  const accentBorder = isBoy ? 'border-blue-200 dark:border-blue-800' : 'border-pink-200 dark:border-pink-800'
  const accentWin = isBoy ? 'bg-blue-500' : 'bg-pink-500'

  return (
    <div className="flex flex-col h-full">
      {/* AI Toggle */}
      <div className={`mx-4 mt-4 p-3 rounded-xl border ${accentBorder} ${accentBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={accentText} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">AI Generation</span>
          </div>
          <button
            disabled={aiToggleLocked}
            onClick={() => !aiToggleLocked && onUpdateSettings({ aiEnabled: !settings.aiEnabled })}
            className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
              settings.aiEnabled && !aiToggleLocked
                ? accentFlat
                : 'bg-gray-200 dark:bg-gray-700'
            } ${aiToggleLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                settings.aiEnabled && !aiToggleLocked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {aiToggleReason === 'no-key' && (
          <div className="flex items-center gap-1.5 mt-2">
            <KeyRound size={12} className="text-amber-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400">Add an API key in Settings to enable AI</p>
          </div>
        )}
        {aiToggleReason === 'offline' && (
          <div className="flex items-center gap-1.5 mt-2">
            <WifiOff size={12} className="text-gray-400" />
            <p className="text-xs text-gray-500">Go online to use AI mode</p>
          </div>
        )}
      </div>

      {/* Matchup area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-4">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${accentFlat} animate-bounce`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400">Finding a new name...</p>
          </div>
        )}

        {!loading && matchup && (
          <>
            <div className="flex gap-3 w-full">
              {(['left', 'right'] as const).map(side => {
                const entry = matchup[side]
                const isChosen = chosen === side
                const isLost = chosen && chosen !== side
                return (
                  <button
                    key={side}
                    onClick={() => handleChoice(side)}
                    disabled={!!chosen}
                    className={`flex-1 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 select-none
                      ${isChosen ? `${accentWin} scale-105 shadow-xl` : ''}
                      ${isLost ? 'opacity-40 scale-95' : ''}
                      ${!chosen ? 'bg-white dark:bg-gray-800 hover:shadow-xl active:scale-95 border border-gray-100 dark:border-gray-700' : ''}
                    `}
                    style={{ minHeight: '220px' }}
                  >
                    <span
                      className={`text-4xl font-extrabold tracking-tight ${
                        isChosen ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {entry.name}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${accentFlat}`} />
              <p className="text-xs text-gray-400 font-medium">
                {matchup.mode === 'explore' ? 'Exploring new names' : 'Refining rankings'}
              </p>
            </div>
          </>
        )}

        {!loading && names.length < 2 && (
          <div className="text-center">
            <p className="text-gray-400 text-sm">Add more names to start comparing</p>
          </div>
        )}
      </div>
    </div>
  )
}
