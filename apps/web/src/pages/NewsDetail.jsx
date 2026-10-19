import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Clock, Eye, Flame, Hash, Home, Newspaper, Share2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import {
  CATEGORY_LABEL,
  CategoryChip,
  EDITORIAL_NAME,
  NewsCard,
  NewsCover,
  PromoBanner,
  RankedList,
  ShareButtons,
  SideBox,
  TagChip,
  TagCloud,
  formatNewsDate,
  formatViews,
  newsListUrl,
  useCopyLink,
} from '../components/news/newsUi'
import { NewsBody } from '../components/news/NewsBody'
import { api } from '../lib/api'
import { OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from '../seo/pages'
import { useJsonLd, useSeo } from '../seo/useSeo'
import { t } from '../i18n'

// Admin muharriridan kelgan HTML (server'da ham tozalangan) — brauzerda yana bir bor tozalanadi.
function ArticleBody({ body }) {
  if (!/^\s*</.test(body)) return <NewsBody text={body} />
  const html = DOMPurify.sanitize(body, { ADD_ATTR: ['target', 'data-size', 'data-align'] })
  return <div className="news-content text-[17px] sm:text-[18px] 2xl:text-[20px]" dangerouslySetInnerHTML={{ __html: html }} />
}

// Har bir maqola bir sessiyada bir marta sanaladi.
function useCountView(slug, ready) {
  useEffect(() => {
    if (!ready || !slug) return
    const key = `news-viewed:${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* sessionStorage yopiq — baribir sanaymiz */
    }
    api.post(`/news/${encodeURIComponent(slug)}/view`).catch(() => {})
  }, [slug, ready])
}

function Breadcrumbs({ post }) {
  const item = 'inline-flex items-center gap-1.5 transition hover:text-ink'
  return (
    <nav aria-label={t('Sahifa yo‘li')} className="no-scrollbar overflow-x-auto">
      <ol className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-ink/50">
        <li>
          <Link to="/" className={item}>
            <Home className="h-3.5 w-3.5" /> {t('Bosh sahifa')}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5 text-ink/30" />
        </li>
        <li>
          <Link to="/news" className={item}>
            {t('Yangiliklar')}
          </Link>
        </li>
        {post ? (
          <>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-ink/30" />
            </li>
            <li>
              <Link to={newsListUrl({ category: post.category })} className={`${item} text-ink/70`}>
                {t(CATEGORY_LABEL[post.category] ?? 'Yangilik')}
              </Link>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  )
}

function AuthorAvatar({ name, src }) {
  if (src) return <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white" />
  const custom = name && name !== EDITORIAL_NAME
  if (!custom) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft ring-2 ring-white">
        <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
      </span>
    )
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-ink ring-2 ring-white">{initials}</span>
  )
}

function MetaPill({ icon: Icon, children, title }) {
  return (
    <span title={title} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-canvas px-3.5 text-[13px] font-semibold text-ink/65 ring-1 ring-black/[0.05]">
      <Icon className="h-4 w-4 text-ink/45" /> {children}
    </span>
  )
}

function ShareMenuButton({ url, title }) {
  const { copied, copy } = useCopyLink()
  async function onClick() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    copy(url)
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-bold text-white transition hover:bg-black"
    >
      <Share2 className="h-4 w-4" /> {copied ? t('Nusxalandi') : t('Ulashish')}
    </button>
  )
}

function PrevNext({ prev, next }) {
  if (!prev && !next) return null
  const card = 'group flex min-w-0 items-center gap-4 rounded-[24px] bg-canvas p-4 ring-1 ring-black/[0.05] transition hover:bg-brand-soft/60'
  return (
    <nav aria-label={t('Boshqa maqolalar')} className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link to={`/news/${prev.slug}`} className={card}>
          <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">
            <NewsCover post={prev} />
          </span>
          <span className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.06em] text-ink/45">
              <ArrowLeft className="h-3.5 w-3.5" /> {t('Oldingi maqola')}
            </span>
            <span className="mt-1 line-clamp-2 block text-[14.5px] font-extrabold leading-snug text-ink">{t(prev.title)}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next ? (
        <Link to={`/news/${next.slug}`} className={`${card} sm:flex-row-reverse sm:text-right`}>
          <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-white">
            <NewsCover post={next} />
          </span>
          <span className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.06em] text-ink/45">
              {t('Keyingi maqola')} <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 line-clamp-2 block text-[14.5px] font-extrabold leading-snug text-ink">{t(next.title)}</span>
          </span>
        </Link>
      ) : null}
    </nav>
  )
}

function DetailSkeleton() {
  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-8">
      <div className="space-y-4 rounded-[32px] bg-white p-6 ring-1 ring-black/[0.06] sm:p-10">
        <div className="h-6 w-40 animate-pulse rounded-full bg-canvas" />
        <div className="h-11 w-full animate-pulse rounded-2xl bg-canvas" />
        <div className="h-11 w-2/3 animate-pulse rounded-2xl bg-canvas" />
        <div className="h-5 w-5/6 animate-pulse rounded-full bg-canvas" />
        <div className="mt-6 aspect-[16/9] animate-pulse rounded-[24px] bg-canvas" />
      </div>
      <div className="hidden h-80 animate-pulse rounded-[28px] bg-white lg:block" />
    </div>
  )
}

export default function NewsDetail() {
  const { slug } = useParams()
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['news-post', slug],
    queryFn: () => api.get(`/news/${slug}`),
  })
  const sidebar = useQuery({ queryKey: ['news-sidebar'], queryFn: () => api.get('/news/sidebar'), staleTime: 60_000 })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [post])
  useCountView(slug, Boolean(post))

  const notFound = isError && error?.status === 404
  const url = absoluteUrl(`/news/${slug}`)
  // Muqova data: URI bo‘lishi mumkin (admin yuklagan) — ijtimoiy tarmoqlar uni ko‘rmaydi, umumiy rasm qo‘yamiz.
  const image = /^https?:\/\//.test(post?.coverUrl || '') ? post.coverUrl : OG_IMAGE
  const author = post?.authorName || EDITORIAL_NAME
  useSeo('/news', {
    title: post ? t('{0} — TaxiLine', post.title) : undefined,
    description: post?.excerpt || undefined,
    url,
    image,
    type: post ? 'article' : 'website',
    noindex: notFound,
  })
  useJsonLd(
    'article',
    post && {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description: post.excerpt,
      image: [image],
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      mainEntityOfPage: url,
      ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
      author: post.authorName
        ? { '@type': 'Person', name: post.authorName, ...(post.authorRole ? { jobTitle: post.authorRole } : {}) }
        : { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
      publisher: { '@id': `${SITE_URL}/#organization`, '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    },
  )
  useJsonLd(
    'breadcrumbs',
    post && {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'TaxiLine', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: t('Yangiliklar'), item: `${SITE_URL}/news` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  )

  const latest = (sidebar.data?.latest ?? []).filter((p) => p.slug !== slug).slice(0, 4)
  const popular = (sidebar.data?.popular ?? []).filter((p) => p.slug !== slug).slice(0, 4)
  const title = post ? t(post.title) : ''

  return (
    <div className="min-h-svh bg-[#f6f7f9] text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-site px-3 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Breadcrumbs post={post} />

        {isLoading ? (
          <DetailSkeleton />
        ) : notFound || isError ? (
          <div className="mx-auto mt-8 flex max-w-[820px] flex-col items-center rounded-[32px] bg-white px-6 py-16 text-center ring-1 ring-black/[0.06]">
            <p className="text-[56px] font-extrabold leading-none text-brand">{notFound ? '404' : '!'}</p>
            <p className="mt-4 text-[22px] font-extrabold">{notFound ? t('Yangilik topilmadi') : t('Yangilikni yuklab bo‘lmadi')}</p>
            <p className="mt-2 text-[15px] text-ink/60">
              {notFound ? t('U o‘chirilgan yoki havola noto‘g‘ri bo‘lishi mumkin.') : t('Internet aloqasini tekshirib, qayta urinib ko‘ring.')}
            </p>
            <Link to="/news" className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 text-[14px] font-bold text-white transition hover:bg-black">
              {t('Barcha yangiliklar')}
            </Link>
          </div>
        ) : post ? (
          <>
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-8">
              <article className="min-w-0 rounded-[32px] bg-white px-5 py-7 ring-1 ring-black/[0.06] sm:rounded-[40px] sm:px-10 sm:py-10 2xl:px-14 2xl:py-12">
                {/* Sarlavha */}
                <header>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={newsListUrl({ category: post.category })}>
                      <CategoryChip category={post.category} className="uppercase tracking-[0.04em]" />
                    </Link>
                    {post.tags?.slice(0, 2).map((tag) => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                  <h1 className="mt-4 text-[30px] font-extrabold leading-[1.12] tracking-tight sm:text-[42px] 2xl:text-[52px]">{title}</h1>
                  <p className="mt-4 text-[17px] leading-[1.6] text-ink/60 sm:text-[19px] 2xl:text-[21px]">{t(post.excerpt)}</p>

                  <div className="mt-6 flex flex-col gap-4 border-y border-black/[0.06] py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <AuthorAvatar name={author} src={post.authorAvatar} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-extrabold text-ink">{t(author)}</p>
                        <p className="truncate text-[13px] text-ink/50">{post.authorRole ? t(post.authorRole) : t('Rasmiy e’lon')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MetaPill icon={CalendarDays} title={t('Chop etilgan sana')}>
                        <time dateTime={post.publishedAt}>{formatNewsDate(post.publishedAt)}</time>
                      </MetaPill>
                      <MetaPill icon={Clock} title={t('O‘qish vaqti')}>
                        {t('{0} daqiqa', post.readingMinutes)}
                      </MetaPill>
                      <MetaPill icon={Eye} title={t('Ko‘rishlar')}>
                        {formatViews(Math.max(1, post.views ?? 0))}
                      </MetaPill>
                      <ShareMenuButton url={url} title={title} />
                    </div>
                  </div>
                </header>

                {/* Muqova */}
                <figure className="mt-7">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-[24px] bg-canvas sm:rounded-[28px]">
                    <NewsCover post={post} eager zoom={false} />
                  </div>
                  {post.coverCaption ? (
                    <figcaption className="mt-2.5 flex items-center gap-1.5 px-1 text-[13px] text-ink/45">
                      <span className="h-1 w-4 rounded-full bg-brand" aria-hidden="true" />
                      {t(post.coverCaption)}
                    </figcaption>
                  ) : null}
                </figure>

                {/* Matn + yon ulashish ustuni */}
                <div className="mt-9 grid gap-8 md:grid-cols-[44px_minmax(0,1fr)] md:gap-8 2xl:mt-11">
                  <div className="hidden md:block">
                    <div className="sticky top-28">
                      <ShareButtons url={url} title={title} vertical />
                    </div>
                  </div>
                  <div className="min-w-0 max-w-[760px] 2xl:max-w-[820px]">
                    <div className="news-dropcap">
                      <ArticleBody body={post.body} />
                    </div>

                    {post.tags?.length ? (
                      <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-6">
                        <span className="mr-1 inline-flex items-center gap-1 text-[14px] font-bold text-ink/55">
                          <Hash className="h-4 w-4" /> {t('Teglar:')}
                        </span>
                        {post.tags.map((tag) => (
                          <TagChip key={tag} tag={tag} className="text-[13px]" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Ulashish bloki */}
                <section className="relative mt-10 overflow-hidden rounded-[28px] bg-[#1d2229] px-6 py-7 text-white sm:px-9 sm:py-8">
                  <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 hidden h-36 w-36 rounded-full bg-brand/90 sm:block" />
                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-[30%] h-32 w-32 rounded-full border-[16px] border-white/5" />
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="sm:pl-14">
                      <p className="text-[21px] font-extrabold tracking-tight sm:text-[24px]">{t('Maqola foydali bo‘ldimi?')}</p>
                      <p className="mt-1 text-[14px] text-white/65 sm:text-[15px]">{t('Do‘stlaringiz bilan ulashing — ular ham xabardor bo‘lsin.')}</p>
                    </div>
                    <ShareButtons url={url} title={title} tone="dark" />
                  </div>
                </section>

                <div className="mt-8">
                  <PrevNext prev={post.prev} next={post.next} />
                </div>
              </article>

              {/* O‘ng ustun */}
              <aside className="flex flex-col gap-5">
                {latest.length ? (
                  <SideBox
                    title={t('So‘nggi yangiliklar')}
                    icon={Newspaper}
                    action={
                      <Link to="/news" className="text-[13px] font-semibold text-brand-dark hover:underline">
                        {t('Barchasi')}
                      </Link>
                    }
                  >
                    <RankedList posts={latest} />
                  </SideBox>
                ) : null}
                {popular.length ? (
                  <SideBox title={t('Ko‘p o‘qilgan')} icon={Flame}>
                    <RankedList posts={popular} showViews />
                  </SideBox>
                ) : null}
                {sidebar.data?.tags?.length ? (
                  <SideBox title={t('Teglar')} icon={Hash}>
                    <TagCloud tags={sidebar.data.tags} />
                  </SideBox>
                ) : null}
                <div className="lg:sticky lg:top-24">
                  <PromoBanner post={post} />
                </div>
              </aside>
            </div>

            {post.related?.length ? (
              <section className="mt-14">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px] 2xl:text-[38px]">{t('O‘xshash yangiliklar')}</h2>
                  <Link
                    to="/news"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-bold text-ink ring-1 ring-black/10 transition hover:bg-ink hover:text-white"
                  >
                    {t('Barcha yangiliklar')} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-7">
                  {post.related.map((r) => (
                    <NewsCard key={r.id} post={r} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      <SiteFooter />
      <ScrollTopButton />
    </div>
  )
}
