import { useState, useMemo } from 'react'
import type { ReportPeriod, DaySummary } from '../../lib/types'
import { lastNDays, aggregateWeekly, aggregateMonthly, clamp, todayString, toDateString } from '../../lib/utils'

interface Props {
  summariesForDates: (dates: string[]) => DaySummary[]
  goalForDate: (date: string) => number
}

interface BarData {
  label: string
  calories: number
  isToday: boolean
  goal: number
}

export function Reports({ summariesForDates, goalForDate }: Props) {
  const [period, setPeriod] = useState<ReportPeriod>('Weekly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(todayString())

  const { bars, totals } = useMemo(() => {
    let rawBars: BarData[] = []
    const today = todayString()

    if (period === 'Daily') {
      const dates = lastNDays(7)
      const summaries = summariesForDates(dates)
      rawBars = dates.map((d, i) => {
        const s = summaries[i]
        // Use T00:00:00 suffix so the date is parsed in local time, not UTC
        const dayLabel = new Date(d + 'T00:00:00')
          .toLocaleDateString(undefined, { weekday: 'short' })
        return {
          label: d === today ? 'Today' : dayLabel,
          calories: s.calories,
          isToday: d === today,
          goal: goalForDate(d),
        }
      })
    } else if (period === 'Weekly') {
      const allDates = lastNDays(56) // 8 weeks
      const summaries = summariesForDates(allDates)
      const weekBuckets = aggregateWeekly(summaries.map((s, i) => ({ ...s, date: allDates[i] })))
      rawBars = weekBuckets.map((w) => ({
        label: w.label,
        calories: w.calories,
        isToday: false,
        goal: goalForDate(today) * 7,
      }))
    } else if (period === 'Monthly') {
      const allDates = lastNDays(180) // 6 months
      const summaries = summariesForDates(allDates)
      const monthBuckets = aggregateMonthly(summaries.map((s, i) => ({ ...s, date: allDates[i] })))
      rawBars = monthBuckets.map((m) => ({
        label: m.label,
        calories: m.calories,
        isToday: false,
        goal: goalForDate(today) * 30,
      }))
    } else if (period === 'Custom' && customFrom && customTo) {
      const dates: string[] = []
      let cur = new Date(customFrom + 'T00:00:00')
      const end = new Date(customTo + 'T00:00:00')
      while (cur <= end && dates.length < 90) {
        dates.push(toDateString(cur))
        cur.setDate(cur.getDate() + 1)
      }
      const summaries = summariesForDates(dates)
      if (dates.length <= 14) {
        rawBars = dates.map((d, i) => ({
          label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' as const }),
          calories: summaries[i].calories,
          isToday: d === today,
          goal: goalForDate(d),
        }))
      } else {
        // aggregate by week
        const weekly = aggregateWeekly(summaries.map((s, i) => ({ ...s, date: dates[i] })), Math.ceil(dates.length / 7))
        rawBars = weekly.map((w) => ({ label: w.label, calories: w.calories, isToday: false, goal: goalForDate(today) * 7 }))
      }
    }

    const maxCalories = Math.max(...rawBars.map((b) => b.calories), 1)
    const barsWithHeight = rawBars.map((b) => ({
      ...b,
      heightPct: clamp(Math.round((b.calories / maxCalories) * 100), b.calories > 0 ? 3 : 0, 100),
    }))

    const allSummaryDates = period === 'Custom' && customFrom && customTo
      ? (() => {
          const ds: string[] = []
          let c = new Date(customFrom + 'T00:00:00')
          const e = new Date(customTo + 'T00:00:00')
          while (c <= e && ds.length < 366) { ds.push(toDateString(c)); c.setDate(c.getDate() + 1) }
          return ds
        })()
      : lastNDays(period === 'Daily' ? 7 : period === 'Weekly' ? 56 : 180)

    const periodSummaries = summariesForDates(allSummaryDates)
    const totalCals = periodSummaries.reduce((s, d) => s + d.calories, 0)
    const totalCarbs = periodSummaries.reduce((s, d) => s + d.carbs, 0)
    const totalProtein = periodSummaries.reduce((s, d) => s + d.protein, 0)
    const totalFat = periodSummaries.reduce((s, d) => s + d.fat, 0)
    const avgCals = periodSummaries.filter((d) => d.calories > 0).length > 0
      ? Math.round(totalCals / periodSummaries.filter((d) => d.calories > 0).length)
      : 0

    return {
      bars: barsWithHeight,
      totals: { calories: totalCals, carbs: totalCarbs, protein: totalProtein, fat: totalFat, avg: avgCals },
    }
  }, [period, customFrom, customTo, summariesForDates, goalForDate])

  const maxGoal = Math.max(...bars.map((b) => b.goal), 1)
  const maxCal = Math.max(...bars.map((b) => b.calories), 1)
  const goalLineBottom = clamp(Math.round((bars[0]?.goal / Math.max(maxGoal, maxCal)) * 100), 0, 100)

  return (
    <main className="main">
      <div className="hello">
        <div>
          <h1>Reports</h1>
          <p>Your intake overview</p>
        </div>
      </div>

      <section className="card report-card">
        <div className="periods" role="tablist" aria-label="Report period">
          {(['Daily', 'Weekly', 'Monthly', 'Custom'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              className={`period${period === p ? ' active' : ''}`}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {period === 'Custom' && (
          <div className="custom-dates">
            <input
              type="date"
              value={customFrom}
              max={customTo || todayString()}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="Start date"
            />
            <input
              type="date"
              value={customTo}
              max={todayString()}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="End date"
            />
          </div>
        )}

        {bars.length === 0 ? (
          <div className="empty">No data for this period.</div>
        ) : (
          <div
            className="chart"
            aria-label={`${period} calorie chart`}
            role="img"
          >
            {bars[0]?.goal > 0 && (
              <div
                className="goal-line"
                style={{ bottom: `${goalLineBottom + 23}px` }}
                aria-label="Goal line"
              />
            )}
            {bars.map((bar, i) => (
              <div className="bar-item" key={i}>
                <div className="bar-tooltip">{bar.calories.toLocaleString()} kcal</div>
                <i
                  className={`bar${bar.isToday ? ' today' : ''}${bar.calories > bar.goal && bar.goal > 0 ? ' over-goal' : ''}`}
                  style={{ '--h': `${bar.heightPct}%` } as React.CSSProperties}
                  aria-label={`${bar.label}: ${bar.calories.toLocaleString()} kcal`}
                />
                <span className="bar-label">{bar.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="macro-row">
          <span><i className="macro-dot" aria-hidden="true" />Carbs</span>
          <strong>{totals.carbs} g</strong>
          <span><i className="macro-dot protein" aria-hidden="true" />Protein</span>
          <strong>{totals.protein} g</strong>
          <span><i className="macro-dot fat" aria-hidden="true" />Fat</span>
          <strong>{totals.fat} g</strong>
        </div>

        <div className="report-stats">
          <div className="stat-box">
            <div className="stat-label">Total calories</div>
            <div className="stat-value">{totals.calories.toLocaleString()}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Daily average</div>
            <div className="stat-value">{totals.avg.toLocaleString()}</div>
          </div>
        </div>
      </section>
    </main>
  )
}
