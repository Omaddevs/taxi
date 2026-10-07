import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { Regions } from '../components/landing/Regions'
import { faqs } from '../data/mock'
import { SEO_PAGES, breadcrumbJsonLd, faqJsonLd } from '../seo/pages'
import { useJsonLd, useSeo } from '../seo/useSeo'
import { Business, Earn, Faq, Join, Promotions, RandomClient } from './Landing'

// Landing bo‘limlaridan yasalgan alohida ommaviy sahifalar. Har biri o‘z URL, sarlavha va
// tavsifiga ega — Google ularni sitelinks (qidiruvdagi pastki havolalar) sifatida ko‘rsata oladi.
function PublicPage({ path, children, extraJsonLd }) {
  const page = SEO_PAGES[path]
  useSeo(path)
  useJsonLd('breadcrumb', breadcrumbJsonLd(path, page.label || page.h1))
  useJsonLd('page', extraJsonLd)

  const { hash } = useLocation()

  // `/aksiyalar#random` kabi havolada — bo‘limga, aks holda sahifa boshiga.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return undefined
    }
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150)
    return () => clearTimeout(t)
  }, [path, hash])

  return (
    <div className="min-h-svh bg-white text-ink">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-[1600px] px-3 pt-6 sm:px-6 sm:pt-10">
          <div className="relative overflow-hidden rounded-[32px] bg-[#1d2229] px-6 pb-10 pt-8 text-white sm:rounded-[40px] sm:px-12 sm:pb-14 sm:pt-10 lg:px-14 2xl:px-20 2xl:pb-16">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 -right-40 h-[340px] w-[340px] rounded-full bg-brand sm:bottom-auto sm:-right-28 sm:-top-36 sm:h-[520px] sm:w-[520px]" />
            <nav aria-label="Breadcrumb" className="relative">
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-white/60 2xl:text-[15px]">
                <li>
                  <Link to="/" className="transition hover:text-white">
                    Bosh sahifa
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li aria-current="page" className="text-brand">
                  {page.label || page.h1}
                </li>
              </ol>
            </nav>
            <div className="relative mt-8 max-w-[720px] sm:mt-10">
              <h1 className="text-[36px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px] 2xl:text-[68px]">{page.h1}</h1>
              <p className="mt-4 text-[16px] leading-[1.55] text-white/70 sm:text-[18px] 2xl:text-[21px]">{page.description}</p>
            </div>
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
      <ScrollTopButton />
    </div>
  )
}

export function DriverPage() {
  return (
    <PublicPage path="/haydovchi-bolish">
      <Join />
      <Earn />
      <Regions />
    </PublicPage>
  )
}

export function PromosPage() {
  return (
    <PublicPage path="/aksiyalar">
      <div className="pt-10 sm:pt-16">
        <Promotions />
      </div>
      <RandomClient />
    </PublicPage>
  )
}

export function BusinessPage() {
  return (
    <PublicPage path="/biznes">
      <div className="pt-10 sm:pt-16">
        <Business />
      </div>
    </PublicPage>
  )
}

export function FaqPage() {
  return (
    <PublicPage path="/savollar" extraJsonLd={faqJsonLd(faqs)}>
      <div className="pt-10 sm:pt-16">
        <Faq />
      </div>
    </PublicPage>
  )
}
