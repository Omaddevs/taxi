import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { Regions } from '../components/landing/Regions'
import { faqs } from '../data/mock'
import { SEO_PAGES, breadcrumbJsonLd, faqJsonLd } from '../seo/pages'
import { useJsonLd, useSeo } from '../seo/useSeo'
import { Business, Earn, Faq, Join, Promotions, RandomClient } from './Landing'
import { t } from '../i18n'

// Landing bo‘limlaridan yasalgan alohida ommaviy sahifalar. Har biri o‘z URL, sarlavha va
// tavsifiga ega — Google ularni sitelinks (qidiruvdagi pastki havolalar) sifatida ko‘rsata oladi.
function PublicPage({ path, children, extraJsonLd }) {
  const page = SEO_PAGES[path]
  useSeo(path)
  useJsonLd('breadcrumb', breadcrumbJsonLd(path, t(page.label || page.h1)))
  useJsonLd('page', extraJsonLd)

  const { hash } = useLocation()

  // `/aksiyalar#random` kabi havolada — bo‘limga, aks holda sahifa boshiga.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return undefined
    }
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150)
    return () => clearTimeout(timer)
  }, [path, hash])

  return (
    <div className="min-h-svh bg-white text-ink">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-[1600px] px-3 pt-6 sm:px-6 sm:pt-10">
          <div className="relative overflow-hidden rounded-[32px] bg-[#1d2229] px-6 pb-10 pt-8 text-white sm:rounded-[40px] sm:px-12 sm:pb-14 sm:pt-10 lg:px-14 2xl:px-20 2xl:pb-16">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-56 -right-40 h-[340px] w-[340px] rounded-full bg-brand sm:bottom-auto sm:-right-28 sm:-top-36 sm:h-[520px] sm:w-[520px]" />
            <nav aria-label={t('Breadcrumb')} className="relative">
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-white/60 2xl:text-[15px]">
                <li>
                  <Link to="/" className="transition hover:text-white">
                    {t('Bosh sahifa')}
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li aria-current="page" className="text-brand">
                  {t(page.label || page.h1)}
                </li>
              </ol>
            </nav>
            <div className="relative mt-8 max-w-[720px] sm:mt-10">
              <h1 className="text-[36px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px] 2xl:text-[68px]">{t(page.h1)}</h1>
              <p className="mt-4 text-[16px] leading-[1.55] text-white/70 sm:text-[18px] 2xl:text-[21px]">{t(page.description)}</p>
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

// Maxfiylik siyosati va foydalanish shartlari — Google OAuth brendini tasdiqlash uchun ham kerak
// (Google Cloud Console → Branding sahifasida shu ikki havola ko‘rsatiladi).
const LEGAL_UPDATED = '9-oktabr, 2026'

const PRIVACY_SECTIONS = [
  {
    title: 'Biz kimmiz',
    body: [
      'TaxiLine (taxiline.uz) — O‘zbekiston bo‘ylab shaharlar aro taksi, yuk va pochta yetkazish, skuter ijarasi xizmatlarini birlashtiruvchi platforma. Ushbu siyosat sayt, veb-ilova va TaxiLine Telegram botlari (@taxilines_bot, @taxiline_kirish_bot) uchun amal qiladi.',
    ],
  },
  {
    title: 'Qanday ma’lumotlarni yig‘amiz',
    list: [
      'Telefon raqamingiz va ismingiz — hisob ochish, kirish va haydovchi bilan bog‘lanish uchun.',
      'Google orqali kirsangiz: Google hisobingizdagi ism, email manzil va profil rasmi. Google parolingiz bizga hech qachon berilmaydi.',
      'Telegram orqali kirsangiz: Telegram ID, foydalanuvchi nomi va til sozlamasi.',
      'Safar ma’lumotlari: qayerdan-qayerga, sana, buyurtmalar tarixi, to‘lovlar, baholar va izohlar.',
      'Joylashuv — faqat xaritadan foydalanganingizda yoki buyurtma berayotganda, ruxsatingiz bilan.',
      'Haydovchilardan: avtomobil ma’lumotlari, guvohnoma va hujjatlar fotosurati — tekshiruv uchun.',
      'Texnik ma’lumotlar: qurilma turi, brauzer, IP manzil va xatoliklar jurnali — xavfsizlik va xizmat sifati uchun.',
    ],
  },
  {
    title: 'Ma’lumotlardan qanday foydalanamiz',
    list: [
      'Hisobingizni yaratish va sizni tanib olish.',
      'Yo‘lovchi va haydovchini bog‘lash, buyurtmani bajarish, to‘lov va bonuslarni hisoblash.',
      'Buyurtma holati, xavfsizlik va xizmat haqida xabarlar yuborish (Telegram yoki sayt bildirishnomalari orqali).',
      'Firibgarlikning oldini olish, nizolarni hal qilish va qonun talablarini bajarish.',
      'Xizmatni yaxshilash uchun umumlashtirilgan statistika tuzish.',
    ],
    after: 'Shaxsiy ma’lumotlaringizni sotmaymiz va reklama tarmoqlariga bermaymiz.',
  },
  {
    title: 'Google ma’lumotlari',
    body: [
      'Google orqali kirishda biz faqat asosiy profil ma’lumotlarini (ism, email, profil rasmi) va Google hisobingiz identifikatorini olamiz. Ular faqat sizni TaxiLine’ga kiritish va profilingizni to‘ldirish uchun ishlatiladi, uchinchi shaxslarga berilmaydi va reklama uchun ishlatilmaydi. TaxiLine’ning Google foydalanuvchi ma’lumotlaridan foydalanishi Google API Services User Data Policy talablariga, jumladan Limited Use talablariga mos keladi.',
    ],
  },
  {
    title: 'Kimga ma’lumot beriladi',
    list: [
      'Haydovchi va yo‘lovchi bir-birining buyurtma uchun zarur ma’lumotini ko‘radi: ism, telefon raqami, manzil, avtomobil.',
      'Xizmat ko‘rsatuvchi hamkorlar (server hostingi, to‘lov tizimlari, Telegram) — faqat xizmat ishlashi uchun zarur hajmda.',
      'Davlat organlari — faqat O‘zbekiston Respublikasi qonunchiligida belgilangan hollarda.',
    ],
  },
  {
    title: 'Saqlash va himoya',
    body: [
      'Ma’lumotlar himoyalangan serverlarda saqlanadi, ulanishlar HTTPS orqali shifrlanadi, xodimlar faqat ishi uchun zarur ma’lumotga kira oladi. Ma’lumotlar hisobingiz faol bo‘lgan davrda va qonun talab qilgan muddatda saqlanadi.',
    ],
  },
  {
    title: 'Sizning huquqlaringiz',
    list: [
      'Profilingizdagi ma’lumotlarni ko‘rish va o‘zgartirish.',
      'Hisobingizni va shaxsiy ma’lumotlaringizni o‘chirishni so‘rash — qo‘llab-quvvatlash xizmatiga yozing yoki qo‘ng‘iroq qiling.',
      'Google hisobingiz ulanishini istalgan vaqtda uzish: myaccount.google.com → Xavfsizlik → Uchinchi tomon ilovalari.',
    ],
  },
  {
    title: 'Bolalar',
    body: ['TaxiLine 16 yoshdan kichik shaxslar uchun mo‘ljallanmagan va ulardan ataylab ma’lumot yig‘maydi.'],
  },
  {
    title: 'O‘zgartirishlar',
    body: ['Siyosat o‘zgarsa, yangi tahriri shu sahifada e’lon qilinadi va yuqoridagi sana yangilanadi.'],
  },
]

const TERMS_SECTIONS = [
  {
    title: 'Umumiy qoidalar',
    body: [
      'Ushbu shartlar taxiline.uz sayti, veb-ilovasi va TaxiLine Telegram botlaridan foydalanishni tartibga soladi. Xizmatdan foydalanib yoki ro‘yxatdan o‘tib, siz ushbu shartlarga va Maxfiylik siyosatiga rozilik bildirasiz.',
    ],
  },
  {
    title: 'Xizmat',
    body: [
      'TaxiLine yo‘lovchilar, yuk va pochta jo‘natuvchilarni mustaqil haydovchilar bilan bog‘laydigan axborot platformasidir. Tashish xizmatini haydovchi ko‘rsatadi; TaxiLine buyurtmani joylashtirish, haydovchini tekshirish, aloqa va nizolarni hal qilishda yordam beradi.',
    ],
  },
  {
    title: 'Hisob',
    list: [
      'Ro‘yxatdan o‘tishda to‘g‘ri ma’lumot kiriting; hisobingiz orqali qilingan harakatlar uchun o‘zingiz javobgarsiz.',
      'Telegram orqali kelgan kirish kodini hech kimga bermang.',
      'Bir kishi uchun bitta hisob; boshqa shaxs nomidan ro‘yxatdan o‘tish taqiqlanadi.',
    ],
  },
  {
    title: 'Yo‘lovchi va jo‘natuvchi majburiyatlari',
    list: [
      'Manzil, vaqt va yuk haqida aniq ma’lumot berish.',
      'Kelishilgan narxni o‘z vaqtida to‘lash, buyurtmani asossiz bekor qilmaslik.',
      'Qonun bilan taqiqlangan, xavfli yoki e’lon qilinmagan yuklarni jo‘natmaslik.',
    ],
  },
  {
    title: 'Haydovchi majburiyatlari',
    list: [
      'Haqiqiy haydovchilik guvohnomasi, texnik soz va sug‘urtalangan avtomobilga ega bo‘lish.',
      'Yo‘l harakati qoidalariga rioya qilish, yo‘lovchi va yukning xavfsizligini ta’minlash.',
      'Kelishilgan narx va vaqtga amal qilish, yo‘lovchiga hurmat bilan munosabatda bo‘lish.',
    ],
  },
  {
    title: 'To‘lov, bonus va bekor qilish',
    body: [
      'Narx buyurtma paytida ko‘rsatiladi yoki tomonlar o‘rtasida kelishiladi. Bonuslar, promokodlar va aksiyalar o‘z shartlari asosida beriladi va pulga almashtirilmaydi. Takroriy asossiz bekor qilish yoki suiiste’mol holatlarida hisob cheklanishi mumkin.',
    ],
  },
  {
    title: 'Taqiqlangan harakatlar',
    list: [
      'Platformadan firibgarlik, spam yoki boshqalarni haqorat qilish uchun foydalanish.',
      'Tizimga ruxsatsiz kirishga, uning ishini buzishga yoki ma’lumotlarni avtomatik yig‘ishga urinish.',
      'Soxta buyurtma, sharh yoki baholar qoldirish.',
    ],
    after: 'Shartlar buzilganda TaxiLine hisobni ogohlantirishsiz to‘xtatib qo‘yishi mumkin.',
  },
  {
    title: 'Javobgarlik',
    body: [
      'TaxiLine xizmatning uzluksiz ishlashiga harakat qiladi, lekin texnik uzilishlar, uchinchi tomon xizmatlari yoki haydovchi va yo‘lovchining o‘z harakatlari uchun qonunda belgilangan doiradan tashqari javob bermaydi. Nizolar avvalo qo‘llab-quvvatlash xizmati orqali, kelishilmasa — O‘zbekiston Respublikasi qonunchiligiga muvofiq hal qilinadi.',
    ],
  },
  {
    title: 'O‘zgartirishlar',
    body: ['Shartlar yangilanishi mumkin; yangi tahrir shu sahifada e’lon qilingan paytdan kuchga kiradi.'],
  },
]

function LegalPage({ path, sections }) {
  return (
    <PublicPage path={path}>
      <article className="mx-auto max-w-[860px] px-5 pb-16 pt-10 sm:px-6 sm:pt-14">
        <p className="text-[14px] font-semibold text-ink/50">{t('Oxirgi yangilanish:')}{' '}{LEGAL_UPDATED}</p>
        {sections.map((s, i) => (
          <section key={s.title} className="mt-9">
            <h2 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
              {i + 1}. {t(s.title)}
            </h2>
            {s.body?.map((p) => (
              <p key={p} className="mt-3 text-[16px] leading-[1.65] text-ink/75">
                {t(p)}
              </p>
            ))}
            {s.list ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-[1.6] text-ink/75 marker:text-brand">
                {s.list.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            ) : null}
            {s.after ? <p className="mt-3 text-[16px] font-semibold leading-[1.65] text-ink">{t(s.after)}</p> : null}
          </section>
        ))}
        <section className="mt-12 rounded-3xl bg-canvas p-6 sm:p-8">
          <h2 className="text-[20px] font-extrabold">{t('Bog‘lanish')}</h2>
          <p className="mt-2 text-[16px] leading-[1.6] text-ink/75">
            {t('Savol yoki so‘rovlar uchun: telefon')}{' '}
            <a href="tel:+998877353636" className="font-semibold text-ink underline decoration-brand underline-offset-4">
              +998 87 735 36 36
            </a>
            {t(', Telegram')}{' '}
            <a href="https://t.me/taxilines_bot" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline decoration-brand underline-offset-4">
              @taxilines_bot
            </a>
            .
          </p>
        </section>
      </article>
    </PublicPage>
  )
}

export function PrivacyPage() {
  return <LegalPage path="/privacy" sections={PRIVACY_SECTIONS} />
}

export function TermsPage() {
  return <LegalPage path="/terms" sections={TERMS_SECTIONS} />
}
