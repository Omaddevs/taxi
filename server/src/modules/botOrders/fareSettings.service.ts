import type { z } from 'zod'
import { writeAudit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { DEFAULT_FARE_RATES, FARE_RATE_LIMITS, estimateFare, type FareRates } from './fare.js'
import type { previewFareSchema, updateFareSettingsSchema } from './fareSettings.schema.js'

const SETTINGS_ID = 'default'

/** The rates in force: the admin's saved row, or the built-in defaults until one is saved. */
export async function getFareRates(): Promise<FareRates> {
  const row = await prisma.fareSettings.findUnique({ where: { id: SETTINGS_ID } })
  if (!row) return DEFAULT_FARE_RATES
  return {
    perKm: row.perKm,
    minPerSeat: row.minPerSeat,
    spreadPercent: row.spreadPercent,
    wholeCarDiscountPercent: row.wholeCarDiscountPercent,
  }
}

export async function getFareSettings() {
  const row = await prisma.fareSettings.findUnique({ where: { id: SETTINGS_ID }, select: { updatedAt: true } })
  return { rates: await getFareRates(), defaults: DEFAULT_FARE_RATES, limits: FARE_RATE_LIMITS, updatedAt: row?.updatedAt ?? null }
}

export async function updateFareSettings(input: z.infer<typeof updateFareSettingsSchema>, actorId: string) {
  const before = await getFareRates()
  await prisma.fareSettings.upsert({
    where: { id: SETTINGS_ID },
    update: input,
    create: { id: SETTINGS_ID, ...DEFAULT_FARE_RATES, ...input },
  })
  await writeAudit({
    actorId,
    action: 'fare.settings.update',
    targetType: 'FareSettings',
    targetId: SETTINGS_ID,
    meta: { before, after: { ...before, ...input } },
  })
  return getFareSettings()
}

/** What a trip of `km` would be suggested at with `rates` — lets an admin try values before saving. */
export function previewFare({ km, rates }: z.infer<typeof previewFareSchema>) {
  return {
    oneSeat: estimateFare({ km, passengers: 1 }, rates),
    wholeCar: estimateFare({ km, passengers: 1, wholeCar: true }, rates),
  }
}
