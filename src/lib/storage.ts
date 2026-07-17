import type { AppState, Gender, GenderState, NameEntry } from '../types'
import { DEFAULT_SETTINGS, DEFAULT_GENDER_STATE } from '../types'

const STORAGE_KEY = 'baby-name-app-state'

function migrateNameEntry(n: NameEntry): NameEntry {
  return {
    ...n,
    wins: n.wins ?? n.comparisons,
    losses: n.losses ?? 0,
  }
}

function migrateGenderState(g: Partial<GenderState> | undefined): GenderState {
  const merged = { ...DEFAULT_GENDER_STATE, ...g }
  return { ...merged, names: merged.names.map(migrateNameEntry) }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as AppState
    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      boy: migrateGenderState(parsed.boy),
      girl: migrateGenderState(parsed.girl),
      activeGender: parsed.activeGender ?? 'boy',
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetGenderState(state: AppState, gender: Gender): AppState {
  const next = {
    ...state,
    [gender]: { ...DEFAULT_GENDER_STATE },
  }
  saveState(next)
  return next
}

function defaultState(): AppState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    boy: { ...DEFAULT_GENDER_STATE },
    girl: { ...DEFAULT_GENDER_STATE },
    activeGender: 'boy',
  }
}
