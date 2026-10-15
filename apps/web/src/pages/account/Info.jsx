import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AccountScreen } from '../../components/account/AccountKit'
import { Logo } from '../../components/ui/Logo'
import { dayMonth } from '../../lib/utils'
import { t } from '../../i18n'

// Menu → Ma’lumot, and its "Ilova haqida" page.

function LinkRow({ to, label, faint = false }) {
  return (
    <Link to={to} className="group flex items-center gap-3 px-1 transition active:bg-black/[0.03]">
      <span className="flex min-w-0 flex-1 items-center border-b border-line/80 py-[22px] group-last:border-b-0">
        <span className="flex-1 text-[18px] text-ink">{t(label)}</span>
        <ChevronRight className={`h-5 w-5 shrink-0 ${faint ? 'text-muted/60' : 'text-ink/70'}`} />
      </span>
    </Link>
  )
}

export function Info() {
  return (
    <AccountScreen title="Ma’lumot" large>
      <div className="px-1">
        <LinkRow to="/biznes" label="Hamkorlar" faint />
        <LinkRow to="/cars" label="Tariflar" faint />
        <LinkRow to="/savollar" label="Ko‘p beriladigan savollar" faint />
        <LinkRow to="/about" label="Ilova haqida" faint />
      </div>
    </AccountScreen>
  )
}

// eslint-disable-next-line no-undef -- injected by vite.config.js `define`
const BUILT_AT = typeof __APP_BUILT_AT__ === 'string' ? __APP_BUILT_AT__ : null

export function About() {
  const built = BUILT_AT ? new Date(BUILT_AT) : null
  const version = built ? `${built.getFullYear()}.${built.getMonth() + 1}.${built.getDate()}` : '—'
  const date = built ? `${dayMonth(built.getDate(), built.getMonth(), { dash: true, lower: true })} ${built.getFullYear()}` : ''
  const build = built ? `${String(built.getHours()).padStart(2, '0')}${String(built.getMinutes()).padStart(2, '0')}` : ''

  return (
    <AccountScreen title="Ilova haqida">
      <div className="-mx-4 flex flex-col items-center px-4 pb-10 pt-8">
        <span className="flex h-[120px] w-[120px] items-center justify-center rounded-[30px] bg-gradient-to-br from-brand to-brand-dark shadow-[0_14px_30px_-12px_rgba(0,163,174,0.7)]">
          <span className="flex h-[92px] w-[92px] items-center justify-center rounded-[24px] bg-white">
            <Logo size={64} />
          </span>
        </span>
        <p className="mt-5 text-center text-[15px] leading-6 text-muted">
          {t('Versiya {0}, chiqarilgan sana {1}', version, date)}
          <br />
          {t('build {0}', build)}
        </p>
      </div>
      <div className="-mx-4 border-t-[10px] border-canvas">
        <div className="px-4">
          <LinkRow to="/terms" label="Foydalanish shartlari" />
          <LinkRow to="/privacy" label="Maxfiylik siyosati" />
        </div>
      </div>
      <p className="mt-16 px-1 text-[14px] text-muted">© TaxiLine, {new Date().getFullYear()}</p>
    </AccountScreen>
  )
}
