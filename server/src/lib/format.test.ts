import { describe, expect, it } from 'vitest'
import { formatSom } from './format.js'

describe('formatSom', () => {
  it('appends the currency', () => {
    expect(formatSom(0)).toBe('0 so‘m')
  })

  it('formats negative amounts as positive', () => {
    expect(formatSom(-5000)).toBe(formatSom(5000))
  })
})
