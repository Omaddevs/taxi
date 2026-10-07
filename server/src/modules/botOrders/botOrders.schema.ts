import { z } from 'zod'

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const text = (max: number) => z.string().trim().max(max).optional()

// A passenger's "mashina qidiryapman" request from the website search form.
export const createPassengerOrderSchema = z.object({
  fromRegion: z.string().trim().min(1, 'Qayerdan ketishni tanlang').max(80),
  fromDistrict: text(120),
  toRegion: z.string().trim().min(1, 'Qayerga borishni tanlang').max(80),
  toDistrict: text(120),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana noto‘g‘ri').optional(),
  time: z.string().trim().regex(/^\d{1,2}:\d{2}$/, 'Vaqt noto‘g‘ri').optional(),
  passengers: z.number().int().min(1).max(8).default(1),
  seat: text(20),
  luggage: text(20),
  gender: text(20),
  // "Ayollar uchun taxi": dispatched to (and claimable by) female drivers only.
  womenOnly: z.boolean().optional(),
  carBrand: text(60),
  pickupText: text(200),
  note: text(300),
})

export const rateBotOrderSchema = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(40)).max(6).optional(),
  comment: z.string().max(500).optional(),
})
