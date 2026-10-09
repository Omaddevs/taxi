import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Info, UserX } from 'lucide-react'
import { AuthChrome, GoogleMark } from '../components/auth/AuthChrome'
import { FlagUz } from '../components/ui/Flags'
import { useAuth } from '../context/AuthContext'
import { clearPendingGoogle, readPendingGoogle } from '../lib/google'
import { homePathForRole } from '../lib/role'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../lib/utils'

// Google registration: Google already told us the name, email and photo; the only thing asked
// is a phone number (drivers call passengers by it) — no confirmation code. Reached from the
// register page's Google button, or from the login page when this Google account has no
// TaxiLine account yet (then the "not found" notice is shown on top).
export default function GoogleFinish() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { status, authUser, googleRegister } = useAuth()
  const pending = useMemo(() => (state?.ticket ? state : readPendingGoogle()), [state])

  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneReady = isCompletePhoneUz(phone)

  if (status === 'authed' && authUser) return <Navigate to={homePathForRole(authUser)} replace />
  if (!pending?.ticket) return <Navigate to="/register" replace />

  const profile = pending.profile || {}
  const phoneTaken = /allaqachon ro‘yxatdan o‘tgan/i.test(error)
  const expired = /qaytadan kiring|vaqt tugadi/i.test(error)

  async function onSubmit(e) {
    e.preventDefault()
    if (!phoneReady) {
      setError('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak')
      return
    }
    setError('')
    setLoading(true)
    try {
      const user = await googleRegister(pending.ticket, toE164Uz(phone))
      clearPendingGoogle()
      navigate(homePathForRole(user), { replace: true })
    } catch (err) {
      setError(err.message || 'Ro‘yxatdan o‘tib bo‘lmadi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthChrome>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        {pending.notFound ? (
          <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
            <UserX className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-[13px] leading-5">
              <p className="font-extrabold">Foydalanuvchi topilmadi</p>
              <p className="mt-0.5">Bu Google akkaunt bilan hali ro‘yxatdan o‘tilmagan. Bir daqiqada ro‘yxatdan o‘ting.</p>
            </div>
          </div>
        ) : null}

        <h1 className="text-[20px] font-extrabold leading-7 tracking-tight">Google orqali ro‘yxatdan o‘tish</h1>
        <p className="mt-1 text-[13px] leading-5 text-muted lg:mt-2 lg:text-[15px] lg:leading-6">
          Ism va email Google’dan olindi. Faqat telefon raqamingizni kiriting — haydovchi siz bilan shu raqam orqali bog‘lanadi.
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
            <p className="truncate text-[14px] font-extrabold text-ink">{profile.name || 'Google akkaunt'}</p>
            <p className="truncate text-[12px] font-semibold text-muted">{profile.email || ''}</p>
          </div>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" title="Google tasdiqladi">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </div>

        <label className="relative mt-5 block">
          <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-bold text-brand">Telefon raqam</span>
          <div className={`flex h-14 items-center gap-2 rounded-[16px] border-[1.5px] bg-white px-3 ${phoneReady ? 'border-brand' : 'border-brand/50'}`}>
            <FlagUz className="h-4 w-[22px]" />
            <span className="text-[15px] font-extrabold">+998</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
            <input
              value={maskLocalPhoneUz(phone)}
              onChange={(e) => setPhone(maskPhoneUz(e.target.value))}
              placeholder="87 735 36 36"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={12}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-[15px] font-extrabold tracking-wide outline-none placeholder:font-semibold placeholder:text-slate-300"
            />
            {phoneReady ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            ) : null}
          </div>
        </label>

        {error ? <p className="mt-2 text-[13px] font-semibold text-red-500">{error}</p> : null}
        {phoneTaken ? (
          <Link to="/login" state={{ phone }} onClick={clearPendingGoogle} className="mt-2 text-center text-[13px] font-extrabold text-brand">
            Telefon raqam orqali kirish
          </Link>
        ) : null}
        {expired ? (
          <Link to="/register" onClick={clearPendingGoogle} className="mt-2 text-center text-[13px] font-extrabold text-brand">
            Google orqali qaytadan urinish
          </Link>
        ) : null}

        <button
          type="submit"
          disabled={loading || !phoneReady}
          className="relative mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-ink shadow-[0_10px_22px_-6px_rgba(0,199,212,0.6)] transition hover:bg-[#00b6c2] active:scale-[0.99] disabled:bg-[#e9eef2] disabled:text-ink/35 disabled:shadow-none lg:h-14 lg:text-[16px]"
        >
          {loading ? 'Ro‘yxatdan o‘tilmoqda…' : 'Ro‘yxatdan o‘tish'}
          <ArrowRight className="absolute right-5 h-5 w-5" />
        </button>

        <p className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          Keyingi safar «Google orqali kirish» tugmasi bilan bir bosishda, kodsiz kirasiz.
        </p>

        <p className="mt-auto pt-5 text-center text-[13px] text-muted">
          Hisobingiz bormi?{' '}
          <Link to="/login" onClick={clearPendingGoogle} className="font-extrabold text-brand">
            Kirish
          </Link>
        </p>
      </form>
    </AuthChrome>
  )
}
