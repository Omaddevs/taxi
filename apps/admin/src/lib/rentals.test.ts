import { describe, expect, it } from 'vitest'
import { parseMoney } from './rentals'

describe('parseMoney', () => {
  it('reads plain and space-grouped numbers', () => {
    expect(parseMoney('120000')).toBe(120000)
    expect(parseMoney('120 000')).toBe(120000)
  })

  it('treats empty input as "not set"', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('   ')).toBeNull()
  })

  it('flags garbage and fractions as NaN', () => {
    expect(parseMoney('abc')).toBeNaN()
    expect(parseMoney('12.5')).toBeNaN()
    expect(parseMoney('-5')).toBeNaN()
  })
})
