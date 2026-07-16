export type Gender = 'boy' | 'girl'

export type AIProvider = 'claude' | 'openai'
export type Theme = 'system' | 'light' | 'dark'

export interface NameEntry {
  id: string
  name: string
  gender: Gender
  score: number
  comparisons: number
  addedAt: number
  isCustom: boolean
}

export interface Settings {
  theme: Theme
  aiProvider: AIProvider
  claudeApiKey: string
  openaiApiKey: string
  claudeModel: string
  openaiModel: string
  exploreRatio: number
  sampleSize: number
  weightingFactor: number
  aiEnabled: boolean
}

export interface GenderState {
  onboardingComplete: boolean
  names: NameEntry[]
}

export interface AppState {
  settings: Settings
  boy: GenderState
  girl: GenderState
  activeGender: Gender
}

export interface OnboardingAnswers {
  heritage: string
  nameStyle: 'classic' | 'modern'
  lovedSounds: string
  dislikedSounds: string
  vibes: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  aiProvider: 'claude',
  claudeApiKey: '',
  openaiApiKey: '',
  claudeModel: 'claude-haiku-4-5-20251001',
  openaiModel: 'gpt-4o-mini',
  exploreRatio: 0.3,
  sampleSize: 5,
  weightingFactor: 1.5,
  aiEnabled: false,
}

export const DEFAULT_GENDER_STATE: GenderState = {
  onboardingComplete: false,
  names: [],
}
