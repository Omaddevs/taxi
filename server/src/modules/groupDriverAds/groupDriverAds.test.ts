import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/prisma.js', () => ({ prisma: {} }))

const { dedupeKey, departAtFromNote } = await import('./groupDriverAds.service.js')

// 2026-10-15 10:00 Tashkent = 05:00 UTC
const NOW = new Date('2026-10-15T05:00:00Z')

describe('departAtFromNote', () => {
  it('reads a later time today as today', () => {
    expect(departAtFromNote('13:00', NOW)?.toISOString()).toBe('2026-10-15T08:00:00.000Z')
  })
  it('moves a time long gone to tomorrow', () => {
    expect(departAtFromNote('07:00', NOW)?.toISOString()).toBe('2026-10-16T02:00:00.000Z')
  })
  it('keeps a just-passed time today', () => {
    expect(departAtFromNote('09:30', NOW)?.toISOString()).toBe('2026-10-15T04:30:00.000Z')
  })
  it('honours Ertaga and Bugun', () => {
    expect(departAtFromNote('Ertaga, 13:00', NOW)?.toISOString()).toBe('2026-10-16T08:00:00.000Z')
    expect(departAtFromNote('Bugun, 07:00', NOW)?.toISOString()).toBe('2026-10-15T02:00:00.000Z')
  })
  it('gives nothing without a clock time', () => {
    expect(departAtFromNote('Hozir', NOW)).toBeNull()
    expect(departAtFromNote(undefined, NOW)).toBeNull()
  })
})

describe('dedupeKey', () => {
  const base = { authorTelegramId: '42', phones: ['+998901234567'], text: 'x', from: 'Toshkent', to: 'Samarqand' }
  it('is the phone and route', () => {
    expect(dedupeKey(base)).toBe('ph:+998901234567|toshkent>samarqand')
  })
  it('falls back to the Telegram account, then to the text', () => {
    expect(dedupeKey({ ...base, phones: [] })).toBe('tg:42|toshkent>samarqand')
    const a = dedupeKey({ ...base, phones: [], authorTelegramId: '0', text: 'Toshkent  dan' })
    expect(a).toBe(dedupeKey({ ...base, phones: [], authorTelegramId: '0', text: 'toshkent dan' }))
    expect(a.startsWith('tx:')).toBe(true)
  })
  it('separates the two directions', () => {
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, from: 'Samarqand', to: 'Toshkent' }))
  })
})

describe('ingestGroupAdSchema', async () => {
  const { ingestGroupAdSchema } = await import('./groupDriverAds.schema.js')
  const base = { chatId: '-1001', authorTelegramId: '42', authorName: 'Ali', text: 'Toshkent → Samarqand' }

  it('cuts an over-long, emoji-heavy name to 200 characters instead of refusing the ad', () => {
    // 150 emoji = 150 characters for the bot (Python), 300 UTF-16 units here — this used to 400.
    const name = '🚕'.repeat(150) + 'a'.repeat(100)
    const parsed = ingestGroupAdSchema.parse({ ...base, authorName: name })
    expect(Array.from(parsed.authorName)).toHaveLength(200)
    expect(parsed.authorName.startsWith('🚕')).toBe(true)
    expect(parsed.authorName).not.toMatch(/[\uD800-\uDBFF]$/) // never half an emoji
  })

  it('still refuses an empty name and absurdly long input', () => {
    expect(() => ingestGroupAdSchema.parse({ ...base, authorName: '   ' })).toThrow()
    expect(() => ingestGroupAdSchema.parse({ ...base, text: 'x'.repeat(20000) })).toThrow()
  })
})
