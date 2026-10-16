import { beforeEach, describe, expect, it, vi } from 'vitest'

// A passenger asking for a car from the website: the phone is required, Telegram is not.
const findUnique = vi.fn()
const createPassengerBotOrder = vi.fn(async () => ({ order: { id: 1 }, sent: 3 }))
const getPassengerBotOrders = vi.fn(async () => ({ orders: [] }))
const cancelPassengerBotOrder = vi.fn(async () => ({ order: { id: 1 } }))

vi.mock('../../lib/prisma.js', () => ({ prisma: { user: { findUnique } } }))
vi.mock('../../lib/botBridge.js', () => ({ createPassengerBotOrder, getPassengerBotOrders, cancelPassengerBotOrder }))
vi.mock('./fareSettings.service.js', () => ({ getFareRates: vi.fn() }))

const { createPassengerOrder, getMyPassengerOrders, cancelMyPassengerOrder } = await import('./botOrders.service.js')

const input = { fromRegion: 'Samarqand', toRegion: 'Samarqand', passengers: 1 } as Parameters<typeof createPassengerOrder>[1]

beforeEach(() => {
  findUnique.mockReset()
  createPassengerBotOrder.mockClear()
})

describe('createPassengerOrder', () => {
  it('sends a Google account that never linked Telegram, as its website account', async () => {
    findUnique.mockResolvedValue({ telegramId: null, name: 'Ali', phone: '+998901234567', language: 'ru' })
    await expect(createPassengerOrder('u1', input)).resolves.toEqual({ order: { id: 1 }, sent: 3 })
    expect(createPassengerBotOrder).toHaveBeenCalledWith(
      expect.objectContaining({ telegramId: null, coreUserId: 'u1', phone: '+998901234567', name: 'Ali', language: 'ru' }),
    )
  })

  it('still sends a Telegram-linked account with both handles', async () => {
    findUnique.mockResolvedValue({ telegramId: '777', name: 'Vali', phone: '+998901112233', language: 'uz' })
    await createPassengerOrder('u2', input)
    expect(createPassengerBotOrder).toHaveBeenCalledWith(expect.objectContaining({ telegramId: '777', coreUserId: 'u2' }))
  })

  it('asks for the phone first (PHONE_REQUIRED), whatever Telegram says', async () => {
    findUnique.mockResolvedValue({ telegramId: null, name: 'Ali', phone: null, language: null })
    await expect(createPassengerOrder('u1', input)).rejects.toMatchObject({ code: 'PHONE_REQUIRED' })
    expect(createPassengerBotOrder).not.toHaveBeenCalled()
  })
})

describe('the passenger’s own orders', () => {
  it('are found by the website account when Telegram was never linked', async () => {
    findUnique.mockResolvedValue({ telegramId: null })
    await getMyPassengerOrders('u1')
    expect(getPassengerBotOrders).toHaveBeenCalledWith({ telegramId: null, coreUserId: 'u1' })
    await cancelMyPassengerOrder('u1', 5)
    expect(cancelPassengerBotOrder).toHaveBeenCalledWith({ telegramId: null, coreUserId: 'u1' }, 5)
  })
})
