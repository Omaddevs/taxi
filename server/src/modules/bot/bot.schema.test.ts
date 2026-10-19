import { describe, expect, it } from 'vitest'
import { kirishCodeSchema, linkUserSchema } from './bot.schema.js'

// Telegram names can be long and emoji-heavy; they must never cost someone their sign-in code.
describe('bot schemas and Telegram names', () => {
  const fancy = '🌸✨'.repeat(40) + ' Dilnoza' // 80 emoji: fine for Python, 160+ UTF-16 units here

  it('kirish code request accepts a long emoji name, cut to 120 characters', () => {
    const parsed = kirishCodeSchema.parse({ telegramId: '42', intent: 'login', name: fancy })
    expect(Array.from(parsed.name ?? '').length).toBeLessThanOrEqual(120)
  })

  it('a blank name is treated as no name', () => {
    expect(linkUserSchema.parse({ phone: '+998901234567', telegramId: '42', name: '   ' }).name).toBeUndefined()
  })
})
