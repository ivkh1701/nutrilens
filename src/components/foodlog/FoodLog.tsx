import { useState } from 'react'
import type { MealEntry } from '../../lib/types'
import { todayString, toDateString, formatDayLabel, getEmojiForMealType } from '../../lib/utils'

interface Props {
  meals: MealEntry[]
  onDeleteMeal: (id: string) => void
}

const PAGE_SIZE = 7

export function FoodLog({ meals, onDeleteMeal }: Props) {
  const [offset, setOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Build date list: last (PAGE_SIZE + offset) days, plus any meal dates outside that range
  const today = new Date()
  const referenceDates: string[] = []
  for (let i = 0; i < PAGE_SIZE + offset; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    referenceDates.push(toDateString(d))
  }
  const extraMealDates = [...new Set(meals.map((m) => m.meal_date))].filter(
    (d) => !referenceDates.includes(d),
  )
  const allDates = [...referenceDates, ...extraMealDates].sort((a, b) => (a > b ? -1 : 1))
  const visibleDates = allDates.slice(0, PAGE_SIZE + offset)

  const groups = visibleDates
    .map((date) => ({
      date,
      label: formatDayLabel(date),
      meals: meals.filter((m) => m.meal_date === date),
    }))
    .filter((g) => g.meals.length > 0 || g.date === todayString())

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <main className="main">
      <div className="hello">
        <div>
          <h1>Food Log</h1>
          <p>All your logged meals</p>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="card">
          <div className="empty">
            No meals logged yet. Go to the Dashboard to add your first meal.
          </div>
        </div>
      )}

      {groups.map(({ date, label, meals: dayMeals }) => (
        <section key={date}>
          <div className="meal-group-header">{label}</div>
          <div className="card meal-list" style={{ padding: '2px 15px' }}>
            {dayMeals.length === 0 ? (
              <div className="empty" style={{ padding: '14px 0' }}>No meals logged.</div>
            ) : (
              dayMeals.map((meal) => (
                <div key={meal.id}>
                  <div
                    className="meal-row expandable"
                    onClick={() => toggleExpand(meal.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedId === meal.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleExpand(meal.id)
                      }
                    }}
                  >
                    {meal.photo_url ? (
                      <img src={meal.photo_url} alt="" className="meal-photo-thumb" />
                    ) : (
                      <div className="food-emoji" aria-hidden="true">
                        {getEmojiForMealType(meal.meal_type)}
                      </div>
                    )}
                    <div className="meal-info">
                      <strong>
                        {meal.meal_foods?.map((f) => f.food_name).join(', ') || meal.meal_type}
                      </strong>
                      <span>{meal.meal_type} · {meal.meal_time}</span>
                    </div>
                    <div className="meal-kcal">{meal.total_calories.toLocaleString()} kcal</div>
                    <button
                      className="meal-delete-btn"
                      onClick={(e) => { e.stopPropagation(); onDeleteMeal(meal.id) }}
                      aria-label="Delete meal"
                      style={{ opacity: 1 }}
                    >
                      🗑
                    </button>
                  </div>

                  {expandedId === meal.id && (
                    <div className="meal-foods-detail">
                      <div className="macro-chips">
                        <span className="macro-chip">{meal.total_carbs}g carbs</span>
                        <span className="macro-chip">{meal.total_protein}g protein</span>
                        <span className="macro-chip">{meal.total_fat}g fat</span>
                      </div>

                      {meal.meal_foods && meal.meal_foods.length > 0 && (
                        <table>
                          <thead>
                            <tr>
                              <th>Food</th>
                              <th>Serving</th>
                              <th>kcal</th>
                              <th>C</th>
                              <th>P</th>
                              <th>F</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meal.meal_foods.map((f) => (
                              <tr key={f.id}>
                                <td>{f.food_name}</td>
                                <td>{f.serving_qty} {f.serving_unit}</td>
                                <td>{f.calories}</td>
                                <td>{f.carbs}g</td>
                                <td>{f.protein}g</td>
                                <td>{f.fat}g</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      ))}

      <button
        className="secondary"
        style={{ width: '100%', marginTop: 12 }}
        onClick={() => setOffset((o) => o + PAGE_SIZE)}
      >
        Load older meals
      </button>
    </main>
  )
}
