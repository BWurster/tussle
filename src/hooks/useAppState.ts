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
      const winner = genderState.names.find(n => n.id === winnerId)
      const loser = genderState.names.find(n => n.id === loserId)
      // One side may have already been auto-removed (low win rate) by a
      // different matchup that resolved first; skip recording in that case.
      if (!winner || !loser) return s

      const { newWinnerScore, newLoserScore } = calculateElo(winner.score, loser.score)
      const names = genderState.names
        .map(n => {
          if (n.id === winnerId) {
            return { ...n, score: newWinnerScore, comparisons: n.comparisons + 1, wins: n.wins + 1 }
          }
          if (n.id === loserId) {
            return { ...n, score: newLoserScore, comparisons: n.comparisons + 1, losses: n.losses + 1 }
          }
          return n
        })
        .filter(n => {
          if (n.id !== winnerId && n.id !== loserId) return true
          return n.comparisons < 3 || n.wins / n.comparisons >= 0.25
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
      wins: 0,
      losses: 0,
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

  const deleteNames = useCallback((gender: Gender, ids: string[]) => {
    const idSet = new Set(ids)
    update(s => ({
      ...s,
      [gender]: { ...s[gender], names: s[gender].names.filter(n => !idSet.has(n.id)) },
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
    deleteNames,
    resetGender,
  }
}
