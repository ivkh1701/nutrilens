import { useState } from 'react'
import { calculateRecommendedCalories, type OnboardingData } from '../../lib/calorieCalc'

interface Props {
  onComplete: (data: OnboardingData, recommendedCalories: number) => Promise<void>
}

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',  label: 'Sedentary',       desc: 'Little or no exercise, desk job' },
  { value: 'light',      label: 'Lightly active',  desc: '1–3 days of exercise per week' },
  { value: 'moderate',   label: 'Moderately active',desc: '3–5 days of exercise per week' },
  { value: 'active',     label: 'Very active',      desc: '6–7 days of hard exercise' },
  { value: 'very_active',label: 'Extra active',     desc: 'Physical job + hard exercise' },
] as const

const GOAL_OPTIONS = [
  { value: 'fat_loss',    label: 'Fat Loss',          emoji: '🔥', desc: '500 kcal deficit · ~0.5 kg/week' },
  { value: 'lean_muscle', label: 'Build Lean Muscle', emoji: '💪', desc: '150 kcal surplus · lean bulk' },
  { value: 'muscle_gain', label: 'Muscle Gain',       emoji: '🏋️', desc: '300 kcal surplus · faster gains' },
  { value: 'maintain',    label: 'Maintain Weight',   emoji: '⚖️', desc: 'Eat at maintenance' },
] as const

type Step = 1 | 2 | 3 | 4

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [activity, setActivity] = useState<OnboardingData['activity_level']>('moderate')
  const [goal, setGoal] = useState<OnboardingData['fitness_goal']>('maintain')

  const recommended = age && heightCm && weightKg
    ? calculateRecommendedCalories({
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activity,
        fitness_goal: goal,
      })
    : null

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!age || Number(age) < 10 || Number(age) > 100) errs.age = 'Enter a valid age (10–100).'
    if (!heightCm || Number(heightCm) < 100 || Number(heightCm) > 250) errs.height = 'Enter height in cm (100–250).'
    if (!weightKg || Number(weightKg) < 20 || Number(weightKg) > 300) errs.weight = 'Enter weight in kg (20–300).'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    setStep((s) => Math.min(4, s + 1) as Step)
  }

  async function handleFinish() {
    if (!recommended) return
    setSaving(true)
    await onComplete(
      { gender, age: Number(age), height_cm: Number(heightCm), weight_kg: Number(weightKg), activity_level: activity, fitness_goal: goal },
      recommended,
    )
    setSaving(false)
  }

  const goalLabel = GOAL_OPTIONS.find((g) => g.value === goal)?.label ?? ''
  const activityLabel = ACTIVITY_OPTIONS.find((a) => a.value === activity)?.label ?? ''

  return (
    <div className="auth-wrap" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="auth-card" style={{ maxWidth: 480, width: '100%' }}>
        {/* Header */}
        <div className="brand" style={{ marginBottom: 6 }}>
          <span className="brand-mark" aria-hidden="true">🌿</span> NutriLens
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, margin: '16px 0 24px' }}>
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              style={{
                flex: 1, height: 4, borderRadius: 4,
                background: s <= step ? 'var(--green)' : 'var(--line)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* ── Step 1: Basic info ── */}
        {step === 1 && (
          <>
            <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Tell us about yourself</h1>
            <p className="sub">We'll calculate your ideal daily calorie target.</p>

            {/* Gender */}
            <p style={{ fontSize: 13, fontWeight: 700, margin: '16px 0 8px' }}>Biological sex</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={gender === g ? 'primary' : 'secondary'}
                  style={{ flex: 1, padding: '10px 4px', fontSize: 13, textTransform: 'capitalize' }}
                >
                  {g === 'male' ? '♂ Male' : g === 'female' ? '♀ Female' : '⚧ Other'}
                </button>
              ))}
            </div>

            <div className="field">
              <label htmlFor="age">Age (years)</label>
              <input id="age" type="number" min={10} max={100} placeholder="e.g. 28"
                value={age} onChange={(e) => setAge(e.target.value)} />
              {errors.age && <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.age}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="height">Height (cm)</label>
                <input id="height" type="number" min={100} max={250} placeholder="e.g. 175"
                  value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
                {errors.height && <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.height}</span>}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="weight">Weight (kg)</label>
                <input id="weight" type="number" min={20} max={300} placeholder="e.g. 70"
                  value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                {errors.weight && <span style={{ fontSize: 12, color: 'var(--red)' }}>{errors.weight}</span>}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Activity level ── */}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Activity level</h1>
            <p className="sub">How active are you on a typical week?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActivity(opt.value)}
                  style={{
                    border: `2px solid ${activity === opt.value ? 'var(--green)' : 'var(--line)'}`,
                    background: activity === opt.value ? 'var(--sage)' : '#fff',
                    borderRadius: 12,
                    padding: '12px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <strong style={{ fontSize: 14, color: activity === opt.value ? 'var(--green-dark)' : 'var(--ink)' }}>
                    {opt.label}
                  </strong>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Fitness goal ── */}
        {step === 3 && (
          <>
            <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Your goal</h1>
            <p className="sub">What do you want to achieve?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  style={{
                    border: `2px solid ${goal === opt.value ? 'var(--green)' : 'var(--line)'}`,
                    background: goal === opt.value ? 'var(--sage)' : '#fff',
                    borderRadius: 14,
                    padding: '14px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                  <strong style={{ fontSize: 13, color: goal === opt.value ? 'var(--green-dark)' : 'var(--ink)' }}>
                    {opt.label}
                  </strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 4: Recommendation ── */}
        {step === 4 && recommended && (
          <>
            <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Your daily target</h1>
            <p className="sub">Based on your profile, here's what we recommend:</p>

            <div style={{
              background: 'var(--sage)', borderRadius: 20, padding: '24px',
              textAlign: 'center', margin: '20px 0',
            }}>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2, color: 'var(--green-dark)', lineHeight: 1 }}>
                {recommended.toLocaleString()}
              </div>
              <div style={{ fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>kcal / day</div>
            </div>

            <div style={{ background: '#f9faf8', borderRadius: 14, padding: '14px 16px', fontSize: 13, lineHeight: 1.6 }}>
              <div><span style={{ color: 'var(--muted)' }}>Goal:</span> <strong>{goalLabel}</strong></div>
              <div><span style={{ color: 'var(--muted)' }}>Activity:</span> <strong>{activityLabel}</strong></div>
              <div><span style={{ color: 'var(--muted)' }}>Age / Height / Weight:</span> <strong>{age} yrs · {heightCm} cm · {weightKg} kg</strong></div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 12 }}>
              This uses the Mifflin-St Jeor formula. You can always adjust your goal later from the Goals tab.
            </p>
          </>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {step > 1 && (
            <button className="secondary" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} style={{ flex: 1 }}>
              Back
            </button>
          )}
          {step < 4 && (
            <button className="primary" onClick={next} style={{ flex: 2 }}>
              Continue
            </button>
          )}
          {step === 4 && (
            <button className="primary" onClick={handleFinish} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Setting up…' : 'Start tracking!'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
