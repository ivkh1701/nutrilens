import type { MealType, DaySummary } from './types'

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/** Returns YYYY-MM-DD in local time */
export function toDateString(date: Date): string {
  return date.toLocaleDateString('en-CA')
}

export function todayString(): string {
  return toDateString(new Date())
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

export function formatDayLabel(dateStr: string, refDate?: string): string {
  const today = refDate || todayString()
  if (dateStr === today) return 'Today'
  const yesterday = toDateString(new Date(Date.now() - 86400000))
  if (dateStr === yesterday) return 'Yesterday'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(
    new Date(y, m - 1, d),
  )
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getEmojiForMealType(type: MealType | string): string {
  const map: Record<string, string> = {
    Breakfast: '🌅',
    Lunch: '☀️',
    Dinner: '🌙',
    Snack: '🍎',
    Other: '🍽️',
  }
  return map[type] ?? '🍽️'
}

/** Returns an array of YYYY-MM-DD strings for the last `days` days including today */
export function lastNDays(n: number, from?: Date): string[] {
  const base = from ? new Date(from) : new Date()
  const dates: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    dates.push(toDateString(d))
  }
  return dates
}

/** Aggregate DaySummary list into (n-1)-week buckets */
export function aggregateWeekly(summaries: DaySummary[], weeks = 8): { label: string; calories: number }[] {
  const buckets: { label: string; calories: number }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date()
    end.setDate(end.getDate() - w * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    const label = `W${weeks - w}`
    const calories = summaries
      .filter((s) => s.date >= toDateString(start) && s.date <= toDateString(end))
      .reduce((acc, s) => acc + s.calories, 0)
    buckets.push({ label, calories })
  }
  return buckets
}

/** Aggregate DaySummary list into month buckets */
export function aggregateMonthly(summaries: DaySummary[], months = 6): { label: string; calories: number }[] {
  const buckets: { label: string; calories: number }[] = []
  const now = new Date()
  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const label = d.toLocaleDateString(undefined, { month: 'short' })
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const calories = summaries
      .filter((s) => s.date.startsWith(monthStr))
      .reduce((acc, s) => acc + s.calories, 0)
    buckets.push({ label, calories })
  }
  return buckets
}

export function goalForDate(
  goals: { calories: number; effective_from: string; effective_to: string | null }[],
  date: string,
): number {
  const match = goals.find((g) => g.effective_from <= date && (g.effective_to === null || g.effective_to >= date))
  return match?.calories ?? 2000
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'])
const MAX_BYTES = 10 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return 'Unsupported file type. Use JPEG, PNG, WebP, or HEIC.'
  if (file.size > MAX_BYTES) return `File too large (${humanFileSize(file.size)}). Max is 10 MB.`
  return null
}
