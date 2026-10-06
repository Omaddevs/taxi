import type { ReactNode } from 'react'

export type NewsCategory = 'NEWS' | 'UPDATE' | 'PROMO' | 'DRIVERS'

export interface NewsPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  coverUrl: string | null
  category: NewsCategory
  pinned: boolean
  published: boolean
  publishedAt: string | null
  updatedAt: string
  readingMinutes: number
}

export const CATEGORY_LABEL: Record<NewsCategory, string> = {
  NEWS: 'Yangilik',
  UPDATE: 'Ilova yangilanishi',
  PROMO: 'Aksiya',
  DRIVERS: 'Haydovchilar uchun',
}

// Admin panel prod'da sayt bilan bir domenda (/admin/), dev'da sayt alohida portda ishlaydi.
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin)

const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
}

// Server'dagi slugify bilan bir xil (news.service.ts) — havolani yozish paytida ko‘rsatish uchun.
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
      .slice(0, 80)
  )
}

export function readingMinutes(body: string) {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 180))
}

// ── Matn belgilash — saytdagi NewsBody bilan bir xil qoidalar ───────────────────────────────

type Block = { type: 'h' | 'p' | 'quote'; text: string } | { type: 'ul'; items: string[] }

export function parseBlocks(text: string): Block[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block): Block => {
      const lines = block.split('\n')
      if (block.startsWith('## ')) return { type: 'h', text: block.slice(3).trim() }
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) return { type: 'ul', items: lines.map((l) => l.replace(/^\s*[-•]\s+/, '')) }
      if (lines.every((l) => l.startsWith('>'))) return { type: 'quote', text: lines.map((l) => l.replace(/^>\s?/, '')).join('\n') }
      return { type: 'p', text: block }
    })
}

function Inline({ text }: { text: string }): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-bold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function BodyPreview({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  if (!blocks.length) return <p className="text-sm text-muted">Matn hali yozilmagan.</p>
  return (
    <div className="space-y-5 text-[16px] leading-[1.75] text-ink/85">
      {blocks.map((b, i) => {
        if (b.type === 'h')
          return (
            <h2 key={i} className="pt-2 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
              <Inline text={b.text} />
            </h2>
          )
        if (b.type === 'ul')
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((it, k) => (
                <li key={k} className="flex gap-3">
                  <span className="mt-[0.7em] h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span>
                    <Inline text={it} />
                  </span>
                </li>
              ))}
            </ul>
          )
        if (b.type === 'quote')
          return (
            <blockquote key={i} className="whitespace-pre-line rounded-r-2xl border-l-4 border-brand bg-brand-soft/60 px-5 py-3 font-medium italic text-ink">
              <Inline text={b.text} />
            </blockquote>
          )
        return (
          <p key={i} className="whitespace-pre-line">
            <Inline text={b.text} />
          </p>
        )
      })}
    </div>
  )
}
