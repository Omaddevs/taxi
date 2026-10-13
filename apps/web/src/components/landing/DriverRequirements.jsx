import { ArrowUpRight, Bot, CarFront, Clock, FileText, IdCard, ScrollText } from 'lucide-react'
import { t } from '../../i18n'

const BOT_URL = 'https://t.me/taxilines_bot'

// What an applicant should have at hand. Same list as the FAQ's "Haydovchi bo‘lish uchun nima
// kerak?" answer, plus the car details the application form itself asks for.
const DOCUMENTS = [
  { icon: IdCard, title: 'Pasport yoki ID-karta', text: 'Shaxsingizni tasdiqlash uchun.' },
  { icon: FileText, title: 'Haydovchilik guvohnomasi', text: 'Amal qilish muddati tugamagan bo‘lishi kerak.' },
  { icon: ScrollText, title: 'Avtomobil hujjatlari', text: 'Texnik pasport — mashina sizning nomingizda yoki ishonchnoma bilan.' },
  { icon: CarFront, title: 'Avtomobil ma’lumotlari', text: 'Rusumi va davlat raqami — arizada ko‘rsatiladi.' },
]

/**
 * "Haydovchi bo‘lish" page: which documents an application needs, how fast it is reviewed, and
 * where to ask questions (the Telegram bot).
 */
export function DriverRequirements() {
  return (
    <section id="hujjatlar" className="mx-auto max-w-site scroll-mt-24 px-3 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
      <div className="px-2 sm:px-6 lg:px-14 2xl:px-20">
        <p className="font-hand text-[26px] leading-none text-brand-dark">{t('Ariza uchun')}</p>
        <h2 className="mt-2 text-[34px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[44px] lg:text-[48px] 2xl:text-[64px]">
          {t('Qanday hujjatlar kerak?')}
        </h2>
        <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
          {t('Ariza yuborishdan oldin quyidagilarni tayyorlab qo‘ying — jamoamiz ularni tekshirib, sizni platformaga qo‘shadi.')}
        </p>
      </div>

      <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 xl:grid-cols-4">
        {DOCUMENTS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="relative overflow-hidden rounded-[28px] bg-[#f1f3f6] p-6 sm:p-7">
            <span aria-hidden="true" className="pointer-events-none absolute right-6 top-3 select-none text-[84px] font-extrabold leading-none text-white">
              {i + 1}
            </span>
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_10px_22px_-8px_rgba(0,163,174,0.7)]">
              <Icon className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <h3 className="relative mt-5 text-[20px] font-extrabold leading-tight tracking-tight text-ink sm:text-[22px]">{t(title)}</h3>
            <p className="relative mt-2 text-[15px] leading-[1.55] text-muted">{t(text)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-[28px] bg-[#1d2229] p-6 text-white sm:p-9">
          <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 select-none text-[190px] font-extrabold leading-none tracking-tighter text-white/[0.06] sm:text-[240px]">
            24
          </span>
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-ink">
            <Clock className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <h3 className="relative mt-5 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[30px]">{t('Arizangiz 24 soat ichida ko‘rib chiqiladi')}</h3>
          <p className="relative mt-3 max-w-[520px] text-[15px] leading-[1.6] text-white/70 sm:text-[17px]">
            {t('Jamoamiz arizani tekshiradi va natijasini telefon yoki Telegram orqali ma’lum qiladi. Tasdiqlangach, buyurtmalarni qabul qila boshlaysiz.')}
          </p>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-[28px] bg-brand p-6 text-ink sm:p-9">
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-white/20" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
            <Bot className="h-6 w-6" strokeWidth={2.1} />
          </span>
          <h3 className="relative mt-5 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[30px]">{t('Savolingiz bo‘lsa — chat-botga yozing')}</h3>
          <p className="relative mt-3 max-w-[520px] text-[15px] leading-[1.6] text-ink/75 sm:text-[17px]">
            {t('Hujjatlar, ariza holati yoki ishlash tartibi haqida Telegram botimizdan so‘rang — u orqali arizani ham yuborishingiz mumkin.')}
          </p>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(15,29,42,0.6)] transition hover:bg-black"
          >
            @taxilines_bot <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
