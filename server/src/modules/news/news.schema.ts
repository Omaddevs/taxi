import { z } from 'zod'

export const newsCategorySchema = z.enum(['NEWS', 'UPDATE', 'PROMO', 'DRIVERS'])

const coverSchema = z
  .string()
  .trim()
  .max(1_500_000, 'Rasm hajmi juda katta')
  .refine((v) => v === '' || v.startsWith('data:image/') || /^https?:\/\//.test(v), 'Rasm manzili noto‘g‘ri')

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(90)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Havola faqat kichik lotin harflari, raqam va "-" dan iborat bo‘lsin')

export const listPublicNewsQuerySchema = z.object({
  category: newsCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(9),
})

export const slugParamSchema = z.object({ slug: z.string().min(1).max(120) })
export const idParamSchema = z.object({ id: z.string().min(1) })

export const createNewsSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().min(10).max(320),
  body: z.string().trim().min(20).max(300_000),
  coverUrl: coverSchema.optional(),
  category: newsCategorySchema.default('NEWS'),
  published: z.boolean().default(false),
  pinned: z.boolean().default(false),
})

export const updateNewsSchema = createNewsSchema.partial()

export const uploadImageSchema = z.object({
  dataUrl: z.string().max(4_500_000),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(10_000).optional(),
})

export const imageIdParamSchema = z.object({ id: z.string().regex(/^[a-z0-9]{10,40}$/) })
