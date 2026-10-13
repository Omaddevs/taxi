import { Clapperboard, Headset, Newspaper, UserPlus, UsersRound } from 'lucide-react'

// The public menu's drop-down groups. `to` is a page of the site, `href` an outside link (opens
// in a new tab). The phone menu lists the same items flat.
export const SITE_MENUS = {
  company: {
    label: 'Kompaniya',
    items: [
      { to: '/jamoa', label: 'Bizning jamoa', hint: 'Kimlar bilan ishlaymiz', icon: UsersRound },
      { to: '/haydovchi-bolish', label: 'Haydovchi bo‘lish', hint: 'Bugunoq daromad qiling', icon: UserPlus },
      { to: '/aloqa', label: 'Aloqa', hint: 'Telefon, Telegram, Instagram', icon: Headset },
    ],
  },
  resources: {
    label: 'Resurslar',
    items: [
      { to: '/news', label: 'Yangiliklar', hint: 'Yangi xizmatlar va e’lonlar', icon: Newspaper },
      {
        href: 'https://www.instagram.com/taxiline_uz/reels/',
        label: 'Reels',
        hint: 'Instagramdagi qisqa videolar',
        icon: Clapperboard,
      },
    ],
  },
}
