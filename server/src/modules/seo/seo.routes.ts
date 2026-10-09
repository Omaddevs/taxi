import { Router, type Request, type Response } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'

// https://taxiline.uz/sitemap.xml — Caddy shu yo‘lni serverga yuboradi (deploy/Caddyfile).
// Statik ro‘yxat apps/web/src/seo/pages.js dagi ommaviy sahifalar bilan bir xil bo‘lsin.
const STATIC_PAGES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/haydovchi-bolish', changefreq: 'monthly', priority: '0.9' },
  { path: '/aksiyalar', changefreq: 'weekly', priority: '0.8' },
  { path: '/skuter-ijara', changefreq: 'daily', priority: '0.8' },
  { path: '/biznes', changefreq: 'monthly', priority: '0.7' },
  { path: '/savollar', changefreq: 'monthly', priority: '0.7' },
  { path: '/news', changefreq: 'daily', priority: '0.8' },
  { path: '/register', changefreq: 'yearly', priority: '0.5' },
  { path: '/login', changefreq: 'yearly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export const seoRouter = Router()

seoRouter.get(
  '/sitemap.xml',
  asyncRoute(async (_req: Request, res: Response) => {
    const site = env.PUBLIC_SITE_URL.replace(/\/+$/, '')
    const posts = await prisma.newsPost.findMany({
      where: { published: true },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 5000,
    })
    const latest = posts[0]?.updatedAt

    const urls = [
      ...STATIC_PAGES.map((p) => ({
        loc: `${site}${p.path}`,
        lastmod: p.path === '/news' && latest ? latest : undefined,
        changefreq: p.changefreq,
        priority: p.priority,
      })),
      ...posts.map((p) => ({
        loc: `${site}/news/${encodeURIComponent(p.slug)}`,
        lastmod: p.updatedAt ?? p.publishedAt ?? undefined,
        changefreq: 'monthly',
        priority: '0.6',
      })),
    ]

    const body =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls
        .map(
          (u) =>
            `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}` +
            `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
        )
        .join('\n') +
      '\n</urlset>\n'

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(body)
  }),
)
