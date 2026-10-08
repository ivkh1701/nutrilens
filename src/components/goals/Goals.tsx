import { useState } from 'react'
import type { CalorieGoal } from '../../lib/types'
import { todayString, formatShortDate } from '../../lib/utils'
import { useToast } from '../../contexts/ToastContext'

interface Props {
  goals: CalorieGoal[]
  currentGoal: number
  onSetGoal: (calories: number, effectiveFrom: string) => Promise<void>
}

export function Goals({ goals, currentGoal, onSetGoal }: Props) {
  const toast = useToast()
  const [newCalories, setNewCalories] = useState(currentGoal)
  const [effectiveFrom, setEffectiveFrom] = useState(todayString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (newCalories < 500 || newCalories > 10000) {
      setError('Goal must be between 500 and 10,000 kcal.')
      return
    }
    setError(null)
    setSaving(true)
    await onSetGoal(newCalories, effectiveFrom)
    setSaving(false)
    toast.show('Calorie goal updated.')
  }

  return (
    <main className="main">
      <div className="hello">
        <div>
          <h1>Goals</h1>
          <p>Manage your daily calorie targets</p>
        </div>
      </div>

      <div className="goals-current">
        <div>
          <div className="goal-label">Current daily goal</div>
          <div className="goal-value">{currentGoal.toLocaleString()}</div>
          <div className="goal-label">kcal / day</div>
        </div>
        <span aria-hidden="true" style={{ fontSize: 48 }}>◎</span>
      </div>

      <section className="card">
        <div className="card-heading">
          <h2>Update goal</h2>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="field">
          <label htmlFor="new-goal-kcal">Daily target (kcal)</label>
          <input
            id="new-goal-kcal"
            type="number"
            min={500}
            max={10000}
            step={50}
            value={newCalories}
            onChange={(e) => setNewCalories(Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="goal-from-date">Effective from</label>
          <input
            id="goal-from-date"
            type="date"
            value={effectiveFrom}
            max={todayString()}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>

        <p className="goal-effective-note">
          Historical reports will continue to use the goal that was active on each day. Changing
          the effective date only updates reports from that date forward.
        </p>

        <button
          className="primary"
          style={{ width: '100%', marginTop: 14 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save goal'}
        </button>
      </section>

      {goals.length > 0 && (
        <section className="card">
          <div className="card-heading">
            <h2>Goal history</h2>
          </div>
          <div style={{ padding: '0 2px' }}>
            {goals.map((g) => (
              <div className="goal-history-row" key={g.id}>
                <div>
                  <strong>{g.calories.toLocaleString()} kcal</strong>
                  {g.effective_to === null && (
                    <span
                      style={{ marginLeft: 8, fontSize: 11, background: 'var(--sage)', color: 'var(--green-dark)', padding: '2px 7px', borderRadius: 6 }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div className="goal-history-date">
                  {formatShortDate(g.effective_from)}
                  {g.effective_to && ` → ${formatShortDate(g.effective_to)}`}
                  {g.effective_to === null && ' → now'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
