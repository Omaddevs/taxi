import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, Link2, Send } from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { CategoryChip, Meta, NewsCard, NewsCover } from '../components/news/newsUi'
import DOMPurify from 'dompurify'
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

function ShareBar({ title }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard ruxsat berilmagan */
    }
  }

  const btn = 'inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-bold transition'
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[14px] font-semibold text-ink/50">{t('Ulashish:')}</span>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} bg-[#2AABEE] text-white hover:bg-[#229ED9]`}
      >
        <Send className="h-4 w-4" /> Telegram
      </a>
      <button type="button" onClick={copy} className={`${btn} bg-white text-ink ring-1 ring-black/10 hover:bg-canvas`}>
        {copied ? <Check className="h-4 w-4 text-brand-dark" /> : <Link2 className="h-4 w-4" />}
        {copied ? t('Nusxalandi') : t('Havolani nusxalash')}
      </button>
    </div>
  )
}

export default function NewsDetail() {
  const { slug } = useParams()
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['news-post', slug],
    queryFn: () => api.get(`/news/${slug}`),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [post])

  const notFound = isError && error?.status === 404
  const url = absoluteUrl(`/news/${slug}`)
  // Muqova data: URI bo‘lishi mumkin (admin yuklagan) — ijtimoiy tarmoqlar uni ko‘rmaydi, umumiy rasm qo‘yamiz.
  const image = /^https?:\/\//.test(post?.coverUrl || '') ? post.coverUrl : OG_IMAGE
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
      author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
      publisher: { '@id': `${SITE_URL}/#organization`, '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    },
  )

  return (
    <div className="min-h-svh bg-[#f6f7f9] text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-[1600px] px-3 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-[820px] 2xl:max-w-[960px]">
          <Link to="/news" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink ring-1 ring-black/[0.06] transition hover:bg-canvas">
            <ArrowLeft className="h-4 w-4" /> {t('Barcha yangiliklar')}
          </Link>
        </div>

        {isLoading ? (
          <div className="mx-auto mt-8 max-w-[820px] space-y-4 2xl:max-w-[960px]">
            <div className="h-6 w-32 animate-pulse rounded-full bg-white" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-white" />
            <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white" />
            <div className="mt-6 aspect-[16/9] animate-pulse rounded-[32px] bg-white" />
          </div>
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
            <article>
              <header className="mx-auto mt-8 max-w-[820px] 2xl:max-w-[960px]">
                <div className="flex flex-wrap items-center gap-3">
                  <CategoryChip category={post.category} />
                  <Meta post={post} className="text-[14px]" />
                </div>
                <h1 className="mt-4 text-[32px] font-extrabold leading-[1.12] tracking-tight sm:text-[46px] 2xl:text-[56px]">{t(post.title)}</h1>
                <p className="mt-4 text-[18px] leading-[1.6] text-ink/65 sm:text-[20px] 2xl:text-[23px]">{t(post.excerpt)}</p>
              </header>

              <div className="relative mx-auto mt-8 aspect-[16/9] max-w-[1040px] overflow-hidden rounded-[28px] bg-canvas sm:mt-10 sm:rounded-[40px] 2xl:max-w-[1200px]">
                <NewsCover post={post} eager />
              </div>

              <div className="mx-auto mt-10 max-w-[720px] sm:mt-12 2xl:max-w-[820px]">
                <ArticleBody body={post.body} />
                <div className="mt-12 border-t border-black/[0.08] pt-6">
                  <ShareBar title={t(post.title)} />
                </div>
              </div>
            </article>

            {/* Chaqiriq bloki */}
            <section className="relative mx-auto mt-14 max-w-[1040px] overflow-hidden rounded-[32px] bg-[#1d2229] px-7 py-10 text-white sm:rounded-[40px] sm:px-12 sm:py-12 2xl:max-w-[1200px]">
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-brand" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[24px] font-extrabold tracking-tight sm:text-[30px]">{t('TaxiLine bilan yo‘lga chiqing')}</p>
                  <p className="mt-2 text-[15px] text-white/65 sm:text-[17px]">{t('Taksi, shaharlararo safar, pochta va yuk — bitta ilovada.')}</p>
                </div>
                <Link
                  to="/register"
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-brand px-7 text-[14px] font-extrabold uppercase tracking-[0.03em] text-ink transition hover:bg-[#1ad3df]"
                >
                  {t('Ro‘yxatdan o‘tish')}
                </Link>
              </div>
            </section>

            {post.related?.length ? (
              <section className="mt-14">
                <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px] 2xl:text-[38px]">{t('Boshqa yangiliklar')}</h2>
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
