import { describe, expect, it, vi } from 'vitest'

// Offer search is public — the driver must come as a short card, never the full Driver row.
const findMany = vi.fn(async (_args: unknown) => [])
vi.mock('../../lib/prisma.js', () => ({ prisma: { rideOffer: { findMany } } }))
vi.mock('../../lib/botNotify.js', () => ({ notifyGroupOfferPosted: vi.fn() }))
vi.mock('../../lib/audit.js', () => ({ writeAudit: vi.fn() }))

const { searchOffers } = await import('./offers.service.js')

describe('searchOffers', () => {
  it('never selects the driver’s location, licence or archive notes', async () => {
    await searchOffers({})
    const args = findMany.mock.calls[0][0] as { include: { driver: { select: Record<string, unknown> } } }
    const driver = args.include.driver.select
    for (const field of ['currentLat', 'currentLng', 'locationUpdatedAt', 'licenseNumber', 'archivedReason']) {
      expect(driver).not.toHaveProperty(field)
    }
    expect(driver).toMatchObject({ carModel: true, plate: true, user: expect.anything() })
  })
})
