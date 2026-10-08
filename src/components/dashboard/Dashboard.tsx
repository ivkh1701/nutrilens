import { useState } from 'react'
import { CalorieRing } from './CalorieRing'
import { PhotoUpload } from './PhotoUpload'
import { AnalysisModal } from '../modals/AnalysisModal'
import { GoalModal } from '../modals/GoalModal'
import { useToast } from '../../contexts/ToastContext'
import type { MealEntry, GeminiAnalysisResult, GeminiFood, MealType } from '../../lib/types'
import { getGreeting, formatLongDate, getEmojiForMealType } from '../../lib/utils'

interface Props {
  userId: string
  userEmail: string
  todayMeals: MealEntry[]
  currentGoal: number
  onSaveMeal: (foods: GeminiFood[], mealType: MealType, mealTime: string, photoPath: string | null) => Promise<void>
  onDeleteMeal: (id: string) => void
  onSetGoal: (calories: number, effectiveFrom: string) => Promise<void>
  onAddMealClick: () => void
}

interface PendingAnalysis {
  result: GeminiAnalysisResult
  photoPath: string
  previewUrl: string
}

export function Dashboard({
  userId,
  userEmail,
  todayMeals,
  currentGoal,
  onSaveMeal,
  onDeleteMeal,
  onSetGoal,
  onAddMealClick,
}: Props) {
  const toast = useToast()
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null)
  const [showGoalModal, setShowGoalModal] = useState(false)

  const consumed = todayMeals.reduce((s, m) => s + m.total_calories, 0)
  const totalCarbs = todayMeals.reduce((s, m) => s + m.total_carbs, 0)
  const totalProtein = todayMeals.reduce((s, m) => s + m.total_protein, 0)
  const totalFat = todayMeals.reduce((s, m) => s + m.total_fat, 0)

  async function handleSaveMeal(foods: GeminiFood[], mealType: MealType, mealTime: string) {
    if (!pendingAnalysis) return
    await onSaveMeal(foods, mealType, mealTime, pendingAnalysis.photoPath)
    setPendingAnalysis(null)
    toast.show('Meal saved!')
  }

  async function handleSetGoal(calories: number, effectiveFrom: string) {
    await onSetGoal(calories, effectiveFrom)
    toast.show('Calorie goal updated.')
  }

  const name = userEmail.split('@')[0]

  return (
    <>
      <main className="main">
        <div className="hello">
          <div>
            <h1>{getGreeting()}, {name}!</h1>
            <p>{formatLongDate(new Date())}</p>
          </div>
          <div className="date-pill" aria-label="Today's date">Today</div>
        </div>

        {/* Calorie goal card */}
        <section className="card goal-card">
          <div className="card-heading">
            <h2>Daily calorie goal</h2>
            <button className="text-button" onClick={() => setShowGoalModal(true)}>Edit goal</button>
          </div>
          <CalorieRing consumed={consumed} goal={currentGoal} />
        </section>

        {/* Photo upload */}
        <PhotoUpload
          userId={userId}
          onAnalysisReady={(result, photoPath, previewUrl) =>
            setPendingAnalysis({ result, photoPath, previewUrl })
          }
          onError={(msg) => toast.show(msg, 'error')}
        />

        {/* Today's meals */}
        <div className="section">
          <h2 className="section-title">Today's meals</h2>
          <button className="link-button" onClick={onAddMealClick}>+ Add meal</button>
        </div>
        <section className="card meal-list" aria-label="Today's meals">
          {todayMeals.length === 0 ? (
            <div className="empty">No meals logged yet. Add a meal photo to get started.</div>
          ) : (
            todayMeals.map((meal) => (
              <div className="meal-row" key={meal.id}>
                <div className="food-emoji" aria-hidden="true">
                  {getEmojiForMealType(meal.meal_type)}
                </div>
                <div className="meal-info">
                  <strong>
                    {meal.meal_foods?.map((f) => f.food_name).join(', ') || meal.meal_type}
                  </strong>
                  <span>{meal.meal_type} · {meal.meal_time}</span>
                </div>
                <div className="meal-kcal">{meal.total_calories.toLocaleString()} kcal</div>
                <button
                  className="meal-delete-btn"
                  onClick={() => onDeleteMeal(meal.id)}
                  aria-label="Delete meal"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </section>

        {/* Quick macro summary */}
        {todayMeals.length > 0 && (
          <section className="card" aria-label="Today's macros">
            <div className="macro-row">
              <span><i className="macro-dot" aria-hidden="true" />Carbs</span>
              <strong>{totalCarbs} g</strong>
              <span><i className="macro-dot protein" aria-hidden="true" />Protein</span>
              <strong>{totalProtein} g</strong>
              <span><i className="macro-dot fat" aria-hidden="true" />Fat</span>
              <strong>{totalFat} g</strong>
            </div>
          </section>
        )}
      </main>

      {pendingAnalysis && (
        <AnalysisModal
          photoPreview={pendingAnalysis.previewUrl}
          analysis={pendingAnalysis.result}
          onSave={handleSaveMeal}
          onClose={() => setPendingAnalysis(null)}
        />
      )}

      {showGoalModal && (
        <GoalModal
          currentCalories={currentGoal}
          onSave={handleSetGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}
    </>
  )
}
