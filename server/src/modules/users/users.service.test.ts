import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shaxsiy ma'lumotlar: name, email (clearable) and the phone — changeable by the account itself.
const findUnique = vi.fn()
const update = vi.fn(async ({ data }) => ({ id: 'u1', ...data }))
vi.mock('../../lib/prisma.js', () => ({ prisma: { user: { findUnique, update } } }))

const { updateMe } = await import('./users.service.js')

const me = { phone: '+998901112233', role: 'PASSENGER', staffKind: null, driver: null }

beforeEach(() => {
  findUnique.mockReset()
  update.mockClear()
})

describe('updateMe', () => {
  it('changes the phone of a passenger (a Google sign-up too), stored unverified', async () => {
    findUnique.mockResolvedValueOnce({ ...me, phone: null }).mockResolvedValueOnce(null)
    await updateMe('u1', { phone: '93 951 16 06' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { phone: '+998939511606', verified: false } }))
  })

  it('leaves the phone alone when it is the same number', async () => {
    findUnique.mockResolvedValueOnce(me)
    await updateMe('u1', { phone: '+998 90 111 22 33', name: 'Eldor' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Eldor' } }))
  })

  it('refuses a number another account has', async () => {
    findUnique.mockResolvedValueOnce(me).mockResolvedValueOnce({ id: 'someone-else' })
    await expect(updateMe('u1', { phone: '+998939511606' })).rejects.toMatchObject({ statusCode: 409 })
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses malformed numbers', async () => {
    await expect(updateMe('u1', { phone: '+99893951' })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('keeps a driver’s and a staff member’s number as it is', async () => {
    findUnique.mockResolvedValueOnce({ ...me, role: 'DRIVER' })
    await expect(updateMe('u1', { phone: '+998939511606' })).rejects.toMatchObject({ statusCode: 403 })
    findUnique.mockResolvedValueOnce({ ...me, staffKind: 'ADMIN' })
    await expect(updateMe('u1', { phone: '+998939511606' })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('clears the email when the box is emptied', async () => {
    await updateMe('u1', { email: '' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { email: null } }))
  })
})
