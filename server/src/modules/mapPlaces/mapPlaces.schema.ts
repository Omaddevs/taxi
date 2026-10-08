import { z } from 'zod'

export const mapPlaceCategorySchema = z.enum(['FUEL', 'SERVICE', 'WASH', 'PARKING', 'EV', 'FOOD', 'HELP', 'SCOOTER', 'OTHER'])

// data: URIs from the admin uploader (≈480px webp) stay well under this; anything bigger is a mistake.
const imageUrlSchema = z
  .string()
  .max(1_500_000, 'Rasm juda katta')
  .refine((v) => v === '' || v.startsWith('data:image/') || /^https?:\/\//.test(v), 'Rasm manzili noto‘g‘ri')

const optionalText = (max: number) => z.string().trim().max(max).optional()

const priceRowSchema = z.object({
  title: z.string().trim().min(1, 'Narx nomini kiriting').max(60),
  price: z.number().int().min(0).max(100_000_000),
})

const placeFields = {
  category: mapPlaceCategorySchema,
  name: z.string().trim().min(1, 'Nomini kiriting').max(120),
  brand: optionalText(60),
  address: optionalText(200),
  phone: optionalText(40),
  hours: optionalText(60),
  description: optionalText(1000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  imageUrl: imageUrlSchema.optional(),
  prices: z.array(priceRowSchema).max(20).optional(),
  active: z.boolean().optional(),
}

export const createMapPlaceSchema = z.object(placeFields)
export const updateMapPlaceSchema = z.object(placeFields).partial()

export const mapPlaceIdParamSchema = z.object({ id: z.string().min(1) })

export const listMapPlacesQuerySchema = z.object({
  category: mapPlaceCategorySchema.optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'hidden']).optional(),
})
