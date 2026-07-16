import { useState, useEffect } from 'react'
import { Swords, Trophy, Settings as SettingsIcon, X } from 'lucide-react'
import { useAppState } from './hooks/useAppState'
import { useOnline } from './hooks/useOnline'
import { OfflineBanner } from './components/OfflineBanner'
import { GenderToggle } from './components/GenderToggle'
import { Onboarding } from './pages/Onboarding'
import { Play } from './pages/Play'
import { Leaderboard } from './pages/Leaderboard'
import { Settings } from './pages/Settings'

type Tab = 'play' | 'leaderboard'

export default function App() {
  const { state, setActiveGender, updateSettings, completeOnboarding, recordMatchup, addName, deleteName, resetGender } = useAppState()
  const isOnline = useOnline()
  const [activeTab, setActiveTab] = useState<Tab>('play')
  const [showSettings, setShowSettings] = useState(false)

  const gender = state.activeGender
  const genderState = state[gender]
  const settings = state.settings

  useEffect(() => {
    const root = document.documentElement
    const theme = settings.theme
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [settings.theme])

  const isBoy = gender === 'boy'
  const accentText = isBoy ? 'text-blue-500' : 'text-pink-500'
  const tabActiveText = isBoy ? 'text-blue-500' : 'text-pink-500'
  const tabGradient = isBoy
    ? 'bg-gradient-to-r from-blue-400 to-teal-400'
    : 'bg-gradient-to-r from-pink-400 to-rose-400'

  function handleAddName(name: string) {
    addName(gender, name, true)
  }

  function handleAddNameFromPlay(name: string) {
    return addName(gender, name, false)
  }

  const showBottomNav = genderState.onboardingComplete && !showSettings

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {!isOnline && <OfflineBanner />}

      {/* Header — always visible */}
      <div className="shrink-0 bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between px-4 pt-3 pb-3">
          <h1 className={`font-black text-xl tracking-tight ${accentText}`}>Tussle</h1>
          <div className="flex items-center gap-2">
            <GenderToggle active={gender} onChange={setActiveGender} />
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`p-1.5 rounded-xl transition-colors ${
                showSettings
                  ? `${accentText} bg-gray-100 dark:bg-gray-800`
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {showSettings ? <X size={18} /> : <SettingsIcon size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showSettings ? (
          <Settings
            gender={gender}
            settings={settings}
            onUpdate={updateSettings}
            onResetGender={g => { resetGender(g); setShowSettings(false) }}
          />
        ) : !genderState.onboardingComplete ? (
          <Onboarding
            gender={gender}
            settings={settings}
            isOnline={isOnline}
            onComplete={names => completeOnboarding(gender, names)}
            onOpenSettings={() => setShowSettings(true)}
          />
        ) : (
          <>
            {activeTab === 'play' && (
              <Play
                gender={gender}
                names={genderState.names}
                settings={settings}
                isOnline={isOnline}
                onMatchup={(winnerId, loserId) => recordMatchup(gender, winnerId, loserId)}
                onAddName={handleAddNameFromPlay}
                onUpdateSettings={updateSettings}
              />
            )}
            {activeTab === 'leaderboard' && (
              <Leaderboard
                gender={gender}
                names={genderState.names}
                settings={settings}
                onDelete={id => deleteName(gender, id)}
                onAdd={handleAddName}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom nav — hidden in settings */}
      {showBottomNav && (
        <div className="shrink-0 flex border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          {([
            { id: 'play', label: 'Play', Icon: Swords },
            { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
          ] as { id: Tab; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-bold transition-colors relative ${
                activeTab === id
                  ? tabActiveText
                  : 'text-gray-400 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
              }`}
            >
              {activeTab === id && (
                <span className={`absolute top-0 left-1/4 right-1/4 h-0.5 rounded-b-full ${tabGradient}`} />
              )}
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
