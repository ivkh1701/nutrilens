export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other'
export type MealStatus = 'draft' | 'confirmed'
export type NavTab = 'Dashboard' | 'Food Log' | 'Reports' | 'Goals'
export type ReportPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Custom'

export interface Profile {
  id: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface CalorieGoal {
  id: string
  user_id: string
  calories: number
  effective_from: string
  effective_to: string | null
  created_at: string
  updated_at: string
}

export interface MealEntry {
  id: string
  user_id: string
  meal_date: string
  meal_time: string
  meal_type: MealType
  photo_path: string | null
  photo_url?: string | null
  total_calories: number
  total_carbs: number
  total_protein: number
  total_fat: number
  status: MealStatus
  notes: string | null
  created_at: string
  updated_at: string
  meal_foods?: MealFood[]
}

export interface MealFood {
  id: string
  meal_entry_id: string
  food_name: string
  serving_qty: number
  serving_unit: string
  calories: number
  carbs: number
  protein: number
  fat: number
  confidence: number | null
  created_at: string
}

export interface GeminiFood {
  name: string
  serving_qty: number
  serving_unit: string
  calories: number
  carbs: number
  protein: number
  fat: number
  confidence: number
}

export interface GeminiAnalysisResult {
  foods: GeminiFood[]
  total_calories: number
  total_carbs: number
  total_protein: number
  total_fat: number
  confidence: number
  notes: string
}

export interface DaySummary {
  date: string
  calories: number
  carbs: number
  protein: number
  fat: number
  meal_count: number
}

export interface ToastPayload {
  message: string
  type?: 'default' | 'error'
}
