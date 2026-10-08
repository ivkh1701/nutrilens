import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { AuthScreen } from './components/auth/AuthScreen'
import { OnboardingScreen } from './components/onboarding/OnboardingScreen'
import { TopBar } from './components/shared/TopBar'
import { BottomNav } from './components/shared/BottomNav'
import { Dashboard } from './components/dashboard/Dashboard'
import { FoodLog } from './components/foodlog/FoodLog'
import { Reports } from './components/reports/Reports'
import { Goals } from './components/goals/Goals'
import { useMeals } from './hooks/useMeals'
import { useGoal } from './hooks/useGoal'
import { supabase, supabaseConfigured } from './lib/supabase'
import { todayString } from './lib/utils'
import type { OnboardingData } from './lib/calorieCalc'
import type { NavTab, GeminiFood, MealType } from './lib/types'

function ConfigWarning() {
  return (
    <div style={{ padding: 24 }}>
      <div className="config-warn">
        <span style={{ fontSize: 40 }}>⚙️</span>
        <h2>Setup required</h2>
        <p>
          NutriLens needs a Supabase project to run. Copy{' '}
          <code>.env.example</code> to <code>.env</code> and fill in your
          credentials, then restart the dev server.
        </p>
        <pre>{`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`}</pre>
        <p>See the README for full setup instructions.</p>
      </div>
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<NavTab>('Dashboard')
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  const { meals, saveMeal, deleteMeal, mealsForDate, summariesForDates } = useMeals(user?.id)
  const { goals, currentGoal, goalForDate, setGoal } = useGoal(user?.id)

  // Check if onboarding is complete
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setOnboardingDone(data?.onboarding_complete ?? false)
      })
  }, [user])

  if (loading || (user && onboardingDone === null)) {
    return (
      <div className="loading-screen">
        <div className="spinner" aria-label="Loading…" />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  // Show onboarding for new users
  if (!onboardingDone) {
    return (
      <OnboardingScreen
        onComplete={async (data: OnboardingData, recommendedCalories: number) => {
          // Upsert so it works whether or not the trigger created the row
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: user.id,
            ...data,
            onboarding_complete: true,
          })
          if (profileErr) { toast.show(profileErr.message, 'error'); return }

          // Set the calculated calorie goal
          const goalErr = await setGoal(recommendedCalories, todayString())
          if (goalErr) { toast.show(goalErr, 'error'); return }

          setOnboardingDone(true)
          toast.show(`Goal set to ${recommendedCalories.toLocaleString()} kcal/day. Let's go!`)
        }}
      />
    )
  }

  const todayMeals = mealsForDate(todayString())

  async function handleSaveMeal(
    foods: GeminiFood[],
    mealType: MealType,
    mealTime: string,
    photoPath: string | null,
  ) {
    const { error } = await saveMeal({
      mealType,
      mealDate: todayString(),
      mealTime,
      photoPath,
      foods,
    })
    if (error) toast.show(error, 'error')
  }

  async function handleDeleteMeal(id: string) {
    const err = await deleteMeal(id)
    if (err) toast.show(err, 'error')
    else toast.show('Meal deleted.')
  }

  async function handleSetGoal(calories: number, effectiveFrom: string) {
    const err = await setGoal(calories, effectiveFrom)
    if (err) toast.show(err, 'error')
  }

  return (
    <div className="app">
      <TopBar />

      {tab === 'Dashboard' && (
        <Dashboard
          userId={user.id}
          userEmail={user.email ?? ''}
          todayMeals={todayMeals}
          currentGoal={currentGoal}
          onSaveMeal={handleSaveMeal}
          onDeleteMeal={handleDeleteMeal}
          onSetGoal={handleSetGoal}
          onAddMealClick={() => toast.show('Use the photo upload on the Dashboard to add a meal.')}
        />
      )}

      {tab === 'Food Log' && (
        <FoodLog meals={meals} onDeleteMeal={handleDeleteMeal} />
      )}

      {tab === 'Reports' && (
        <Reports summariesForDates={summariesForDates} goalForDate={goalForDate} />
      )}

      {tab === 'Goals' && (
        <Goals goals={goals} currentGoal={currentGoal} onSetGoal={handleSetGoal} />
      )}

      <BottomNav current={tab} onChange={setTab} />
    </div>
  )
}

export function App() {
  if (!supabaseConfigured) return <ConfigWarning />

  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  )
}
