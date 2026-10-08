import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { todayString } from '../../lib/utils'

interface Props {
  currentCalories: number
  onSave: (calories: number, effectiveFrom: string) => Promise<void>
  onClose: () => void
}

export function GoalModal({ currentCalories, onSave, onClose }: Props) {
  const [calories, setCalories] = useState(currentCalories)
  const [effectiveFrom, setEffectiveFrom] = useState(todayString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (calories < 500 || calories > 10000) {
      setError('Enter a goal between 500 and 10,000 kcal.')
      return
    }
    setSaving(true)
    await onSave(calories, effectiveFrom)
    setSaving(false)
    onClose()
  }

  return (
    <Modal title="Update daily calorie goal" onClose={onClose}>
      {error && <div className="auth-error">{error}</div>}
      <div className="field">
        <label htmlFor="goal-kcal">Daily target (kcal)</label>
        <input
          id="goal-kcal"
          type="number"
          min={500}
          max={10000}
          step={50}
          value={calories}
          onChange={(e) => setCalories(Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label htmlFor="goal-from">Effective from</label>
        <input
          id="goal-from"
          type="date"
          value={effectiveFrom}
          max={todayString()}
          onChange={(e) => setEffectiveFrom(e.target.value)}
        />
      </div>
      <p className="goal-effective-note">
        Historical reports will use the goal that was active on each day, so changing this date only affects the
        selected range going forward.
      </p>
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>Cancel</button>
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save goal'}
        </button>
      </div>
    </Modal>
  )
}
