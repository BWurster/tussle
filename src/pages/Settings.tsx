import { useState, useEffect } from 'react'
import { Eye, EyeOff, ChevronDown, Loader2, Sun, Moon, Monitor } from 'lucide-react'
import type { Settings as SettingsType, AIProvider, Gender, Theme } from '../types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { fetchAvailableModels } from '../lib/ai'

interface Props {
  gender: Gender
  settings: SettingsType
  onUpdate: (patch: Partial<SettingsType>) => void
  onResetGender: (gender: Gender) => void
}

const PROVIDERS: { value: AIProvider; label: string; placeholder: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI',             placeholder: 'sk-...' },
]

const FALLBACK_MODELS: Record<AIProvider, string[]> = {
  claude: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5', 'claude-opus-4-5'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-mini'],
}

function SelectRow({ value, onChange, options, loading }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  loading?: boolean
}) {
  const current = options.find(o => o.value === value)
  return (
    <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer">
      <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
        {current?.label ?? value}
      </span>
      {loading
        ? <Loader2 size={14} className="text-gray-400 animate-spin shrink-0" />
        : <ChevronDown size={14} className="text-gray-400 shrink-0" />
      }
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function Settings({ gender, settings, onUpdate, onResetGender }: Props) {
  const [aiOpen, setAiOpen] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const genderLabel = gender === 'boy' ? 'Boy' : 'Girl'
  const sliderAccent = gender === 'boy' ? 'accent-blue-500' : 'accent-pink-500'
  const activeProvider = PROVIDERS.find(p => p.value === settings.aiProvider)!
  const apiKey = settings.aiProvider === 'claude' ? settings.claudeApiKey : settings.openaiApiKey
  const keyField = settings.aiProvider === 'claude' ? 'claudeApiKey' : 'openaiApiKey'
  const modelField = settings.aiProvider === 'claude' ? 'claudeModel' : 'openaiModel'
  const currentModel = settings.aiProvider === 'claude' ? settings.claudeModel : settings.openaiModel
  const modelOptions = (models.length > 0 ? models : FALLBACK_MODELS[settings.aiProvider]).map(m => ({ value: m, label: m }))

  useEffect(() => {
    if (!apiKey || apiKey.length < 10) {
      setModels([])
      return
    }
    const timer = setTimeout(async () => {
      setModelsLoading(true)
      try {
        const fetched = await fetchAvailableModels(settings.aiProvider, apiKey)
        setModels(fetched)
        if (fetched.length > 0 && !fetched.includes(currentModel)) {
          onUpdate({ [modelField]: fetched[0] })
        }
      } catch {
        setModels([])
      } finally {
        setModelsLoading(false)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [apiKey, settings.aiProvider])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">

          {/* AI Settings accordion — card widget */}
          <section className="px-4 py-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setAiOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left bg-gray-50 dark:bg-gray-800/60"
              >
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">AI Settings</span>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 transition-transform duration-200 ${aiOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {aiOpen && (
                <div className="px-3 pb-3 pt-2 space-y-2 bg-white dark:bg-gray-900">
                  <SelectRow
                    value={settings.aiProvider}
                    onChange={v => { onUpdate({ aiProvider: v as AIProvider }); setShowKey(false) }}
                    options={PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
                  />

                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => onUpdate({ [keyField]: e.target.value })}
                      placeholder={activeProvider.placeholder}
                      className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none"
                    />
                    <button onClick={() => setShowKey(v => !v)} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0">
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  <SelectRow
                    value={currentModel}
                    onChange={v => onUpdate({ [modelField]: v })}
                    options={modelOptions}
                    loading={modelsLoading}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Generation params */}
          <section className="px-4 py-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Generation Settings</h3>
            <div className="space-y-5">

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Explore / Refine Ratio</label>
                  <span className={`text-sm font-bold ${gender === 'boy' ? 'text-blue-500' : 'text-pink-500'}`}>
                    {Math.round(settings.exploreRatio * 100)}% / {100 - Math.round(settings.exploreRatio * 100)}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={100}
                  value={Math.round(settings.exploreRatio * 100)}
                  onChange={e => onUpdate({ exploreRatio: Number(e.target.value) / 100 })}
                  className={`w-full ${sliderAccent}`}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>All Refine</span><span>All Explore</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Sample Size</label>
                  <span className={`text-sm font-bold ${gender === 'boy' ? 'text-blue-500' : 'text-pink-500'}`}>{settings.sampleSize}</span>
                </div>
                <input
                  type="range" min={1} max={20}
                  value={settings.sampleSize}
                  onChange={e => onUpdate({ sampleSize: Number(e.target.value) })}
                  className={`w-full ${sliderAccent}`}
                />
                <p className="text-xs text-gray-400 mt-1">Names fed as context to AI for generation</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Score Weighting (α)</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdate({ weightingFactor: Math.max(0, +(settings.weightingFactor - 0.1).toFixed(1)) })}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >−</button>
                    <span className="text-sm font-bold text-blue-500 w-8 text-center">
                      {settings.weightingFactor.toFixed(1)}
                    </span>
                    <button
                      onClick={() => onUpdate({ weightingFactor: Math.min(5, +(settings.weightingFactor + 0.1).toFixed(1)) })}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >+</button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">0 = uniform · 1 = linear · higher = top names dominate</p>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="px-4 py-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Appearance</h3>
            <div className="flex gap-2">
              {([
                { value: 'light',  label: 'Light',  Icon: Sun },
                { value: 'system', label: 'System', Icon: Monitor },
                { value: 'dark',   label: 'Dark',   Icon: Moon },
              ] as { value: Theme; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => onUpdate({ theme: value })}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                    settings.theme === value
                      ? `border-current ${gender === 'boy' ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'text-pink-500 bg-pink-50 dark:bg-pink-950/40'}`
                      : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Reset */}
          <section className="px-4 py-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Reset</h3>
            <p className="text-xs text-gray-400 mb-3">Clears all {genderLabel.toLowerCase()} names and scores</p>
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Reset {genderLabel} Names
            </button>
          </section>

        </div>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title={`Reset ${genderLabel} Names?`}
          message={`All ${genderLabel.toLowerCase()} names, scores, and rankings will be permanently deleted. You'll go through onboarding again. This cannot be undone.`}
          confirmLabel="Reset"
          onConfirm={() => { onResetGender(gender); setConfirmReset(false) }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
