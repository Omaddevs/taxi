import { z } from 'zod'

// data: URIs from the admin uploader (≈480px webp) stay well under this; anything bigger is a mistake.
const imageUrlSchema = z
  .string()
  .max(1_500_000, 'Rasm juda katta')
  .refine((v) => v === '' || v.startsWith('data:image/') || /^https?:\/\//.test(v), 'Rasm manzili noto‘g‘ri')

export const carFuelTypeSchema = z.enum(['BENZIN', 'ELECTRO_HYBRID'])

export const createCarSchema = z.object({
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  fuelType: carFuelTypeSchema.default('BENZIN'),
  imageUrl: imageUrlSchema.optional(),
})

export const updateCarSchema = createCarSchema.partial()

export const carIdParamSchema = z.object({
  id: z.string().min(1),
})
