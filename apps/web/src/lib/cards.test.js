import { describe, expect, it } from 'vitest'
import { cardNetwork, cardNumberValid, expiryValid, formatCardNumber, formatExpiry, luhnValid } from './cards'

describe('cardNetwork', () => {
  it('tells local and international cards apart', () => {
    expect(cardNetwork('8600123412341234')).toBe('uzcard')
    expect(cardNetwork('5614681234567890')).toBe('uzcard')
    expect(cardNetwork('9860123412341234')).toBe('humo')
    expect(cardNetwork('4111111111111111')).toBe('visa')
    expect(cardNetwork('5555555555554444')).toBe('mastercard')
    expect(cardNetwork('2221000000000009')).toBe('mastercard')
    expect(cardNetwork('6011')).toBeNull()
  })
})

describe('luhnValid', () => {
  it('accepts real test numbers and rejects a typo', () => {
    expect(luhnValid('4111111111111111')).toBe(true)
    expect(luhnValid('5555555555554444')).toBe(true)
    expect(luhnValid('4111111111111112')).toBe(false)
    expect(luhnValid('4111')).toBe(false)
  })
})

describe('expiry', () => {
  const now = new Date(2026, 9, 15) // Oct 2026
  it('formats while typing', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('12')).toBe('12')
    expect(formatExpiry('1228')).toBe('12/28')
  })
  it('allows the current month, rejects past months and month 13', () => {
    expect(expiryValid('1026', now)).toBe(true)
    expect(expiryValid('0926', now)).toBe(false)
    expect(expiryValid('1328', now)).toBe(false)
    expect(expiryValid('0130', now)).toBe(true)
  })
})

it('groups the card number by four', () => {
  expect(formatCardNumber('860012341234')).toBe('8600 1234 1234')
})

describe('cardNumberValid', () => {
  it('needs 16 digits and Luhn only for international cards', () => {
    expect(cardNumberValid('4111111111111111')).toBe(true)
    expect(cardNumberValid('4111111111111112')).toBe(false)
    expect(cardNumberValid('8600123412341234')).toBe(true)
    expect(cardNumberValid('9860123412341234')).toBe(true)
    expect(cardNumberValid('986012341234')).toBe(false)
    expect(cardNumberValid('6011000000000004')).toBe(false)
  })
})
