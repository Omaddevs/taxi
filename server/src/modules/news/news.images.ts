// Yangilik rasmlari bazada saqlanadi (NewsImage). Yangilik o‘chirilsa yoki rasm almashtirilsa,
// yoki admin rasm yuklab yangilikni saqlamay chiqib ketsa, rasm hech qayerda ishlatilmay qoladi —
// bu supurgi shundaylarini o‘chiradi. Ochiq turgan muharrirdagi yangi rasmlar o‘chib ketmasligi
// uchun faqat GRACE_MS dan eskilari ko‘riladi.
import type { NewsPost } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const GRACE_MS = 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000
const IMAGE_REF = /\/news\/images\/([A-Za-z0-9_-]+)/g

type ImageFields = Pick<NewsPost, 'body' | 'coverUrl' | 'authorAvatar' | 'bannerImage'>

/** Rasm id'lari: matndagi <img>, muqova, muallif rasmi va banner — hammasi /news/images/:id havolasi. */
export function referencedImageIds(posts: ImageFields[]) {
  const ids = new Set<string>()
  for (const p of posts) {
    for (const text of [p.body, p.coverUrl, p.authorAvatar, p.bannerImage]) {
      if (!text) continue
      for (const m of text.matchAll(IMAGE_REF)) ids.add(m[1])
    }
  }
  return ids
}

export async function pruneUnusedNewsImages(now = Date.now()) {
  const posts = await prisma.newsPost.findMany({
    select: { body: true, coverUrl: true, authorAvatar: true, bannerImage: true },
  })
  const used = [...referencedImageIds(posts)]
  const { count } = await prisma.newsImage.deleteMany({
    where: { createdAt: { lt: new Date(now - GRACE_MS) }, id: { notIn: used } },
  })
  if (count) console.log(`pruneUnusedNewsImages: ${count} ta ishlatilmagan rasm o‘chirildi`)
  return count
}

export function startNewsImageSweeper(): NodeJS.Timeout {
  const run = () => pruneUnusedNewsImages().catch((err) => console.error('pruneUnusedNewsImages failed:', err))
  run()
  return setInterval(run, SWEEP_INTERVAL_MS)
}
