import { z } from 'zod'

const coord = (min: number, max: number) => z.number().min(min).max(max).nullable().optional()

export const savePlaceSchema = z.object({
  kind: z.enum(['HOME', 'WORK', 'OTHER']).default('OTHER'),
  title: z.string().trim().max(60).nullable().optional(),
  address: z.string().trim().min(1).max(300),
  lat: coord(-90, 90),
  lng: coord(-180, 180),
})

export const updatePlaceSchema = savePlaceSchema.omit({ kind: true }).partial()

export const placeIdParamSchema = z.object({ id: z.string().min(1).max(40) })
