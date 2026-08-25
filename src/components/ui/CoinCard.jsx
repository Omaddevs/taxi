import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

export function CoinIcon({ size = 28 }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full shadow-[0_2px_6px_rgba(180,120,0,0.38)]"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(160deg,#ffd766 0%,#f5b423 48%,#d99209 100%)',
      }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: size - size * 0.22,
          height: size - size * 0.22,
          background: 'linear-gradient(160deg,#f7bf3a 0%,#e5a30f 100%)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)',
        }}
      >
        <span
          className="font-extrabold leading-none text-white"
          style={{ fontSize: size * 0.46, textShadow: '0 1px 1px rgba(160,105,0,0.45)' }}
        >
          T
        </span>
      </span>
    </span>
  )
}

export function CoinCard() {
  const { user } = useApp()
  const coins = new Intl.NumberFormat('uz-UZ').format(user.coins ?? 0).replace(/,/g, ' ')

  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(28,28,40,0.06)]">
      <div className="flex items-center gap-3">
        <CoinIcon size={46} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Coin balans</p>
          <p className="truncate text-[24px] font-extrabold leading-tight">{coins}</p>
        </div>
        <Link
          to="/wallet"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-extrabold text-white shadow-sm shadow-brand/30"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          To‘ldirish
        </Link>
      </div>
      <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 text-[11px] leading-snug text-muted">
        Har safar va yoqilg‘i to‘lovidan coin yig‘iladi — keyin chegirmalarga almashtirasiz.
      </p>
    </div>
  )
}
