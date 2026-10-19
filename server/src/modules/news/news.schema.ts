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

// Teg: "#" siz, 2–32 belgi. Bo‘sh joylar bitta probelga keltiriladi.
const tagSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^#+/, '').replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(2).max(32))

// Ixtiyoriy matn maydoni: bo‘sh satr — "o‘chirish" (null qilinadi).
const optionalText = (max: number) => z.string().trim().max(max)

const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//.test(v) || /^\/(?!\/)/.test(v), 'Havola https:// yoki / bilan boshlansin')

const imageLinkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//.test(v), 'Rasm manzili noto‘g‘ri')

export const listPublicNewsQuerySchema = z.object({
  category: newsCategorySchema.optional(),
  q: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(40).optional(),
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
  tags: z.array(tagSchema).max(8).optional(),
  authorName: optionalText(60).optional(),
  authorRole: optionalText(60).optional(),
  authorAvatar: imageLinkSchema.optional(),
  coverCaption: optionalText(160).optional(),
  bannerTitle: optionalText(80).optional(),
  bannerText: optionalText(200).optional(),
  bannerLabel: optionalText(30).optional(),
  bannerUrl: linkSchema.optional(),
  bannerImage: imageLinkSchema.optional(),
})

export const updateNewsSchema = createNewsSchema.partial()

export const uploadImageSchema = z.object({
  dataUrl: z.string().max(4_500_000),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(10_000).optional(),
})

export const imageIdParamSchema = z.object({ id: z.string().regex(/^[a-z0-9]{10,40}$/) })
