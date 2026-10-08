import { clamp } from '../../lib/utils'

interface Props {
  consumed: number
  goal: number
}

export function CalorieRing({ consumed, goal }: Props) {
  const pct = goal > 0 ? clamp(Math.round((consumed / goal) * 100), 0, 100) : 0
  const isOver = consumed > goal && goal > 0
  const remaining = goal - consumed

  let statusText: string
  let statusClass = ''

  if (consumed === 0) {
    statusText = 'Add a meal to start tracking today.'
  } else if (isOver) {
    statusText = `⚠️ You're ${Math.abs(remaining).toLocaleString()} kcal over your daily goal.`
    statusClass = ' over'
  } else if (consumed >= goal) {
    statusText = '✓ Daily calorie goal achieved!'
    statusClass = ' achieved'
  } else {
    statusText = `✓ On track · ${remaining.toLocaleString()} kcal remaining`
  }

  return (
    <>
      <div className="goal-content">
        <div
          className={`ring${isOver ? ' over' : ''}`}
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          role="img"
          aria-label={`${pct}% of daily calorie goal consumed`}
        >
          <div className="ring-inner">
            <strong>{pct}%</strong>
            <span>of daily goal</span>
          </div>
        </div>

        <div className="calories">
          <strong>
            <b>{consumed.toLocaleString()}</b>{' '}
            <span>/ <b>{goal.toLocaleString()}</b> kcal</span>
          </strong>
          <p>
            {isOver
              ? `${Math.abs(remaining).toLocaleString()} kcal over goal`
              : `${remaining.toLocaleString()} kcal remaining`}
          </p>
        </div>
      </div>

      <div className={`status${statusClass}`} aria-live="polite">
        {statusText}
      </div>
    </>
  )
}
