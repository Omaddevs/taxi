import type { NewsCategory, NewsPost, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { isHtmlBody, plainText, sanitizeNewsHtml } from './news.html.js'

const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
}

// "Yangi tarif: Biznes!" → "yangi-tarif-biznes" (Cyrillic transliterated, o‘/g‘ apostrophes dropped).
export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .split('')
      .map((ch) => LATIN[ch] ?? ch)
      .join('')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['‘’ʻʼ`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'yangilik'
  )
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = base
  for (let i = 2; ; i++) {
    const hit = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } })
    if (!hit || hit.id === exceptId) return slug
    slug = `${base}-${i}`
  }
}

function readingMinutes(body: string) {
  return Math.max(1, Math.round(plainText(body).split(/\s+/).filter(Boolean).length / 180))
}

// HTML (yangi muharrir) tozalanadi; eski oddiy matnli yangiliklar o‘zgarishsiz qoladi.
function cleanBody(body: string) {
  if (!isHtmlBody(body)) return body
  const html = sanitizeNewsHtml(body)
  if (plainText(html).trim().length < 20 && !/<img/.test(html)) throw new ValidationError('Matn juda qisqa')
  return html
}

// ── Rasmlar ────────────────────────────────────────────────────────────────────────────────

const IMAGE_MIME = ['image/webp', 'image/jpeg', 'image/png']
const IMAGE_MAX_BYTES = 3 * 1024 * 1024

export async function uploadImage(input: { dataUrl: string; width?: number; height?: number }) {
  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(input.dataUrl)
  if (!m || !IMAGE_MIME.includes(m[1])) throw new ValidationError('Faqat WebP, JPEG yoki PNG rasm yuklang')
  const data = Buffer.from(m[2], 'base64')
  if (!data.length || data.length > IMAGE_MAX_BYTES) throw new ValidationError('Rasm hajmi 3 MB dan oshmasin')
  const img = await prisma.newsImage.create({
    data: { mime: m[1], data, size: data.length, width: input.width ?? null, height: input.height ?? null },
    select: { id: true, width: true, height: true, size: true },
  })
  return img
}

export async function getImage(id: string) {
  const img = await prisma.newsImage.findUnique({ where: { id }, select: { mime: true, data: true } })
  if (!img) throw new NotFoundError('Rasm topilmadi')
  return img
}

function serializeCard(p: NewsPost) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverUrl: p.coverUrl,
    category: p.category,
    pinned: p.pinned,
    publishedAt: p.publishedAt,
    readingMinutes: readingMinutes(p.body),
  }
}

const PUBLIC_WHERE: Prisma.NewsPostWhereInput = { published: true }
const PUBLIC_ORDER: Prisma.NewsPostOrderByWithRelationInput[] = [{ pinned: 'desc' }, { publishedAt: 'desc' }]

// ── Public ─────────────────────────────────────────────────────────────────────────────────

export async function listPublic(params: { category?: NewsCategory; page: number; pageSize: number }) {
  const where = { ...PUBLIC_WHERE, ...(params.category ? { category: params.category } : {}) }
  const [total, rows] = await Promise.all([
    prisma.newsPost.count({ where }),
    prisma.newsPost.findMany({
      where,
      orderBy: PUBLIC_ORDER,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])
  return { items: rows.map(serializeCard), total, page: params.page, pageSize: params.pageSize }
}

export async function getPublic(slug: string) {
  const post = await prisma.newsPost.findFirst({ where: { ...PUBLIC_WHERE, slug } })
  if (!post) throw new NotFoundError('Yangilik topilmadi')
  const related = await prisma.newsPost.findMany({
    where: { ...PUBLIC_WHERE, id: { not: post.id } },
    orderBy: [{ publishedAt: 'desc' }],
    take: 3,
  })
  return { ...serializeCard(post), body: post.body, updatedAt: post.updatedAt, related: related.map(serializeCard) }
}

// ── Admin ──────────────────────────────────────────────────────────────────────────────────

export async function listAdmin() {
  const rows = await prisma.newsPost.findMany({ orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }] })
  return rows.map((p) => ({ ...serializeCard(p), body: p.body, published: p.published, updatedAt: p.updatedAt }))
}

export async function getAdmin(id: string) {
  const p = await prisma.newsPost.findUnique({ where: { id } })
  if (!p) throw new NotFoundError('Yangilik topilmadi')
  return { ...serializeCard(p), body: p.body, published: p.published, updatedAt: p.updatedAt, createdAt: p.createdAt }
}

type NewsInput = {
  title?: string
  slug?: string
  excerpt?: string
  body?: string
  coverUrl?: string
  category?: NewsCategory
  published?: boolean
  pinned?: boolean
}

export async function create(input: NewsInput & { title: string; excerpt: string; body: string }, actorId: string) {
  const slug = await uniqueSlug(input.slug || slugify(input.title))
  const post = await prisma.newsPost.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      body: cleanBody(input.body),
      coverUrl: input.coverUrl || null,
      category: input.category ?? 'NEWS',
      published: input.published ?? false,
      pinned: input.pinned ?? false,
      publishedAt: input.published ? new Date() : null,
    },
  })
  await writeAudit({ actorId, action: 'news.create', targetType: 'NewsPost', targetId: post.id, meta: { title: post.title } })
  return post
}

export async function update(id: string, input: NewsInput, actorId: string) {
  const current = await prisma.newsPost.findUnique({ where: { id } })
  if (!current) throw new NotFoundError('Yangilik topilmadi')
  let slug: string | undefined
  if (input.slug && input.slug !== current.slug) {
    const taken = await prisma.newsPost.findUnique({ where: { slug: input.slug }, select: { id: true } })
    if (taken && taken.id !== id) throw new ConflictError('Bu havola boshqa yangilikda ishlatilgan')
    slug = input.slug
  }
  const post = await prisma.newsPost.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      body: input.body === undefined ? undefined : cleanBody(input.body),
      coverUrl: input.coverUrl === undefined ? undefined : input.coverUrl || null,
      category: input.category,
      pinned: input.pinned,
      published: input.published,
      // First publish stamps the date; re-publishing keeps the original date.
      publishedAt: input.published && !current.publishedAt ? new Date() : undefined,
    },
  })
  await writeAudit({ actorId, action: 'news.update', targetType: 'NewsPost', targetId: id })
  return post
}

export async function remove(id: string, actorId: string) {
  const post = await prisma.newsPost.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!post) throw new NotFoundError('Yangilik topilmadi')
  await prisma.newsPost.delete({ where: { id } })
  await writeAudit({ actorId, action: 'news.delete', targetType: 'NewsPost', targetId: id, meta: { title: post.title } })
}
