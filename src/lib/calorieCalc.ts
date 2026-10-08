export interface OnboardingData {
  gender: 'male' | 'female' | 'other'
  age: number
  height_cm: number
  weight_kg: number
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  fitness_goal: 'fat_loss' | 'lean_muscle' | 'muscle_gain' | 'maintain'
}

const ACTIVITY_MULTIPLIER: Record<OnboardingData['activity_level'], number> = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,
  active:     1.725,
  very_active: 1.9,
}

const GOAL_ADJUSTMENT: Record<OnboardingData['fitness_goal'], number> = {
  fat_loss:    -500,
  lean_muscle:  150,
  muscle_gain:  300,
  maintain:       0,
}

/**
 * Mifflin-St Jeor BMR → TDEE → goal-adjusted daily calorie target.
 * Returns the value rounded to the nearest 50 kcal.
 */
export function calculateRecommendedCalories(data: OnboardingData): number {
  // BMR
  const base = 10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age
  const bmr = data.gender === 'male' ? base + 5 : base - 161

  // TDEE
  const tdee = bmr * ACTIVITY_MULTIPLIER[data.activity_level]

  // Adjusted for goal, rounded to nearest 50
  const raw = tdee + GOAL_ADJUSTMENT[data.fitness_goal]
  return Math.max(1200, Math.round(raw / 50) * 50)
}
