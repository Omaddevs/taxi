import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowRight, Newspaper, RefreshCw, Send } from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { CategoryChip, Meta, NEWS_CATEGORIES, NewsCard, NewsCardSkeleton, NewsCover } from '../components/news/newsUi'
import { api } from '../lib/api'

const PAGE_SIZE = 9

function FeaturedPost({ post }) {
  return (
    <Link
      to={`/news/${post.slug}`}
      className="group grid overflow-hidden rounded-[32px] bg-white ring-1 ring-black/[0.06] transition duration-300 hover:shadow-[0_30px_60px_-24px_rgba(15,29,42,0.3)] lg:grid-cols-[1.15fr_1fr] sm:rounded-[40px]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas lg:aspect-auto lg:min-h-[400px]">
        <NewsCover post={post} eager />
        <CategoryChip category={post.category} onDark className="absolute left-5 top-5" />
      </div>
      <div className="flex flex-col p-7 sm:p-10 2xl:p-14">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand-dark">Asosiy yangilik</span>
        <h2 className="mt-3 text-[26px] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[34px] 2xl:text-[42px]">{post.title}</h2>
        <p className="mt-4 line-clamp-4 text-[15px] leading-[1.6] text-ink/65 sm:text-[17px] 2xl:text-[19px]">{post.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
          <Meta post={post} className="text-[14px]" />
          <span className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-bold text-white transition group-hover:bg-black">
            Batafsil o‘qish <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function News() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''

  useEffect(() => {
    document.title = 'Yangiliklar — TaxiLine'
  }, [])

  const query = useInfiniteQuery({
    queryKey: ['news', category],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get(`/news?page=${pageParam}&pageSize=${PAGE_SIZE}${category ? `&category=${category}` : ''}`),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0
  // Asosiy (katta) karta faqat "Barchasi"da — kategoriya tanlanganda hammasi bir xil to‘rda.
  const featured = !category ? items[0] : null
  const rest = featured ? items.slice(1) : items

  function pickCategory(id) {
    const next = new URLSearchParams(params)
    if (id) next.set('category', id)
    else next.delete('category')
    setParams(next, { replace: true })
  }

  return (
    <div className="min-h-svh bg-[#f6f7f9] text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
        {/* Sarlavha bloki */}
        <section className="relative overflow-hidden rounded-[32px] bg-[#1d2229] px-6 pb-8 pt-12 text-white sm:rounded-[40px] sm:px-12 sm:pb-10 sm:pt-16 lg:px-14 2xl:px-20 2xl:pt-20">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 -right-40 h-[340px] w-[340px] rounded-full bg-brand sm:bottom-auto sm:-right-28 sm:-top-36 sm:h-[520px] sm:w-[520px]" />
          <div aria-hidden="true" className="pointer-events-none absolute right-[18%] top-[30%] hidden h-48 w-48 rounded-full border-[26px] border-white/5 lg:block" />
          <div className="relative max-w-[640px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13px] font-semibold text-brand ring-1 ring-white/10">
              <Newspaper className="h-4 w-4" /> TaxiLine yangiliklari
            </span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px] 2xl:text-[72px]">Yangiliklar</h1>
            <p className="mt-4 text-[16px] leading-[1.55] text-white/70 sm:text-[18px] 2xl:text-[21px]">
              Yangi xizmatlar, ilova yangilanishlari, aksiyalar va haydovchilar uchun muhim e’lonlar — barchasi bir joyda.
            </p>
          </div>

          <div role="tablist" aria-label="Kategoriyalar" className="no-scrollbar relative -mx-6 mt-9 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
            {NEWS_CATEGORIES.map((c) => {
              const active = c.id === category
              return (
                <button
                  key={c.id || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => pickCategory(c.id)}
                  className={`h-10 shrink-0 rounded-full px-5 text-[14px] font-semibold transition 2xl:h-11 2xl:text-[16px] ${
                    active ? 'bg-brand text-ink' : 'bg-white/[0.08] text-white/80 ring-1 ring-white/10 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </section>

        <div className="mt-6 sm:mt-8">
          {query.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-7">
              {Array.from({ length: 6 }, (_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center rounded-[32px] bg-white px-6 py-16 text-center ring-1 ring-black/[0.06]">
              <p className="text-[20px] font-extrabold">Yangiliklarni yuklab bo‘lmadi</p>
              <p className="mt-2 text-[15px] text-ink/60">Internet aloqasini tekshirib, qayta urinib ko‘ring.</p>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-bold text-white transition hover:bg-black"
              >
                <RefreshCw className="h-4 w-4" /> Qayta urinish
              </button>
            </div>
          ) : !items.length ? (
            <div className="flex flex-col items-center rounded-[32px] bg-white px-6 py-16 text-center ring-1 ring-black/[0.06] sm:py-20">
              <img src="/empty/messages.webp" alt="" className="w-48 sm:w-56" />
              <p className="mt-4 text-[22px] font-extrabold tracking-tight">Hozircha yangiliklar yo‘q</p>
              <p className="mt-2 max-w-[420px] text-[15px] leading-[1.55] text-ink/60">
                {category ? 'Bu bo‘limda hali yangilik e’lon qilinmagan. Boshqa bo‘limni tanlab ko‘ring.' : 'Tez orada birinchi yangiliklarimizni shu yerda e’lon qilamiz.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {category ? (
                  <button
                    type="button"
                    onClick={() => pickCategory('')}
                    className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[14px] font-bold text-white transition hover:bg-black"
                  >
                    Barcha yangiliklar
                  </button>
                ) : null}
                <a
                  href="https://t.me/taxilines_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[14px] font-bold text-ink transition hover:bg-[#00b6c2]"
                >
                  <Send className="h-4 w-4" /> Telegram botimiz
                </a>
              </div>
            </div>
          ) : (
            <>
              {featured ? <FeaturedPost post={featured} /> : null}
              {rest.length ? (
                <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-7 ${featured ? 'mt-6 sm:mt-8' : ''}`}>
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
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[14px] font-bold text-ink ring-1 ring-black/10 transition hover:bg-ink hover:text-white disabled:opacity-60"
                  >
                    {query.isFetchingNextPage ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                    {query.isFetchingNextPage ? 'Yuklanmoqda…' : 'Yana ko‘rsatish'}
                  </button>
                ) : null}
                <p className="text-[13px] text-ink/45">
                  {items.length} / {total} ta yangilik
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
      <ScrollTopButton />
    </div>
  )
}
