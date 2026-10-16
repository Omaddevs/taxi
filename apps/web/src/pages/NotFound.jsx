import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, HelpCircle } from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { t } from '../i18n'

// Mavjud bo‘lmagan manzil: avval bo‘sh oq sahifa chiqardi — endi tushunarli xabar va qaytish yo‘li.
// Qidiruv tizimlari bu sahifani indekslamasin (noindex).
export default function NotFound() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = `${t('Sahifa topilmadi')} — TaxiLine`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    window.scrollTo(0, 0)
    return () => {
      document.title = prevTitle
      robots.remove()
    }
  }, [])

  return (
    <div className="min-h-svh bg-white text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-site px-3 pt-6 sm:px-6 sm:pt-10">
        <section className="relative overflow-hidden rounded-[32px] bg-[#1d2229] px-6 py-14 text-center text-white sm:rounded-[40px] sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 -right-40 h-[340px] w-[340px] rounded-full bg-brand sm:-right-28 sm:-top-36 sm:bottom-auto sm:h-[520px] sm:w-[520px]" />
          <p className="relative text-[88px] font-extrabold leading-none tracking-tight text-brand sm:text-[140px]">404</p>
          <h1 className="relative mt-4 text-[28px] font-extrabold tracking-tight sm:text-[40px]">{t('Sahifa topilmadi')}</h1>
          <p className="relative mx-auto mt-3 max-w-[460px] text-[15px] text-white/70 sm:text-[17px]">
            {t('Bu manzil mavjud emas yoki ko‘chirilgan. Bosh sahifaga qayting yoki savollar bo‘limiga qarang.')}
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[15px] font-extrabold text-ink transition hover:bg-white">
              <ArrowLeft className="h-4 w-4" /> {t('Bosh sahifaga')}
            </Link>
            <Link to="/savollar" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 text-[15px] font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20">
              <HelpCircle className="h-4 w-4" /> {t('Savol-javob')}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <ScrollTopButton />
    </div>
  )
}
