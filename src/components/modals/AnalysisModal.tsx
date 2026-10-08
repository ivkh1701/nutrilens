import { useState } from 'react'
import { Modal } from '../shared/Modal'
import type { GeminiAnalysisResult, GeminiFood, MealType } from '../../lib/types'
import { getEmojiForMealType, formatTime } from '../../lib/utils'

interface Props {
  photoPreview: string
  analysis: GeminiAnalysisResult
  onSave: (foods: GeminiFood[], mealType: MealType, mealTime: string) => Promise<void>
  onClose: () => void
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other']

function inferMealType(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'Breakfast'
  if (h < 14) return 'Lunch'
  if (h < 18) return 'Snack'
  if (h < 21) return 'Dinner'
  return 'Snack'
}

export function AnalysisModal({ photoPreview, analysis, onSave, onClose }: Props) {
  const [foods, setFoods] = useState<GeminiFood[]>(analysis.foods)
  const [mealType, setMealType] = useState<MealType>(inferMealType())
  const [saving, setSaving] = useState(false)

  function updateFood(index: number, field: keyof GeminiFood, value: string | number) {
    setFoods((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, [field]: typeof value === 'string' ? value : Number(value) } : f,
      ),
    )
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index))
  }

  function addFood() {
    setFoods((prev) => [
      ...prev,
      { name: 'New food', serving_qty: 1, serving_unit: 'serving', calories: 0, carbs: 0, protein: 0, fat: 0, confidence: 0.5 },
    ])
  }

  const totalCalories = foods.reduce((s, f) => s + (Number(f.calories) || 0), 0)
  const totalCarbs = foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0)
  const totalProtein = foods.reduce((s, f) => s + (Number(f.protein) || 0), 0)
  const totalFat = foods.reduce((s, f) => s + (Number(f.fat) || 0), 0)

  async function handleSave() {
    setSaving(true)
    await onSave(foods, mealType, formatTime(new Date()))
    setSaving(false)
  }

  return (
    <Modal title="Review meal analysis" onClose={onClose} id="analysis-modal-title">
      {photoPreview && (
        <img src={photoPreview} alt="Your meal" className="analysis-photo" />
      )}

      {analysis.notes && (
        <div className="analysis-notes" role="note">
          ✦ {analysis.notes}
        </div>
      )}

      {foods.length === 0 && (
        <div className="empty">No foods identified. Add items manually below.</div>
      )}

      {foods.map((food, i) => (
        <div key={i} className="food-item-edit">
          <div className="food-item-edit-header">
            <strong>Food {i + 1}</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`confidence-badge${food.confidence < 0.6 ? ' low' : ''}`}>
                {Math.round(food.confidence * 100)}% confident
              </span>
              <button
                className="icon-button"
                onClick={() => removeFood(i)}
                aria-label={`Remove ${food.name}`}
              >
                ✕
              </button>
            </div>
          </div>

          <input
            className="food-item-name-input"
            type="text"
            value={food.name}
            onChange={(e) => updateFood(i, 'name', e.target.value)}
            aria-label="Food name"
          />

          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <div className="macro-input-wrap" style={{ flex: 1 }}>
              <label>Qty</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={food.serving_qty}
                onChange={(e) => updateFood(i, 'serving_qty', e.target.value)}
              />
            </div>
            <div className="macro-input-wrap" style={{ flex: 2 }}>
              <label>Unit</label>
              <input
                type="text"
                value={food.serving_unit}
                onChange={(e) => updateFood(i, 'serving_unit', e.target.value)}
              />
            </div>
          </div>

          <div className="food-macros-grid">
            <div className="macro-input-wrap">
              <label>Calories (kcal)</label>
              <input
                type="number"
                min={0}
                value={food.calories}
                onChange={(e) => updateFood(i, 'calories', e.target.value)}
              />
            </div>
            <div className="macro-input-wrap">
              <label>Carbs (g)</label>
              <input
                type="number"
                min={0}
                value={food.carbs}
                onChange={(e) => updateFood(i, 'carbs', e.target.value)}
              />
            </div>
            <div className="macro-input-wrap">
              <label>Protein (g)</label>
              <input
                type="number"
                min={0}
                value={food.protein}
                onChange={(e) => updateFood(i, 'protein', e.target.value)}
              />
            </div>
            <div className="macro-input-wrap">
              <label>Fat (g)</label>
              <input
                type="number"
                min={0}
                value={food.fat}
                onChange={(e) => updateFood(i, 'fat', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <button className="add-food-btn" onClick={addFood} type="button">
        + Add food item
      </button>

      <div className="analysis-totals">
        <span><strong>{totalCalories}</strong> kcal</span>
        <span><strong>{totalCarbs}g</strong> carbs</span>
        <span><strong>{totalProtein}g</strong> protein</span>
        <span><strong>{totalFat}g</strong> fat</span>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 8px' }}>Meal type</p>
      <div className="meal-type-select" role="group" aria-label="Select meal type">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            className={`meal-type-btn${mealType === t ? ' active' : ''}`}
            onClick={() => setMealType(t)}
            aria-pressed={mealType === t}
          >
            <span>{getEmojiForMealType(t)}</span>
            <span>{t}</span>
          </button>
        ))}
      </div>

      <div className="modal-actions">
        <button className="secondary" onClick={onClose} style={{ flex: 1 }}>Discard</button>
        <button
          className="primary"
          onClick={handleSave}
          disabled={saving || foods.length === 0}
          style={{ flex: 2 }}
        >
          {saving ? 'Saving…' : 'Save meal'}
        </button>
      </div>
    </Modal>
  )
}
