import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shaxsiy ma'lumotlar: name and email (clearable) are the account's own to change; the phone only
// through Telegram (phoneClaim.service), so a typed-in number is never stored as it is.
const findUnique = vi.fn()
const update = vi.fn(async ({ data }) => ({ id: 'u1', ...data }))
vi.mock('../../lib/prisma.js', () => ({ prisma: { user: { findUnique, update } } }))

const { updateMe } = await import('./users.service.js')
const { confirmPhoneClaim, phoneClaimStatus, startPhoneClaim } = await import('./phoneClaim.service.js')

const me = { phone: '+998901112233', role: 'PASSENGER', staffKind: null, driver: null, telegramId: null }

beforeEach(() => {
  findUnique.mockReset()
  update.mockClear()
})

describe('updateMe', () => {
  it('refuses a different phone — it must be confirmed in Telegram', async () => {
    findUnique.mockResolvedValueOnce(me)
    await expect(updateMe('u1', { phone: '93 951 16 06' })).rejects.toMatchObject({ statusCode: 400 })
    expect(update).not.toHaveBeenCalled()
  })

  it('accepts the current phone sent back with the other fields', async () => {
    findUnique.mockResolvedValueOnce(me)
    await updateMe('u1', { phone: '+998 90 111 22 33', name: 'Eldor' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Eldor' } }))
  })

  it('clears the email when the box is emptied', async () => {
    await updateMe('u1', { email: '' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { email: null } }))
  })
})

describe('phone claim', () => {
  // startPhoneClaim → assertCanTake: the account, then the number's owner.
  async function start(phone = '93 951 16 06', account = { ...me, phone: null }) {
    findUnique.mockResolvedValueOnce(account).mockResolvedValueOnce(null)
    return startPhoneClaim('u1', phone)
  }
  // confirmPhoneClaim → assertCanTake (account, owner), then telegram link checks (account, tg owner).
  function confirmLookups(account = { ...me, phone: null }) {
    findUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(null)
  }

  it('saves nothing until the number is confirmed', async () => {
    const { token } = await start()
    expect(update).not.toHaveBeenCalled()
    expect(phoneClaimStatus('u1', token)).toEqual({ status: 'pending' })
  })

  it('saves the number, verified, when Telegram shares the same one — and links Telegram', async () => {
    const { token } = await start()
    confirmLookups()
    await expect(confirmPhoneClaim({ token, phone: '998939511606', telegramId: '555' })).resolves.toEqual({
      status: 'ok',
      phone: '+998939511606',
    })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: '+998939511606', verified: true, telegramId: '555', telegramUsername: undefined } }),
    )
    expect(phoneClaimStatus('u1', token)).toEqual({ status: 'done', phone: '+998939511606' })
  })

  it('refuses a Telegram contact with a different number', async () => {
    const { token } = await start()
    await expect(confirmPhoneClaim({ token, phone: '+998901234567', telegramId: '555' })).resolves.toMatchObject({ status: 'mismatch' })
    expect(update).not.toHaveBeenCalled()
  })

  it('is single-use, and invisible to other accounts', async () => {
    const { token } = await start()
    expect(phoneClaimStatus('someone-else', token)).toEqual({ status: 'expired' })
    confirmLookups()
    await confirmPhoneClaim({ token, phone: '+998939511606', telegramId: '555' })
    await expect(confirmPhoneClaim({ token, phone: '+998939511606', telegramId: '555' })).resolves.toEqual({ status: 'expired' })
  })

  it('refuses a number another account has, malformed ones, and drivers’ / staff numbers', async () => {
    findUnique.mockResolvedValueOnce({ ...me, phone: null }).mockResolvedValueOnce({ id: 'someone-else' })
    await expect(startPhoneClaim('u1', '+998939511606')).rejects.toMatchObject({ statusCode: 409 })
    await expect(startPhoneClaim('u1', '+99893951')).rejects.toMatchObject({ statusCode: 400 })
    findUnique.mockResolvedValueOnce({ ...me, role: 'DRIVER' })
    await expect(startPhoneClaim('u1', '+998939511606')).rejects.toMatchObject({ statusCode: 403 })
    findUnique.mockResolvedValueOnce({ ...me, staffKind: 'ADMIN' })
    await expect(startPhoneClaim('u1', '+998939511606')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('reports a number taken while the claim was open', async () => {
    const { token } = await start()
    findUnique.mockResolvedValueOnce({ ...me, phone: null }).mockResolvedValueOnce({ id: 'someone-else' })
    await expect(confirmPhoneClaim({ token, phone: '+998939511606', telegramId: '555' })).resolves.toEqual({ status: 'taken' })
    expect(update).not.toHaveBeenCalled()
  })
})
