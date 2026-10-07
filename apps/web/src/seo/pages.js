// Ommaviy (Google indekslaydigan) sahifalar ro‘yxati — yagona manba.
// Brauzerda useSeo() sarlavha/tavsifni shu yerdan oladi, build paytida esa vite.config.js
// har bir sahifa uchun alohida index.html (to‘g‘ri <title>, description, canonical, OG) yozadi.
// Yangi ommaviy sahifa qo‘shsangiz: shu yerga yozing va server/src/modules/seo/seo.routes.ts
// dagi sitemap ro‘yxatini ham yangilang.
// Plain JS (JSX yo‘q) — Node build skripti ham import qiladi.

export const SITE_URL = 'https://taxiline.uz'
export const SITE_NAME = 'TaxiLine'
export const OG_IMAGE = `${SITE_URL}/og-image.png`
export const PHONE = '+998877353636'
export const SOCIAL_LINKS = [
  'https://t.me/taxiline_uzbekistan',
  'https://t.me/taxilines_bot',
  'https://www.instagram.com/taxiline_uz',
]

export const SEO_PAGES = {
  '/': {
    title: 'TaxiLine — shaharlar aro taksi, yuk va pochta | O‘zbekiston',
    description:
      'TaxiLine — O‘zbekiston bo‘ylab shaharlar aro taksi, yuk va pochta xizmati. Tasdiqlangan haydovchilar, qulay narxlar va 24/7 yordam. Haydovchi bo‘ling va daromad toping.',
    h1: 'TaxiLine — shaharlar aro taksi, yuk va pochta',
  },
  '/haydovchi-bolish': {
    title: 'Haydovchi va kuryer bo‘lish — TaxiLine',
    description:
      'TaxiLine’da haydovchi yoki kuryer bo‘ling: onlayn ro‘yxatdan o‘ting, ilovani o‘rnating va bugunoq ishlashni boshlang. Faol haydovchilar oyiga 8 mln so‘mdan ortiq topadi.',
    h1: 'Haydovchi va kuryer bo‘lish',
    label: 'Haydovchi bo‘lish',
  },
  '/aksiyalar': {
    title: 'Aksiyalar va Random mijoz — TaxiLine',
    description:
      'TaxiLine aksiyalari, bonuslar va Random mijoz o‘yini: sovg‘alar, chegirmalar va haydovchilar uchun qo‘shimcha to‘lovlar haqida hammasi.',
    h1: 'Aksiyalar va Random mijoz',
    label: 'Aksiyalar',
  },
  '/biznes': {
    title: 'Biznes tarifi — TaxiLine',
    description:
      'TaxiLine Biznes tarifi: avtomobil ko‘rigi, studiyada professional fotosurat va ulanishda jamoamiz yordami. Biznes mijozlar uchun maxsus tartib.',
    h1: 'Biznes uchun TaxiLine',
    label: 'Biznes uchun',
  },
  '/savollar': {
    title: 'Ko‘p so‘raladigan savollar — TaxiLine',
    description:
      'TaxiLine haqida ko‘p so‘raladigan savollar: safarni bekor qilish, to‘lov usullari, ayollar taksisi, yuk yetkazish muddati va haydovchi bo‘lish talablari.',
    h1: 'Savollar va javoblar',
    label: 'Savol-javob',
  },
  '/news': {
    title: 'Yangiliklar — TaxiLine',
    description:
      'TaxiLine yangiliklari: yangi xizmatlar, ilova yangilanishlari, aksiyalar va haydovchilar uchun muhim e’lonlar — barchasi bir joyda.',
    h1: 'Yangiliklar',
    label: 'Yangiliklar',
  },
  '/login': {
    title: 'Kirish — TaxiLine',
    description: 'TaxiLine hisobingizga telefon raqamingiz orqali kiring va safar, yuk yoki pochta buyurtma qiling.',
    h1: 'TaxiLine hisobiga kirish',
    label: 'Kirish',
  },
  '/register': {
    title: 'Ro‘yxatdan o‘tish — TaxiLine',
    description: 'TaxiLine’da bir daqiqada ro‘yxatdan o‘ting: yo‘lovchi sifatida safar buyurtma qiling yoki haydovchi bo‘lib daromad toping.',
    h1: 'TaxiLine’da ro‘yxatdan o‘tish',
    label: 'Ro‘yxatdan o‘tish',
  },
}

// Sayt bo‘ylab asosiy havolalar (header/footer va build'dagi statik HTML uchun) — sitelinks shulardan tanlanadi.
export const MAIN_LINKS = ['/haydovchi-bolish', '/aksiyalar', '/biznes', '/savollar', '/news']

export function absoluteUrl(path) {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

// Google uchun strukturali ma'lumot (Schema.org). Bosh sahifada Organization + WebSite.
export function siteJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo.png`,
      image: OG_IMAGE,
      sameAs: SOCIAL_LINKS,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: PHONE,
          contactType: 'customer service',
          areaServed: 'UZ',
          availableLanguage: ['uz', 'ru'],
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ['Taxi Line', 'taxiline.uz'],
      url: `${SITE_URL}/`,
      inLanguage: 'uz',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ]
}

export function faqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function breadcrumbJsonLd(path, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: absoluteUrl(path) },
    ],
  }
}
