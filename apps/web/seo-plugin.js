// Build paytida ommaviy sahifalar uchun alohida HTML yozadi (dist/<sahifa>.html):
//   • <head>: to‘g‘ri title, description, canonical, Open Graph, Twitter va JSON-LD (Schema.org);
//   • <div id="root"> ichida: sahifaning h1, tavsifi va asosiy havolalari — JavaScript
//     bajarmaydigan botlar (Telegram preview, Bing, Yandex) ham mazmunni ko‘radi. React yuklanishi
//     bilan bu blok o‘rnini haqiqiy sahifa egallaydi.
// Qolgan (shaxsiy yoki dinamik) yo‘llar uchun dist/app.html — canonical'siz umumiy shablon;
// nginx uni SPA fallback sifatida beradi (apps/web/nginx.conf).
import fs from 'node:fs'
import path from 'node:path'
import {
  MAIN_LINKS,
  OG_IMAGE,
  SEO_PAGES,
  SITE_NAME,
  absoluteUrl,
  breadcrumbJsonLd,
  faqJsonLd,
  siteJsonLd,
} from './src/seo/pages.js'
import { faqs } from './src/data/mock.js'

const HEAD_RE = /<!--seo-head-->[\s\S]*?<!--\/seo-head-->/
const BODY_RE = /<!--seo-body-->[\s\S]*?<!--\/seo-body-->/

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ld = (id, data) =>
  `<script type="application/ld+json" id="ld-${id}">${JSON.stringify(data).replace(/</g, '\u003c')}</script>`

function headFor(route) {
  const page = SEO_PAGES[route] || SEO_PAGES['/']
  const lines = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="uz_UZ" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
  ]
  // route === null — umumiy fallback: canonical/og:url qo‘yilmaydi (har bir yo‘l o‘zini JS'da belgilaydi).
  if (route) {
    const url = absoluteUrl(route)
    lines.push(
      `<meta name="robots" content="index, follow, max-image-preview:large" />`,
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:url" content="${url}" />`,
    )
    if (route === '/') lines.push(ld('site', siteJsonLd()))
    else lines.push(ld('breadcrumb', breadcrumbJsonLd(route, page.label || page.h1)))
    if (route === '/savollar') lines.push(ld('page', faqJsonLd(faqs)))
  }
  return `<!--seo-head-->\n    ${lines.join('\n    ')}\n    <!--/seo-head-->`
}

function bodyFor(route) {
  if (!route) return '<!--seo-body--><!--/seo-body-->'
  const page = SEO_PAGES[route]
  const links = [...MAIN_LINKS, '/login', '/register']
    .filter((p) => p !== route)
    .map((p) => `<a href="${p}" style="color:#0f1d2a;font-weight:600;text-decoration:none;padding:8px 14px;border-radius:999px;background:#e6fafb">${esc(SEO_PAGES[p].label)}</a>`)
    .join('')
  const faqHtml =
    route === '/savollar'
      ? `<dl style="text-align:left;margin:24px 0 0">${faqs
          .map((f) => `<dt style="font-weight:700;margin-top:14px">${esc(f.q)}</dt><dd style="margin:4px 0 0;color:#5b6470">${esc(f.a)}</dd>`)
          .join('')}</dl>`
      : ''
  return `<!--seo-body--><div style="font-family:Inter,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:72px 20px;text-align:center;color:#0f1d2a">
      <a href="/" aria-label="${SITE_NAME}"><img src="/logo.png" alt="${SITE_NAME}" width="72" height="72" /></a>
      <h1 style="font-size:30px;line-height:1.15;margin:20px 0 12px">${esc(page.h1)}</h1>
      <p style="font-size:16px;line-height:1.55;color:#5b6470;margin:0">${esc(page.description)}</p>${faqHtml}
      <nav style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:28px;font-size:14px">${links}</nav>
    </div><!--/seo-body-->`
}

function render(html, route) {
  if (!HEAD_RE.test(html) || !BODY_RE.test(html)) throw new Error('index.html: seo-head/seo-body markerlari topilmadi')
  return html.replace(HEAD_RE, headFor(route)).replace(BODY_RE, bodyFor(route))
}

export function seoPages() {
  let outDir = 'dist'
  return {
    name: 'taxiline-seo',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    // Dev serverda ham, build'da ham index.html — bosh sahifa ('/') varianti.
    transformIndexHtml(html) {
      return render(html, '/')
    },
    writeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
      for (const route of Object.keys(SEO_PAGES)) {
        if (route === '/') continue
        fs.writeFileSync(path.join(outDir, `${route.slice(1)}.html`), render(template, route))
      }
      fs.writeFileSync(path.join(outDir, 'app.html'), render(template, null))
    },
  }
}
