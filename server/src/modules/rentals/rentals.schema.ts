import { z } from 'zod'

export const rentalVehicleTypeSchema = z.enum(['SCOOTER', 'E_SCOOTER', 'BICYCLE', 'E_BIKE', 'MOTORCYCLE'])
export const rentalOwnerTypeSchema = z.enum(['COMPANY', 'PERSON'])
export const rentalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

// data: URIs from the uploaders (≈720px webp) stay well under this; anything bigger is a mistake.
const photoSchema = z
  .string()
  .max(900_000, 'Rasm juda katta')
  .refine((v) => v.startsWith('data:image/') || /^https?:\/\//.test(v), 'Rasm manzili noto‘g‘ri')

const optionalText = (max: number) => z.string().trim().max(max).optional()
const optionalMoney = z.number().int().min(0).max(100_000_000).nullable().optional()
const optionalSpec = (max: number) => z.number().int().min(0).max(max).nullable().optional()

const listingFields = {
  ownerType: rentalOwnerTypeSchema,
  companyName: optionalText(120),
  contactName: optionalText(80),
  phone: z
    .string()
    .trim()
    .min(7, 'Telefon raqamini kiriting')
    .max(40)
    .regex(/^[+\d\s()-]+$/, 'Telefon raqami noto‘g‘ri'),
  telegram: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v.replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, ''))
    .refine((v) => v === '' || /^[A-Za-z0-9_]{4,32}$/.test(v), 'Telegram username noto‘g‘ri')
    .optional(),
  vehicleType: rentalVehicleTypeSchema,
  title: z.string().trim().min(3, 'Sarlavhani kiriting').max(100),
  brand: optionalText(60),
  model: optionalText(60),
  description: optionalText(2000),
  photos: z.array(photoSchema).max(6, 'Ko‘pi bilan 6 ta rasm').optional(),
  pricePerHour: optionalMoney,
  pricePerDay: optionalMoney,
  pricePerWeek: optionalMoney,
  deposit: optionalMoney,
  maxSpeed: optionalSpec(400),
  rangeKm: optionalSpec(2000),
  licenseRequired: z.boolean().optional(),
  address: optionalText(200),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
}

const hasPrice = (v: { pricePerHour?: number | null; pricePerDay?: number | null; pricePerWeek?: number | null }) =>
  Boolean(v.pricePerHour || v.pricePerDay || v.pricePerWeek)

const PRICE_MESSAGE = { message: 'Kamida bitta narx kiriting (soat, kun yoki hafta)', path: ['pricePerDay'] }

// Owner-facing (website). Moderation fields are not theirs to set.
export const createRentalSchema = z.object(listingFields).refine(hasPrice, PRICE_MESSAGE)
export const updateRentalSchema = z
  .object({ ...listingFields, active: z.boolean().optional() })
  .partial()

// Panel-facing: everything plus moderation, pinning and visibility.
const panelFields = {
  ...listingFields,
  status: rentalStatusSchema.optional(),
  rejectionReason: optionalText(300),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
}
export const adminCreateRentalSchema = z.object(panelFields).refine(hasPrice, PRICE_MESSAGE)
export const adminUpdateRentalSchema = z.object(panelFields).partial()

export const rentalIdParamSchema = z.object({ id: z.string().min(1) })

export const listRentalsQuerySchema = z.object({
  type: rentalVehicleTypeSchema.optional(),
  q: z.string().trim().max(100).optional(),
})

export const adminListRentalsQuerySchema = z.object({
  status: rentalStatusSchema.optional(),
  type: rentalVehicleTypeSchema.optional(),
  q: z.string().trim().max(100).optional(),
})

export type CreateRentalInput = z.infer<typeof createRentalSchema>
export type UpdateRentalInput = z.infer<typeof updateRentalSchema>
export type AdminCreateRentalInput = z.infer<typeof adminCreateRentalSchema>
export type AdminUpdateRentalInput = z.infer<typeof adminUpdateRentalSchema>
