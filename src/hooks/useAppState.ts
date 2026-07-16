import { useState, useCallback } from 'react'
import type { AppState, Gender, NameEntry, Settings } from '../types'
import { loadState, saveState, resetGenderState } from '../lib/storage'
import { calculateElo } from '../lib/elo'

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState())

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }, [])

  const setActiveGender = useCallback((gender: Gender) => {
    update(s => ({ ...s, activeGender: gender }))
  }, [update])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    update(s => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [update])

  const completeOnboarding = useCallback((gender: Gender, names: NameEntry[]) => {
    update(s => ({
      ...s,
      [gender]: { onboardingComplete: true, names },
    }))
  }, [update])

  const recordMatchup = useCallback((gender: Gender, winnerId: string, loserId: string) => {
    update(s => {
      const genderState = s[gender]
      const names = genderState.names.map(n => {
        if (n.id === winnerId || n.id === loserId) {
          const other = genderState.names.find(x => x.id === (n.id === winnerId ? loserId : winnerId))!
          const { newWinnerScore, newLoserScore } = calculateElo(
            n.id === winnerId ? n.score : other.score,
            n.id === loserId ? n.score : other.score,
          )
          return {
            ...n,
            score: n.id === winnerId ? newWinnerScore : newLoserScore,
            comparisons: n.comparisons + 1,
          }
        }
        return n
      })
      return { ...s, [gender]: { ...genderState, names } }
    })
  }, [update])

  const addName = useCallback((gender: Gender, name: string, isCustom = false) => {
    const entry: NameEntry = {
      id: crypto.randomUUID(),
      name,
      gender,
      score: 1200,
      comparisons: 0,
      addedAt: Date.now(),
      isCustom,
    }
    update(s => ({
      ...s,
      [gender]: { ...s[gender], names: [...s[gender].names, entry] },
    }))
    return entry
  }, [update])

  const deleteName = useCallback((gender: Gender, id: string) => {
    update(s => ({
      ...s,
      [gender]: { ...s[gender], names: s[gender].names.filter(n => n.id !== id) },
    }))
  }, [update])

  const resetGender = useCallback((gender: Gender) => {
    setState(prev => {
      const next = resetGenderState(prev, gender)
      return next
    })
  }, [])

  return {
    state,
    setActiveGender,
    updateSettings,
    completeOnboarding,
    recordMatchup,
    addName,
    deleteName,
    resetGender,
  }
}
