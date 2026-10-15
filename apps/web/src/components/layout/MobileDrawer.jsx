import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Briefcase, CarFront, ChevronRight, Clock3, CreditCard, Gift, Headset, Info, MapPin, Phone, Settings } from 'lucide-react'
import { Group, QuickAction, Row } from '../account/AccountKit'
import { askForPhone } from '../auth/PhoneRequiredDialog'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { ONLINE_PAYMENTS } from '../../lib/features'
import { isDriverUser } from '../../lib/role'
import { useScrollLock } from '../../lib/scrollLock'
import { formatPhoneUz } from '../../lib/utils'
import { t } from '../../i18n'

// The hamburger menu: a full-screen account page — who you are, four quick actions, then the
// account sections. Every row opens its own screen (pages/account/*); the menu closes on any
// navigation, the back arrow or Escape.

const PAYMENT_LABEL = { cash: 'Naqd pul', wallet: 'Hamyon', click: 'Click', payme: 'Payme', uzum: 'Uzum Bank' }

export function MobileDrawer() {
  const { drawerOpen, setDrawerOpen, user, paymentMethod } = useApp()
  const { pathname } = useLocation()
  const close = () => setDrawerOpen(false)

  useScrollLock(drawerOpen)
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname, setDrawerOpen])
  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, setDrawerOpen])

  // Unread chats (support and drivers) show as a badge on "Yordam".
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
    enabled: drawerOpen,
  })
  const unread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0)

  if (!drawerOpen || !user) return null
  const driver = isDriverUser(user)
  const method = PAYMENT_LABEL[ONLINE_PAYMENTS ? paymentMethod : 'cash'] || 'Naqd pul'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Menyu')}
      className="fixed inset-0 z-50 overflow-y-auto bg-white pb-[max(24px,env(safe-area-inset-bottom))] animate-[menu-in_.2s_ease-out] motion-safe-anim"
    >
      <div className="mx-auto max-w-xl">
        <header className="flex h-14 items-center px-2 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            onClick={close}
            aria-label={t('Yopish')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition active:bg-canvas"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.2} />
          </button>
        </header>

        <div className="flex flex-col items-center px-4">
          <Link to="/settings/profile" className="block">
            <img src={user.avatar} alt="" className="h-[120px] w-[120px] rounded-full bg-brand-soft object-cover" />
          </Link>
          <Link to="/settings/profile" className="mt-4 flex max-w-full items-center gap-1.5">
            <span className="truncate text-[26px] font-extrabold tracking-tight text-ink">{user.name || t('Ismingizni kiriting')}</span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-canvas">
              <ChevronRight className="h-4 w-4" strokeWidth={3} />
            </span>
          </Link>
          {user.phone ? (
            <p className="mt-1 text-[16px] text-muted">{formatPhoneUz(user.phone)}</p>
          ) : (
            <button
              type="button"
              onClick={() => askForPhone(t('Buyurtma berish uchun raqam kerak'))}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-canvas px-3.5 py-1.5 text-[14px] font-semibold text-ink"
            >
              <Phone className="h-4 w-4" /> {t('Telefon raqam qo‘shish')}
            </button>
          )}
        </div>

        <nav className="mt-6 flex px-2" aria-label={t('Tezkor bo‘limlar')}>
          <QuickAction icon={Clock3} label="Safarlarim" to="/history" />
          <QuickAction icon={Headset} label="Yordam" to="/help" badge={unread || null} />
          <QuickAction icon={MapPin} label="Manzillar" to="/addresses" />
          <QuickAction icon={Settings} label="Sozlamalar" to="/settings" />
        </nav>

        <div className="mt-7 px-4">
          <Group>
            <Row icon={Gift} title="Keshbek va chegirmalar" subtitle={t('Promo kodni kiriting')} to="/promo" />
            <Row icon={CreditCard} title="To‘lov usullari" subtitle={t(method)} to="/payment-methods" />
          </Group>
          <Group>
            {driver ? (
              <Row icon={CarFront} title="Haydovchi rejimi" subtitle={t('Buyurtmalar va reyslar')} to="/driver" />
            ) : (
              <Row icon={CarFront} title="Haydovchi bo‘lib ishlash" subtitle={t('Ariza qoldiring — o‘zimiz bog‘lanamiz')} to="/become-driver" />
            )}
            <Row icon={Briefcase} title="Biznes akkaunt" subtitle={t('Kompaniya xodimlari uchun safarlar')} to="/biznes" />
          </Group>
          <Group>
            <Row icon={Info} title="Ma’lumot" to="/info" />
          </Group>
        </div>
      </div>
    </div>
  )
}
