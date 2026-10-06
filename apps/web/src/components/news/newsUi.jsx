import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, Pin } from 'lucide-react'

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

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']

export function formatNewsDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return `${d.getDate()}-${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`
}

export function CategoryChip({ category, onDark = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${
        onDark ? 'bg-white/15 text-white backdrop-blur' : 'bg-brand-soft text-brand-dark'
      } ${className}`}
    >
      {CATEGORY_LABEL[category] ?? 'Yangilik'}
    </span>
  )
}

export function Meta({ post, className = '' }) {
  return (
    <p className={`flex items-center gap-2 text-[13px] text-ink/50 ${className}`}>
      <span>{formatNewsDate(post.publishedAt)}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} daqiqa
      </span>
    </p>
  )
}

/* Rasm yo‘q bo‘lsa — brend rangidagi fon va taksimiz. */
export function NewsCover({ post, className = '', eager = false }) {
  if (post.coverUrl) {
    return (
      <img
        src={post.coverUrl}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${className}`}
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
        className="absolute bottom-[8%] left-1/2 w-[70%] -translate-x-1/2 drop-shadow-[0_14px_14px_rgba(15,29,42,0.3)] transition-transform duration-500 group-hover:scale-[1.04]"
      />
    </div>
  )
}

export function NewsCard({ post }) {
  return (
    <Link
      to={`/news/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(15,29,42,0.25)] focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
        <NewsCover post={post} />
        <CategoryChip category={post.category} onDark className="absolute left-4 top-4" />
        {post.pinned ? (
          <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow" title="Muhim">
            <Pin className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6 2xl:p-7">
        <Meta post={post} />
        <h3 className="mt-2.5 line-clamp-2 text-[19px] font-extrabold leading-snug tracking-tight text-ink 2xl:text-[22px]">{post.title}</h3>
        <p className="mt-2 line-clamp-3 text-[14.5px] leading-[1.55] text-ink/65 2xl:text-[16px]">{post.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-bold text-ink">
          O‘qish
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export function NewsCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06]">
      <div className="aspect-[16/10] animate-pulse bg-canvas" />
      <div className="space-y-3 p-6">
        <div className="h-3 w-28 animate-pulse rounded-full bg-canvas" />
        <div className="h-5 w-11/12 animate-pulse rounded-full bg-canvas" />
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-canvas" />
        <div className="h-3 w-full animate-pulse rounded-full bg-canvas" />
      </div>
    </div>
  )
}
