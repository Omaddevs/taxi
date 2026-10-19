import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Clock, Eye, Link2, Pin, Send } from 'lucide-react'
import { t } from '../../i18n'
import { dayMonth } from '../../lib/utils'

export const NEWS_CATEGORIES = [
  { id: '', label: 'Barchasi' },
  { id: 'NEWS', label: 'Yangiliklar' },
  { id: 'UPDATE', label: 'Ilova yangilanishlari' },
  { id: 'PROMO', label: 'Aksiyalar' },
  { id: 'DRIVERS', label: 'Haydovchilar uchun' },
]

export const CATEGORY_LABEL = {
  NEWS: 'Yangilik',
  UPDATE: 'Yangilanish',
  PROMO: 'Aksiya',
  DRIVERS: 'Haydovchilar uchun',
}

export const EDITORIAL_NAME = 'TaxiLine tahririyati'

export function formatNewsDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return `${dayMonth(d.getDate(), d.getMonth(), { dash: true, lower: true })}${sameYear ? '' : ` ${d.getFullYear()}`}`
}

// 1234 → "1,2K" — kartochkalarda joy tejash uchun.
export function formatViews(n) {
  const v = Number(n) || 0
  if (v < 1000) return String(v)
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`
  return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

export function newsListUrl({ category, tag } = {}) {
  const p = new URLSearchParams()
  if (category) p.set('category', category)
  if (tag) p.set('tag', tag)
  const qs = p.toString()
  return qs ? `/news?${qs}` : '/news'
}

export function CategoryChip({ category, onDark = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${
        onDark ? 'bg-white/15 text-white backdrop-blur' : 'bg-brand-soft text-brand-dark'
      } ${className}`}
    >
      {t(CATEGORY_LABEL[category] ?? 'Yangilik')}
    </span>
  )
}

export function TagChip({ tag, outline = false, className = '' }) {
  const look = outline
    ? 'bg-white px-4 py-1.5 text-[13px] font-bold text-ink ring-black/[0.1] hover:ring-brand hover:text-brand-dark'
    : 'bg-canvas px-3 py-1 text-[12px] font-semibold text-ink/70 ring-black/[0.06] hover:bg-brand-soft hover:text-brand-dark'
  return (
    <Link
      to={newsListUrl({ tag })}
      className={`inline-flex items-center rounded-full ring-1 transition ${look} ${className}`}
    >
      #{tag}
    </Link>
  )
}

export function Meta({ post, className = '', views = false }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink/50 ${className}`}>
      <span>{formatNewsDate(post.publishedAt)}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> {t('{0} daqiqa', post.readingMinutes)}
      </span>
      {views && post.views ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1" title={t('Ko‘rishlar')}>
            <Eye className="h-3.5 w-3.5" /> {formatViews(post.views)}
          </span>
        </>
      ) : null}
    </p>
  )
}

/* Rasm yo‘q bo‘lsa — brend rangidagi fon va taksimiz. */
export function NewsCover({ post, className = '', eager = false, zoom = true }) {
  const hover = zoom ? 'transition-transform duration-500 group-hover:scale-[1.04]' : ''
  if (post.coverUrl) {
    return (
      <img
        src={post.coverUrl}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        className={`h-full w-full object-cover ${hover} ${className}`}
      />
    )
  }
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-brand to-[#00a3ae] ${className}`}>
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full border-[18px] border-white/10" />
      <img
        src="/landing/taxi-car-sm.webp"
        alt=""
        className={`absolute bottom-[8%] left-1/2 w-[70%] -translate-x-1/2 drop-shadow-[0_14px_14px_rgba(15,29,42,0.3)] ${hover}`}
      />
    </div>
  )
}

const CARD =
  'group flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06] transition duration-300 hover:shadow-[0_24px_50px_-20px_rgba(15,29,42,0.25)] focus-visible:outline-2 focus-visible:outline-brand'

export function NewsCard({ post }) {
  return (
    <Link to={`/news/${post.slug}`} className={`${CARD} hover:-translate-y-1`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
        <NewsCover post={post} />
        <CategoryChip category={post.category} onDark className="absolute left-4 top-4" />
        {post.pinned ? (
          <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow" title={t('Muhim')}>
            <Pin className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5 2xl:p-6">
        <h3 className="line-clamp-2 text-[18px] font-extrabold leading-snug tracking-tight text-ink 2xl:text-[21px]">{t(post.title)}</h3>
        <p className="mt-2 line-clamp-2 text-[14px] leading-[1.55] text-ink/60 2xl:text-[15.5px]">{t(post.excerpt)}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <Meta post={post} views className="text-[12.5px]" />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink transition group-hover:bg-brand group-hover:text-ink">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* Bosh blokdagi katta yangilik (yangiliklar sahifasining tepasi). */
export function LeadCard({ post }) {
  return (
    <Link to={`/news/${post.slug}`} className={CARD}>
      <div className="relative aspect-[16/9] overflow-hidden bg-canvas lg:aspect-auto lg:min-h-0 lg:flex-1">
        <NewsCover post={post} eager />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-5 top-5 flex gap-2">
          <CategoryChip category={post.category} onDark />
          {post.pinned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-ink">
              <Pin className="h-3.5 w-3.5" /> {t('Muhim')}
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="line-clamp-3 text-[24px] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[30px] 2xl:text-[36px]">{t(post.title)}</h2>
        <p className="mt-3 line-clamp-2 text-[15px] leading-[1.6] text-ink/60 sm:text-[16.5px]">{t(post.excerpt)}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <Meta post={post} views className="text-[14px]" />
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-bold text-white transition group-hover:bg-black">
            {t('Batafsil o‘qish')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* Bosh blokning o‘ng tomonidagi ikki kichik yangilik. */
export function SideLeadCard({ post }) {
  return (
    <Link to={`/news/${post.slug}`} className={`${CARD} min-h-0 flex-1`}>
      <div className="relative aspect-[16/9] overflow-hidden bg-canvas lg:aspect-auto lg:min-h-[150px] lg:flex-1">
        <NewsCover post={post} />
        <CategoryChip category={post.category} onDark className="absolute left-4 top-4" />
      </div>
      <div className="p-5">
        <h3 className="line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight text-ink 2xl:text-[19px]">{t(post.title)}</h3>
        <Meta post={post} className="mt-2 text-[12.5px]" />
      </div>
    </Link>
  )
}

export function NewsCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06]">
      <div className="aspect-[16/10] animate-pulse bg-canvas" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-11/12 animate-pulse rounded-full bg-canvas" />
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-canvas" />
        <div className="h-3 w-full animate-pulse rounded-full bg-canvas" />
        <div className="h-3 w-28 animate-pulse rounded-full bg-canvas" />
      </div>
    </div>
  )
}

// ── O‘ng ustun (sidebar) ─────────────────────────────────────────────────────────────────

export function SideBox({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`rounded-[28px] bg-white p-5 ring-1 ring-black/[0.06] sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-ink 2xl:text-[20px]">
          {Icon ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/* Raqamli ro‘yxat: "So‘nggi yangiliklar", "Ko‘p o‘qilgan". */
export function RankedList({ posts, showViews = false }) {
  return (
    <ol className="divide-y divide-black/[0.06]">
      {posts.map((p, i) => (
        <li key={p.id}>
          <Link to={`/news/${p.slug}`} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="w-7 shrink-0 whitespace-nowrap text-[18px] font-extrabold tabular-nums leading-none text-brand-dark/70">{String(i + 1).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[14px] font-bold leading-snug text-ink transition group-hover:text-brand-dark">{t(p.title)}</span>
              <span className="mt-1 flex items-center gap-2 text-[12px] text-ink/45">
                <span>{formatNewsDate(p.publishedAt)}</span>
                {showViews && p.views ? (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {formatViews(p.views)}
                  </span>
                ) : null}
              </span>
            </span>
            <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-canvas">
              <NewsCover post={p} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/* "Tanlangan" — sana yorlig‘i, sarlavha va qisqa tavsif. */
export function FeaturedList({ posts }) {
  return (
    <ul className="space-y-4">
      {posts.map((p) => (
        <li key={p.id} className="border-b border-black/[0.06] pb-4 last:border-0 last:pb-0">
          <Link to={`/news/${p.slug}`} className="group block">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11.5px] font-semibold text-ink/55 ring-1 ring-black/[0.05]">
              <CalendarDays className="h-3 w-3" /> {formatNewsDate(p.publishedAt)}
            </span>
            <span className="mt-2 line-clamp-2 block text-[15px] font-extrabold leading-snug text-ink transition group-hover:text-brand-dark">{t(p.title)}</span>
            <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.5] text-ink/55">{t(p.excerpt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function TagCloud({ tags, active }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ name, count }) => {
        const on = active && active.toLowerCase() === name.toLowerCase()
        return (
          <Link
            key={name}
            to={on ? '/news' : newsListUrl({ tag: name })}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
              on ? 'bg-brand text-ink' : 'bg-canvas text-ink/70 ring-1 ring-black/[0.06] hover:bg-brand-soft hover:text-brand-dark'
            }`}
          >
            #{name}
            {count > 1 ? <span className={on ? 'text-ink/60' : 'text-ink/35'}>{count}</span> : null}
          </Link>
        )
      })}
    </div>
  )
}

/* Banner: admin maqolaga o‘z bannerini qo‘yishi mumkin, aks holda — TaxiLine'ga taklif. */
export function PromoBanner({ post }) {
  const custom = Boolean(post?.bannerTitle)
  const title = custom ? post.bannerTitle : t('TaxiLine bilan yo‘lga chiqing')
  const text = custom ? post.bannerText : t('Taksi, shaharlararo safar, pochta va yuk — bitta ilovada.')
  const label = custom ? post.bannerLabel || t('Batafsil') : t('Ro‘yxatdan o‘tish')
  const href = custom ? post.bannerUrl : '/register'
  const image = custom ? post.bannerImage : null
  const external = href && /^https?:\/\//.test(href)

  const inner = (
    <>
      {image ? (
        <>
          <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0f1720]/90 via-[#0f1720]/45 to-[#0f1720]/10" />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full border-[18px] border-white/5" />
          <img
            src="/landing/taxi-car-sm.webp"
            alt=""
            loading="lazy"
            className="pointer-events-none absolute -right-4 top-8 w-[68%] drop-shadow-[0_14px_14px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:-translate-x-1"
          />
        </>
      )}
      <div className="relative mt-auto">
        <p className="text-[21px] font-extrabold leading-tight tracking-tight">{title}</p>
        {text ? <p className="mt-2 text-[14px] leading-[1.5] text-white/75">{text}</p> : null}
        {href ? (
          <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-extrabold text-ink transition group-hover:bg-[#1ad3df]">
            {label} <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </>
  )

  const cls = 'group relative flex min-h-[300px] flex-col overflow-hidden rounded-[28px] bg-[#1d2229] p-6 text-white'
  if (!href) return <div className={cls}>{inner}</div>
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link to={href} className={cls}>
      {inner}
    </Link>
  )
}

export function TelegramCta() {
  return (
    <a
      href="https://t.me/taxiline_uzbekistan"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-4 overflow-hidden rounded-[28px] bg-[#2AABEE] p-5 text-white transition hover:bg-[#229ED9]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Send className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] font-extrabold leading-tight">{t('Telegram kanalimiz')}</span>
        <span className="mt-0.5 block text-[13px] text-white/80">{t('Yangiliklarni birinchi bo‘lib o‘qing')}</span>
      </span>
      <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}

// ── Ulashish ─────────────────────────────────────────────────────────────────────────────

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.4 4.3 18.3 19c-.2 1-.9 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.2 12.9l-4.6-1.4c-1-.3-1-1 .2-1.5L20 3c.9-.3 1.6.2 1.4 1.3Z" />
    </svg>
  )
}

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z" />
    </svg>
  )
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Instagram'da veb orqali havola ulashib bo‘lmaydi: telefonda tizimning ulashish oynasi (Instagram ham
// shu yerda) ochiladi, kompyuterda esa havola nusxalanib, Instagram yangi oynada ochiladi.
export function shareTargets(url, title) {
  const u = encodeURIComponent(url)
  const text = encodeURIComponent(title)
  return [
    { id: 'telegram', label: 'Telegram', icon: TelegramIcon, href: `https://t.me/share/url?url=${u}&text=${text}`, color: 'hover:bg-[#2AABEE]' },
    { id: 'instagram', label: 'Instagram', icon: InstagramIcon, href: 'https://www.instagram.com/', color: 'hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7]', native: true },
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, color: 'hover:bg-[#1877F2]' },
  ]
}

export function useCopyLink() {
  const [copied, setCopied] = useState(false)
  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard ruxsat berilmagan */
    }
  }
  return { copied, copy }
}

/* Tugmalar to‘plami. `tone="dark"` — to‘q fonda (ulashish bloki), `tone="rail"` — maqola yonidagi ustun. */
export function ShareButtons({ url, title, tone = 'light', vertical = false }) {
  const { copied, copy } = useCopyLink()
  const base =
    tone === 'dark'
      ? 'bg-white/10 text-white ring-1 ring-white/10 hover:text-white'
      : 'bg-white text-ink ring-1 ring-black/[0.08] hover:text-white hover:ring-transparent'
  const btn = `flex h-11 w-11 items-center justify-center rounded-full transition ${base}`

  async function shareNative(e, fallback) {
    e.preventDefault()
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    await copy(url)
    window.open(fallback, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`flex gap-2 ${vertical ? 'flex-col' : 'flex-wrap'}`}>
      {shareTargets(url, title).map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          title={s.label}
          className={`${btn} ${s.color}`}
          onClick={s.native ? (e) => shareNative(e, s.href) : undefined}
        >
          <s.icon className="h-[18px] w-[18px]" />
        </a>
      ))}
      <button
        type="button"
        onClick={() => copy(url)}
        aria-label={t('Havolani nusxalash')}
        title={copied ? t('Nusxalandi') : t('Havolani nusxalash')}
        className={`${btn} ${tone === 'dark' ? 'hover:bg-white/20' : 'hover:bg-ink'}`}
      >
        {copied ? <Check className="h-[18px] w-[18px] text-brand" /> : <Link2 className="h-[18px] w-[18px]" />}
      </button>
    </div>
  )
}
