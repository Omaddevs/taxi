import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Info, UserX } from 'lucide-react'
import { AuthChrome, GoogleMark } from '../components/auth/AuthChrome'
import { useAuth } from '../context/AuthContext'
import { clearPendingGoogle, readPendingGoogle } from '../lib/google'
import { homePathForRole } from '../lib/role'
import { t } from '../i18n'

// Shown when "Google orqali kirish" on the login page meets a Google account that has no
// TaxiLine account yet: says so, and registers it with one tap — Google already gave the name,
// email and photo, so nothing is typed (the phone is asked later, only when something needs it).
export default function GoogleFinish() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { status, authUser, googleRegister } = useAuth()
  const pending = useMemo(() => (state?.ticket ? state : readPendingGoogle()), [state])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (status === 'authed' && authUser) return <Navigate to={homePathForRole(authUser)} replace />
  if (!pending?.ticket) return <Navigate to="/register" replace />

  const profile = pending.profile || {}
  const expired = /qaytadan kiring|vaqt tugadi/i.test(error)

  async function onRegister() {
    setError('')
    setLoading(true)
    try {
      const user = await googleRegister(pending.ticket)
      clearPendingGoogle()
      navigate(homePathForRole(user), { replace: true })
    } catch (err) {
      setError(err.message || t('Ro‘yxatdan o‘tib bo‘lmadi'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthChrome>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
          <UserX className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-[13px] leading-5">
            <p className="font-extrabold">{t('Foydalanuvchi topilmadi')}</p>
            <p className="mt-0.5">{t('Bu Google akkaunt bilan hali ro‘yxatdan o‘tilmagan.')}</p>
          </div>
        </div>

        <h1 className="mt-5 text-[20px] font-extrabold leading-7 tracking-tight">{t('Google orqali ro‘yxatdan o‘tish')}</h1>
        <p className="mt-1 text-[13px] leading-5 text-muted lg:mt-2 lg:text-[15px] lg:leading-6">
          {t('Bir bosishda akkaunt ochiladi — ism, email va rasm Google’dan olinadi.')}
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-line bg-[#f8fafb] px-3 py-3">
          {profile.picture ? (
            <img src={profile.picture} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
              <GoogleMark />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-ink">{profile.name || t('Google akkaunt')}</p>
            <p className="truncate text-[12px] font-semibold text-muted">{profile.email || ''}</p>
          </div>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" title={t('Google tasdiqladi')}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </div>

        {error ? <p className="mt-3 text-[13px] font-semibold text-red-500">{t(error)}</p> : null}
        {expired ? (
          <Link to="/register" onClick={clearPendingGoogle} className="mt-2 text-center text-[13px] font-extrabold text-brand">
            {t('Google orqali qaytadan urinish')}
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onRegister}
          disabled={loading}
          className="relative mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-ink shadow-[0_10px_22px_-6px_rgba(0,199,212,0.6)] transition hover:bg-[#00b6c2] active:scale-[0.99] disabled:opacity-70 lg:h-14 lg:text-[16px]"
        >
          {loading ? t('Ro‘yxatdan o‘tilmoqda…') : t('Ro‘yxatdan o‘tish')}
          <ArrowRight className="absolute right-5 h-5 w-5" />
        </button>

        <p className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          {t('Keyingi safar «Google orqali kirish» bilan bir bosishda kirasiz. Telefon raqam faqat buyurtma berayotganda bir marta so‘raladi.')}
        </p>

        <p className="mt-auto pt-5 text-center text-[13px] text-muted">
          {t('Boshqa akkaunt bilan kirmoqchimisiz?')}{' '}
          <Link to="/login" onClick={clearPendingGoogle} className="font-extrabold text-brand">
            {t('Kirish')}
          </Link>
        </p>
      </div>
    </AuthChrome>
  )
}
