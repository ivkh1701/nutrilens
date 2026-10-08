import { describe, it, expect } from 'vitest'
import {
  clamp,
  lastNDays,
  toDateString,
  goalForDate,
  aggregateWeekly,
  aggregateMonthly,
  validateImageFile,
  getEmojiForMealType,
} from '../lib/utils'

describe('clamp', () => {
  it('clamps below minimum', () => expect(clamp(-5, 0, 100)).toBe(0))
  it('clamps above maximum', () => expect(clamp(150, 0, 100)).toBe(100))
  it('passes through in-range values', () => expect(clamp(42, 0, 100)).toBe(42))
})

describe('toDateString', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    const d = new Date(2025, 5, 15) // June 15 2025 local
    expect(toDateString(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('lastNDays', () => {
  it('returns exactly n dates', () => {
    expect(lastNDays(7)).toHaveLength(7)
  })
  it('last element is today', () => {
    const dates = lastNDays(7)
    expect(dates[dates.length - 1]).toBe(toDateString(new Date()))
  })
  it('dates are in ascending order', () => {
    const dates = lastNDays(5)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true)
    }
  })
})

describe('goalForDate', () => {
  const goals = [
    { calories: 1800, effective_from: '2024-01-01', effective_to: '2024-03-31' },
    { calories: 2000, effective_from: '2024-04-01', effective_to: null },
  ]

  it('returns the goal active on the given date', () => {
    expect(goalForDate(goals, '2024-02-15')).toBe(1800)
    expect(goalForDate(goals, '2024-05-01')).toBe(2000)
  })

  it('returns 2000 when no goal matches', () => {
    expect(goalForDate(goals, '2023-01-01')).toBe(2000)
  })

  it('handles open-ended (null effective_to) goal', () => {
    expect(goalForDate(goals, '2025-12-01')).toBe(2000)
  })
})

describe('Calorie ring percentage', () => {
  it('caps at 100% when over goal', () => {
    const consumed = 3000
    const goal = 2000
    const pct = clamp(Math.round((consumed / goal) * 100), 0, 100)
    expect(pct).toBe(100)
  })
  it('is 0% when nothing consumed', () => {
    expect(clamp(Math.round((0 / 2000) * 100), 0, 100)).toBe(0)
  })
  it('is 50% at half goal', () => {
    expect(clamp(Math.round((1000 / 2000) * 100), 0, 100)).toBe(50)
  })
})

describe('getEmojiForMealType', () => {
  it('returns correct emoji for each meal type', () => {
    expect(getEmojiForMealType('Breakfast')).toBe('🌅')
    expect(getEmojiForMealType('Lunch')).toBe('☀️')
    expect(getEmojiForMealType('Dinner')).toBe('🌙')
    expect(getEmojiForMealType('Snack')).toBe('🍎')
    expect(getEmojiForMealType('Other')).toBe('🍽️')
  })
  it('falls back for unknown type', () => {
    expect(getEmojiForMealType('Unknown')).toBe('🍽️')
  })
})

describe('aggregateWeekly', () => {
  it('returns the requested number of buckets', () => {
    const summaries = lastNDays(56).map((date) => ({
      date, calories: 2000, carbs: 200, protein: 100, fat: 80, meal_count: 3,
    }))
    expect(aggregateWeekly(summaries, 8)).toHaveLength(8)
  })
})

describe('aggregateMonthly', () => {
  it('returns the requested number of buckets', () => {
    const summaries = lastNDays(180).map((date) => ({
      date, calories: 2000, carbs: 200, protein: 100, fat: 80, meal_count: 3,
    }))
    expect(aggregateMonthly(summaries, 6)).toHaveLength(6)
  })
})

describe('validateImageFile', () => {
  function makeFile(type: string, size: number): File {
    const buf = new Uint8Array(size)
    return new File([buf], 'test.jpg', { type })
  }

  it('accepts valid image types', () => {
    expect(validateImageFile(makeFile('image/jpeg', 1000))).toBeNull()
    expect(validateImageFile(makeFile('image/png', 1000))).toBeNull()
    expect(validateImageFile(makeFile('image/webp', 1000))).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateImageFile(makeFile('application/pdf', 1000))).not.toBeNull()
    expect(validateImageFile(makeFile('video/mp4', 1000))).not.toBeNull()
  })

  it('rejects files over 10 MB', () => {
    expect(validateImageFile(makeFile('image/jpeg', 11 * 1024 * 1024))).not.toBeNull()
  })

  it('accepts files exactly at 10 MB', () => {
    expect(validateImageFile(makeFile('image/jpeg', 10 * 1024 * 1024))).toBeNull()
  })
})
