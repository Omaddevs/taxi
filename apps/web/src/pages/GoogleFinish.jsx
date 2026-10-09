import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ShieldCheck } from 'lucide-react'
import { AuthChrome, GoogleMark, KirishBotButton } from '../components/auth/AuthChrome'
import { FlagUz } from '../components/ui/Flags'
import { useAuth } from '../context/AuthContext'
import { clearPendingGoogle, readPendingGoogle } from '../lib/google'
import { homePathForRole } from '../lib/role'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../lib/utils'

// Second step of a first Google sign-in: Google told us who this is, now one phone confirmation
// (code from @taxiline_kirish_bot) either creates the account or attaches Google to the account
// that already has this number. From then on "Google orqali kirish" signs in with one tap.
export default function GoogleFinish() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { status, authUser, googleRequestOtp, googleComplete } = useAuth()
  const pending = useMemo(() => (state?.ticket ? state : readPendingGoogle()), [state])

  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [code, setCode] = useState('')
  const [existing, setExisting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneReady = isCompletePhoneUz(phone)

  if (status === 'authed' && authUser) return <Navigate to={homePathForRole(authUser)} replace />
  if (!pending?.ticket) return <Navigate to="/login" replace />

  const profile = pending.profile || {}
  const expired = (message) => /qaytadan kiring|vaqt tugadi/i.test(message || '')

  async function onRequest(e) {
    e.preventDefault()
    if (!phoneReady) {
      setError('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await googleRequestOtp(pending.ticket, toE164Uz(phone))
      setExisting(Boolean(data.existing))
      setStep('code')
    } catch (err) {
      setError(err.message || 'Kod yuborilmadi')
    } finally {
      setLoading(false)
    }
  }

  async function onVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await googleComplete(pending.ticket, toE164Uz(phone), code)
      clearPendingGoogle()
      navigate(homePathForRole(user), { replace: true })
    } catch (err) {
      setError(err.message || 'Kod noto‘g‘ri')
    } finally {
      setLoading(false)
    }
  }

  const card = (
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
  )

  return (
    <AuthChrome>
      {step === 'phone' ? (
        <form onSubmit={onRequest} className="flex flex-1 flex-col">
          <h1 className="text-[20px] font-extrabold leading-7 tracking-tight">Raqamingizni tasdiqlang</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted lg:mt-2 lg:text-[15px] lg:leading-6">
            Bir martalik qadam: telefon raqamingizni kiriting. Keyingi safar Google orqali bir bosishda kirasiz.
          </p>
          {card}

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
          {expired(error) ? (
            <Link to="/login" onClick={clearPendingGoogle} className="mt-2 text-center text-[13px] font-extrabold text-brand">
              Qaytadan kirish
            </Link>
          ) : null}

          <button
            type="submit"
            disabled={loading || !phoneReady}
            className="relative mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-ink shadow-[0_10px_22px_-6px_rgba(0,199,212,0.6)] transition hover:bg-[#00b6c2] active:scale-[0.99] disabled:bg-[#e9eef2] disabled:text-ink/35 disabled:shadow-none lg:h-14 lg:text-[16px]"
          >
            {loading ? 'Yuborilmoqda…' : 'Kod olish'}
            <ArrowRight className="absolute right-5 h-5 w-5" />
          </button>

          <p className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            Raqam bilan avval ro‘yxatdan o‘tgan bo‘lsangiz, Google shu akkauntingizga bog‘lanadi — ma’lumotlaringiz saqlanib qoladi.
          </p>
        </form>
      ) : (
        <form onSubmit={onVerify} className="flex flex-1 flex-col">
          <button type="button" onClick={() => setStep('phone')} className="mb-3 flex h-11 items-center gap-1 text-[13px] font-semibold text-muted">
            <ArrowLeft className="h-4 w-4" /> {phone}
          </button>
          <h1 className="text-[20px] font-extrabold leading-7 tracking-tight">Tasdiqlash kodi</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted lg:mt-2 lg:text-[15px] lg:leading-6">
            {existing
              ? 'Bu raqam ro‘yxatdan o‘tgan — kirish kodini botdan (/kirish) oling.'
              : 'Yangi akkaunt ochiladi — ro‘yxatdan o‘tish kodini botdan (/royxatdan_otish) oling.'}
          </p>
          <KirishBotButton start={existing ? 'kirish' : 'royxat'} />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="mt-5 h-14 w-full rounded-[16px] border-[1.5px] border-brand/50 bg-white px-4 text-center text-[18px] font-extrabold tracking-[0.35em] outline-none focus:border-brand"
          />
          {error ? <p className="mt-2 text-[13px] font-semibold text-red-500">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="relative mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-ink shadow-[0_10px_22px_-6px_rgba(0,199,212,0.6)] transition hover:bg-[#00b6c2] active:scale-[0.99] disabled:bg-[#e9eef2] disabled:text-ink/35 disabled:shadow-none lg:h-14 lg:text-[16px]"
          >
            {loading ? 'Tekshirilmoqda…' : existing ? 'Tasdiqlash va kirish' : 'Ro‘yxatdan o‘tish'}
            <ArrowRight className="absolute right-5 h-5 w-5" />
          </button>
        </form>
      )}
    </AuthChrome>
  )
}
