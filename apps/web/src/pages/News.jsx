import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Flame, Hash, Newspaper, RefreshCw, Search, Send, Star, X } from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import {
  FeaturedList,
  LeadCard,
  NEWS_CATEGORIES,
  NewsCard,
  NewsCardSkeleton,
  PromoBanner,
  RankedList,
  SideBox,
  SideLeadCard,
  TagCloud,
  TelegramCta,
} from '../components/news/newsUi'
import { api } from '../lib/api'
import { useSeo } from '../seo/useSeo'
import { t } from '../i18n'

const PAGE_SIZE = 12

function SearchBox({ value, onChange }) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Qidiruv tashqaridan o‘zgarsa (filtrni tozalash, orqaga qaytish) — maydon ham yangilanadi.
  if (value !== synced) {
    setSynced(value)
    if (value !== text.trim()) setText(value)
  }

  // Yozish to‘xtagach 350 ms o‘tib qidiradi — har bir harfga so‘rov yubormaydi.
  useEffect(() => {
    if (text.trim() === value) return undefined
    const id = setTimeout(() => onChangeRef.current(text.trim()), 350)
    return () => clearTimeout(id)
  }, [text, value])

  return (
    <label className="relative flex h-11 w-full items-center sm:w-[300px] 2xl:h-12 2xl:w-[340px]">
      <Search className="pointer-events-none absolute left-4 h-4 w-4 text-white/50" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('Yangiliklardan qidirish…')}
        aria-label={t('Yangiliklardan qidirish…')}
        maxLength={80}
        className="h-full w-full rounded-full bg-[#262c34]/90 pl-11 pr-10 backdrop-blur text-[14px] text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/45 focus:bg-white/[0.12] focus:ring-brand [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => {
            setText('')
            onChange('')
          }}
          aria-label={t('Tozalash')}
          className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </label>
  )
}

function Sidebar({ data, activeTag }) {
  if (!data) {
    return (
      <div className="space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-[28px] bg-white p-6 ring-1 ring-black/[0.06]">
            <div className="h-5 w-32 animate-pulse rounded-full bg-canvas" />
            <div className="h-4 w-full animate-pulse rounded-full bg-canvas" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-canvas" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-canvas" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col gap-5">
      {data.pinned?.length ? (
        <SideBox title={t('Tanlangan')} icon={Star}>
          <FeaturedList posts={data.pinned} />
        </SideBox>
      ) : null}
      {data.popular?.length ? (
        <SideBox title={t('Ko‘p o‘qilgan')} icon={Flame}>
          <RankedList posts={data.popular} showViews />
        </SideBox>
      ) : null}
      {data.tags?.length ? (
        <SideBox title={t('Teglar')} icon={Hash}>
          <TagCloud tags={data.tags} active={activeTag} />
        </SideBox>
      ) : null}
      <div className="space-y-5 lg:sticky lg:top-24">
        <PromoBanner />
        <TelegramCta />
      </div>
    </div>
  )
}

export default function News() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const q = params.get('q') || ''
  const tag = params.get('tag') || ''

  useSeo('/news')

  const query = useInfiniteQuery({
    queryKey: ['news', category, q, tag],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ page: String(pageParam), pageSize: String(PAGE_SIZE) })
      if (category) qs.set('category', category)
      if (q) qs.set('q', q)
      if (tag) qs.set('tag', tag)
      return api.get(`/news?${qs}`)
    },
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  })
  const sidebar = useQuery({ queryKey: ['news-sidebar'], queryFn: () => api.get('/news/sidebar'), staleTime: 60_000 })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0
  const filtered = Boolean(category || q || tag)
  // Bosh blok (katta + ikki kichik) faqat filtrsiz ro‘yxatda va yetarli yangilik bo‘lsa.
  const lead = !filtered && items.length >= 4 ? items[0] : null
  const sideLeads = lead ? items.slice(1, 3) : []
  const rest = lead ? items.slice(3) : items

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function clearFilters() {
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="min-h-svh bg-[#f6f7f9] text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-site px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
        {/* Sarlavha bloki */}
        <section className="relative overflow-hidden rounded-[32px] bg-[#1d2229] px-6 pb-7 pt-12 text-white sm:rounded-[40px] sm:px-12 sm:pb-9 sm:pt-16 lg:px-14 2xl:px-20 2xl:pt-20">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 -right-40 h-[340px] w-[340px] rounded-full bg-brand sm:bottom-auto sm:-right-28 sm:-top-36 sm:h-[480px] sm:w-[480px]" />
          <div aria-hidden="true" className="pointer-events-none absolute right-[18%] top-[30%] hidden h-48 w-48 rounded-full border-[26px] border-white/5 lg:block" />
          <div className="relative max-w-[640px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13px] font-semibold text-brand ring-1 ring-white/10">
              <Newspaper className="h-4 w-4" /> {t('TaxiLine yangiliklari')}
            </span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px] 2xl:text-[72px]">{t('Yangiliklar')}</h1>
            <p className="mt-4 text-[16px] leading-[1.55] text-white/70 sm:text-[18px] 2xl:text-[21px]">
              {t('Yangi xizmatlar, ilova yangilanishlari, aksiyalar va haydovchilar uchun muhim e’lonlar — barchasi bir joyda.')}
            </p>
          </div>

          <div className="relative mt-9 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label={t('Kategoriyalar')} className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
              {NEWS_CATEGORIES.map((c) => {
                const active = c.id === category
                return (
                  <button
                    key={c.id || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setParam('category', c.id)}
                    className={`h-10 shrink-0 rounded-full px-5 text-[14px] font-semibold transition 2xl:h-11 2xl:text-[16px] ${
                      active ? 'bg-brand text-ink' : 'bg-white/[0.08] text-white/80 ring-1 ring-white/10 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {t(c.label)}
                  </button>
                )
              })}
            </div>
            <SearchBox value={q} onChange={(v) => setParam('q', v)} />
          </div>
        </section>

        {/* Faol filtrlar */}
        {q || tag ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-semibold text-ink/55">{t('Natijalar:')}</span>
            {q ? (
              <button
                type="button"
                onClick={() => setParam('q', '')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-semibold ring-1 ring-black/[0.08] transition hover:bg-canvas"
              >
                «{q}» <X className="h-3.5 w-3.5 text-ink/50" />
              </button>
            ) : null}
            {tag ? (
              <button
                type="button"
                onClick={() => setParam('tag', '')}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 font-semibold text-brand-dark transition hover:bg-brand/20"
              >
                #{tag} <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {!query.isLoading ? <span className="text-ink/45">· {t('{0} ta yangilik', total)}</span> : null}
          </div>
        ) : null}

        {query.isLoading ? (
          <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-8">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
            <Sidebar data={null} />
          </div>
        ) : query.isError ? (
          <div className="mt-6 flex flex-col items-center rounded-[32px] bg-white px-6 py-16 text-center ring-1 ring-black/[0.06] sm:mt-8">
            <p className="text-[20px] font-extrabold">{t('Yangiliklarni yuklab bo‘lmadi')}</p>
            <p className="mt-2 text-[15px] text-ink/60">{t('Internet aloqasini tekshirib, qayta urinib ko‘ring.')}</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-bold text-white transition hover:bg-black"
            >
              <RefreshCw className="h-4 w-4" /> {t('Qayta urinish')}
            </button>
          </div>
        ) : !items.length ? (
          <div className="mt-6 flex flex-col items-center rounded-[32px] bg-white px-6 py-16 text-center ring-1 ring-black/[0.06] sm:mt-8 sm:py-20">
            <img src="/empty/messages.webp" alt="" className="w-48 sm:w-56" />
            <p className="mt-4 text-[22px] font-extrabold tracking-tight">{q || tag ? t('Hech narsa topilmadi') : t('Hozircha yangiliklar yo‘q')}</p>
            <p className="mt-2 max-w-[420px] text-[15px] leading-[1.55] text-ink/60">
              {q || tag
                ? t('Boshqa so‘z bilan qidirib ko‘ring yoki filtrni olib tashlang.')
                : category
                  ? t('Bu bo‘limda hali yangilik e’lon qilinmagan. Boshqa bo‘limni tanlab ko‘ring.')
                  : t('Tez orada birinchi yangiliklarimizni shu yerda e’lon qilamiz.')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {filtered ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[14px] font-bold text-white transition hover:bg-black"
                >
                  {t('Barcha yangiliklar')}
                </button>
              ) : null}
              <a
                href="https://t.me/taxilines_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[14px] font-bold text-ink transition hover:bg-[#00b6c2]"
              >
                <Send className="h-4 w-4" /> {t('Telegram botimiz')}
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Bosh blok: chapda katta yangilik, o‘ngda ikkita kichik */}
            {lead ? (
              <section className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] 2xl:gap-7">
                <LeadCard post={lead} />
                <div className="grid gap-5 sm:grid-cols-2 lg:flex lg:flex-col 2xl:gap-7">
                  {sideLeads.map((p) => (
                    <SideLeadCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-8">
              <div className="min-w-0">
                {lead && rest.length ? (
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <h2 className="text-[24px] font-extrabold tracking-tight sm:text-[28px] 2xl:text-[32px]">{t('So‘nggi yangiliklar')}</h2>
                  </div>
                ) : null}
                {rest.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-6">
                    {rest.map((post) => (
                      <NewsCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : null}

                <div className="mt-10 flex flex-col items-center gap-2">
                  {query.hasNextPage ? (
                    <button
                      type="button"
                      onClick={() => query.fetchNextPage()}
                      disabled={query.isFetchingNextPage}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-8 text-[14px] font-bold text-ink transition hover:bg-[#00b6c2] disabled:opacity-60"
                    >
                      {query.isFetchingNextPage ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                      {query.isFetchingNextPage ? t('Yuklanmoqda…') : t('Yana ko‘rsatish')}
                    </button>
                  ) : null}
                  <p className="text-[13px] text-ink/45">
                    {items.length} / {t('{0} ta yangilik', total)}
                  </p>
                </div>
              </div>

              <aside>
                <Sidebar data={sidebar.data} activeTag={tag} />
              </aside>
            </div>
          </>
        )}

      </main>

      <SiteFooter />
      <ScrollTopButton />
    </div>
  )
}
