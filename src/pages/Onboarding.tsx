import { useState } from 'react'
import { Sparkles, Zap, Settings as SettingsIcon } from 'lucide-react'
import type { Gender, OnboardingAnswers, NameEntry, Settings } from '../types'
import boyNamesData from '../data/boyNames.json'
import girlNamesData from '../data/girlNames.json'
import { generateInitialNames } from '../lib/ai'

const ALL_BOYS = [...boyNamesData.popular, ...boyNamesData.backup]
const ALL_GIRLS = [...girlNamesData.popular, ...girlNamesData.backup]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  gender: Gender
  settings: Settings
  isOnline: boolean
  onComplete: (names: NameEntry[]) => void
  onOpenSettings: () => void
}

type Phase = 'gate' | 'questions' | 'loading'
type Step = 0 | 1 | 2 | 3 | 4

const QUESTIONS = [
  {
    id: 'heritage',
    label: "What's your cultural background or heritage?",
    hint: 'e.g. Irish, Japanese, Nigerian — helps tailor name style',
    type: 'text' as const,
  },
  {
    id: 'nameStyle',
    label: 'Do you prefer classic or modern names?',
    hint: 'Choose the vibe that feels right',
    type: 'choice' as const,
    options: [
      { value: 'classic', label: 'Classic', sub: 'Timeless & traditional' },
      { value: 'modern', label: 'Modern', sub: 'Unique & contemporary' },
    ],
  },
  {
    id: 'lovedSounds',
    label: 'Any names you love the sound of?',
    hint: "Doesn't have to be a baby name — just sounds you like",
    type: 'text' as const,
  },
  {
    id: 'dislikedSounds',
    label: 'Any sounds or endings you dislike?',
    hint: "e.g. \"don't like -ayden endings\" or leave blank",
    type: 'text' as const,
  },
  {
    id: 'vibes',
    label: 'Describe your ideal name in one or two words',
    hint: 'e.g. strong, gentle, whimsical, elegant',
    type: 'text' as const,
  },
]

export function Onboarding({ gender, settings, isOnline, onComplete, onOpenSettings }: Props) {
  const hasApiKey = settings.aiProvider === 'claude' ? !!settings.claudeApiKey : !!settings.openaiApiKey
  const aiAvailable = isOnline && hasApiKey

  const [phase, setPhase] = useState<Phase>(aiAvailable ? 'questions' : 'gate')
  const [step, setStep] = useState<Step>(0)
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({})
  const [textValue, setTextValue] = useState('')

  const genderLabel = gender === 'boy' ? 'Boy' : 'Girl'
  const accent = gender === 'boy' ? 'bg-blue-500' : 'bg-pink-500'
  const accentText = gender === 'boy' ? 'text-blue-500' : 'text-pink-500'
  const accentGradient = gender === 'boy'
    ? 'bg-gradient-to-r from-blue-400 to-teal-400'
    : 'bg-gradient-to-r from-pink-400 to-rose-400'

  function buildNameEntries(nameStrings: string[]): NameEntry[] {
    return nameStrings
      .filter(n => n.length > 1)
      .map(name => ({
        id: crypto.randomUUID(),
        name,
        gender,
        score: 1200,
        comparisons: 0,
        wins: 0,
        losses: 0,
        addedAt: Date.now(),
        isCustom: false,
      }))
  }

  async function finish(finalAnswers: OnboardingAnswers | null) {
    setPhase('loading')

    const pool = gender === 'boy' ? ALL_BOYS : ALL_GIRLS
    const popular = shuffle(pool).slice(0, finalAnswers ? 20 : 30)

    let aiNames: string[] = []
    if (finalAnswers && aiAvailable && settings.aiEnabled) {
      try {
        aiNames = await generateInitialNames(finalAnswers, gender, settings)
      } catch (e) {
        console.error('AI generation failed, using popular names only', e)
      }
    }

    const allNames = [...new Set([...popular, ...aiNames.slice(0, 10)])]
    onComplete(buildNameEntries(allNames.slice(0, 30)))
  }

  function handleTextNext(value: string) {
    const updated = { ...answers, [QUESTIONS[step].id]: value } as Partial<OnboardingAnswers>
    setAnswers(updated)
    setTextValue('')
    if (step < 4) {
      setStep((step + 1) as Step)
    } else {
      finish(updated as OnboardingAnswers)
    }
  }

  function handleChoiceNext(value: string) {
    const updated = { ...answers, [QUESTIONS[step].id]: value } as Partial<OnboardingAnswers>
    setAnswers(updated)
    setStep((step + 1) as Step)
  }

  // — Gate screen —
  if (phase === 'gate') {
    const reason = !isOnline ? 'You\'re offline' : 'No API key configured'
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${accent} text-white text-xs font-bold mb-4`}>
              {genderLabel} Names Setup
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              Let's get started
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI personalization isn't available right now — <span className="font-semibold">{reason}</span>.
              You can quick-start with a curated list of popular names, or set up AI first.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => finish(null)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl ${accent} text-white text-left active:scale-95 transition-transform shadow-md`}
            >
              <Zap size={20} className="shrink-0" />
              <div>
                <p className="font-bold text-base">Quick Start</p>
                <p className="text-xs opacity-80 mt-0.5">Jump in with 30 popular {genderLabel.toLowerCase()} names</p>
              </div>
            </button>

            <button
              onClick={() => { onOpenSettings() }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left active:scale-95 transition-transform"
            >
              <SettingsIcon size={20} className={`${accentText} shrink-0`} />
              <div>
                <p className="font-bold text-base text-gray-900 dark:text-white">Set Up AI</p>
                <p className="text-xs text-gray-400 mt-0.5">Add an API key for personalized name suggestions</p>
              </div>
            </button>

            {aiAvailable && (
              <button
                onClick={() => setPhase('questions')}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left active:scale-95 transition-transform"
              >
                <Sparkles size={20} className={`${accentText} shrink-0`} />
                <div>
                  <p className="font-bold text-base text-gray-900 dark:text-white">Personalize with AI</p>
                  <p className="text-xs text-gray-400 mt-0.5">Answer 5 quick questions to tailor your list</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // — Loading screen —
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className={`w-16 h-16 rounded-full ${accent} flex items-center justify-center`}>
          <span className="text-2xl">✨</span>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">Building your list...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crafting a pool of {genderLabel.toLowerCase()} names</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${accent} animate-bounce`}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // — Questions screen —
  const question = QUESTIONS[step]

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-8">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${accent} text-white text-xs font-bold mb-4`}>
          {genderLabel} Names Setup
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
          Let's personalize your list
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Question {step + 1} of 5</p>
        <div className="flex gap-1.5 mt-3">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? accentGradient : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{question.label}</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">{question.hint}</p>

        {question.type === 'text' && (
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextNext(textValue)}
              placeholder="Type your answer..."
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 text-base"
            />
            <button
              onClick={() => handleTextNext(textValue)}
              className={`w-full py-3.5 rounded-xl ${accent} text-white font-bold text-base shadow-md active:scale-95 transition-transform`}
            >
              {step < 4 ? 'Next' : 'Generate My Names'}
            </button>
            {step > 0
              ? <button onClick={() => setStep((step - 1) as Step)} className="text-sm text-gray-400 text-center py-2">← Back</button>
              : <button onClick={() => setPhase('gate')} className="text-sm text-gray-400 text-center py-2">← Back</button>
            }
          </div>
        )}

        {question.type === 'choice' && (
          <div className="flex flex-col gap-3">
            {question.options!.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleChoiceNext(opt.value)}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left hover:border-blue-400 active:scale-95 transition-all"
              >
                <p className="font-bold text-gray-900 dark:text-white">{opt.label}</p>
                <p className="text-sm text-gray-400">{opt.sub}</p>
              </button>
            ))}
            {step > 0
              ? <button onClick={() => setStep((step - 1) as Step)} className="text-sm text-gray-400 text-center py-2">← Back</button>
              : <button onClick={() => setPhase('gate')} className="text-sm text-gray-400 text-center py-2">← Back</button>
            }
          </div>
        )}
      </div>
    </div>
  )
}
