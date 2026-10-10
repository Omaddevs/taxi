import { ChevronRight, CircleHelp, Settings, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'

// Mobil yon menyu — faqat profil va eng kerakli bandlar; qolgan xizmatlar bosh sahifada.
const ITEMS = [
  { to: '/help', icon: CircleHelp, label: 'Yordam xizmati' },
  { to: '/become-driver', icon: UserRoundPlus, label: 'Haydovchi bo‘ling' },
  { to: '/settings', icon: Settings, label: 'Sozlamalar' },
]

export function MobileDrawer() {
  const { drawerOpen, setDrawerOpen, user } = useApp()
  if (!drawerOpen) return null

  const close = () => setDrawerOpen(false)

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label={t('Yopish')} onClick={close} />
      <div className="relative flex h-full w-[86%] max-w-[340px] flex-col overflow-y-auto bg-white pt-[max(56px,calc(env(safe-area-inset-top)+40px))] shadow-2xl">
        <Link to="/profile" onClick={close} className="flex items-center gap-3.5 px-4 pb-5">
          <img src={user.avatar} alt="" className="h-14 w-14 shrink-0 rounded-full bg-canvas object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-ink">{user.name || t('Profil')}</span>
            {user.phone ? <span className="block truncate text-[14px] text-muted">{user.phone}</span> : null}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </Link>

        <nav className="border-t border-line">
          {ITEMS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={close}
              className="group flex items-center gap-4 pl-5 transition active:bg-canvas"
            >
              <Icon className="h-6 w-6 shrink-0 text-ink" strokeWidth={1.9} />
              <span className="flex-1 border-b border-line py-[18px] text-[17px] text-ink group-last:border-b-0">
                {t(label)}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
