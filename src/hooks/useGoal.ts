import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CalorieGoal } from '../lib/types'

export function useGoal(userId: string | undefined) {
  const [goals, setGoals] = useState<CalorieGoal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('calorie_goals')
      .select('*')
      .eq('user_id', userId)
      .order('effective_from', { ascending: false })
    setLoading(false)
    if (error) { setError(error.message); return }
    setGoals(data as CalorieGoal[])
  }, [userId])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  /** Returns the active calorie target for a given date string (YYYY-MM-DD) */
  function goalForDate(date: string): number {
    const match = goals.find(
      (g) => g.effective_from <= date && (g.effective_to === null || g.effective_to >= date),
    )
    return match?.calories ?? 2000
  }

  /** Current active goal calories */
  const currentGoal = goalForDate(new Date().toLocaleDateString('en-CA'))

  async function setGoal(calories: number, effectiveFrom: string): Promise<string | null> {
    if (!userId) return 'Not authenticated'

    const openGoal = goals.find((g) => g.effective_to === null)

    if (openGoal) {
      if (openGoal.effective_from === effectiveFrom) {
        // Same start date — just update the calorie value in place
        const { error } = await supabase
          .from('calorie_goals')
          .update({ calories })
          .eq('id', openGoal.id)
        if (error) return error.message
        await fetchGoals()
        return null
      } else if (openGoal.effective_from < effectiveFrom) {
        // Close the old goal the day before the new one starts
        const prev = new Date(effectiveFrom + 'T00:00:00')
        prev.setDate(prev.getDate() - 1)
        const { error: closeErr } = await supabase
          .from('calorie_goals')
          .update({ effective_to: prev.toLocaleDateString('en-CA') })
          .eq('id', openGoal.id)
        if (closeErr) return closeErr.message
      }
    }

    // Insert the new open-ended goal
    const { error } = await supabase.from('calorie_goals').insert({
      user_id: userId,
      calories,
      effective_from: effectiveFrom,
      effective_to: null,
    })
    if (error) return error.message
    await fetchGoals()
    return null
  }

  return { goals, currentGoal, goalForDate, loading, error, setGoal, refetch: fetchGoals }
}
