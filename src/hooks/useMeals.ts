import { useCallback, useEffect, useState } from 'react'
import { supabase, MEAL_PHOTOS_BUCKET, getSignedPhotoUrl } from '../lib/supabase'
import type { MealEntry, MealFood, GeminiFood, MealType } from '../lib/types'

export function useMeals(userId: string | undefined) {
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeals = useCallback(
    async (from?: string, to?: string) => {
      if (!userId) return
      setLoading(true)
      let query = supabase
        .from('meal_entries')
        .select('*, meal_foods(*)')
        .eq('user_id', userId)
        .order('meal_date', { ascending: false })
        .order('meal_time', { ascending: false })

      if (from) query = query.gte('meal_date', from)
      if (to) query = query.lte('meal_date', to)

      const { data, error } = await query
      setLoading(false)
      if (error) { setError(error.message); return }

      // Attach signed photo URLs for any meals with photos
      const enriched = await Promise.all(
        (data as MealEntry[]).map(async (m) => {
          if (!m.photo_path) return m
          const url = await getSignedPhotoUrl(m.photo_path)
          return { ...m, photo_url: url }
        }),
      )
      setMeals(enriched)
    },
    [userId],
  )

  useEffect(() => { fetchMeals() }, [fetchMeals])

  /** Upload a photo to Supabase Storage and return the storage path */
  async function uploadPhoto(file: File, path: string): Promise<{ path: string; error: string | null }> {
    const { error } = await supabase.storage.from(MEAL_PHOTOS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    return { path, error: error ? error.message : null }
  }

  /** Save a confirmed meal entry with its foods */
  async function saveMeal(opts: {
    mealType: MealType
    mealDate: string
    mealTime: string
    photoPath: string | null
    foods: GeminiFood[]
    notes?: string
  }): Promise<{ id: string | null; error: string | null }> {
    if (!userId) return { id: null, error: 'Not authenticated' }

    const totalCalories = opts.foods.reduce((s, f) => s + f.calories, 0)
    const totalCarbs = opts.foods.reduce((s, f) => s + f.carbs, 0)
    const totalProtein = opts.foods.reduce((s, f) => s + f.protein, 0)
    const totalFat = opts.foods.reduce((s, f) => s + f.fat, 0)

    const { data, error } = await supabase
      .from('meal_entries')
      .insert({
        user_id: userId,
        meal_date: opts.mealDate,
        meal_time: opts.mealTime,
        meal_type: opts.mealType,
        photo_path: opts.photoPath,
        total_calories: totalCalories,
        total_carbs: totalCarbs,
        total_protein: totalProtein,
        total_fat: totalFat,
        status: 'confirmed',
        notes: opts.notes ?? null,
      })
      .select('id')
      .single()

    if (error) return { id: null, error: error.message }
    const mealId = (data as { id: string }).id

    if (opts.foods.length > 0) {
      const foodRows: Omit<MealFood, 'id' | 'created_at'>[] = opts.foods.map((f) => ({
        meal_entry_id: mealId,
        food_name: f.name,
        serving_qty: f.serving_qty,
        serving_unit: f.serving_unit,
        calories: f.calories,
        carbs: f.carbs,
        protein: f.protein,
        fat: f.fat,
        confidence: f.confidence ?? null,
      }))
      const { error: foodErr } = await supabase.from('meal_foods').insert(foodRows)
      if (foodErr) return { id: mealId, error: foodErr.message }
    }

    await fetchMeals()
    return { id: mealId, error: null }
  }

  async function deleteMeal(mealId: string): Promise<string | null> {
    const meal = meals.find((m) => m.id === mealId)
    const { error } = await supabase.from('meal_entries').delete().eq('id', mealId)
    if (error) return error.message
    // Clean up photo from storage if present
    if (meal?.photo_path) {
      await supabase.storage.from(MEAL_PHOTOS_BUCKET).remove([meal.photo_path])
    }
    setMeals((prev) => prev.filter((m) => m.id !== mealId))
    return null
  }

  /** Meals on a specific date */
  function mealsForDate(date: string): MealEntry[] {
    return meals.filter((m) => m.meal_date === date)
  }

  /** Day-level summaries for a range of dates */
  function summariesForDates(dates: string[]) {
    return dates.map((date) => {
      const dayMeals = mealsForDate(date)
      return {
        date,
        calories: dayMeals.reduce((s, m) => s + m.total_calories, 0),
        carbs: dayMeals.reduce((s, m) => s + m.total_carbs, 0),
        protein: dayMeals.reduce((s, m) => s + m.total_protein, 0),
        fat: dayMeals.reduce((s, m) => s + m.total_fat, 0),
        meal_count: dayMeals.length,
      }
    })
  }

  return {
    meals,
    loading,
    error,
    fetchMeals,
    uploadPhoto,
    saveMeal,
    deleteMeal,
    mealsForDate,
    summariesForDates,
  }
}
