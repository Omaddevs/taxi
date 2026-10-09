import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { AuthChrome, GoogleMark, KirishBotButton, TELEGRAM_BOT, TelegramMark } from '../components/auth/AuthChrome'
import { FlagUz } from '../components/ui/Flags'
import { useAuth } from '../context/AuthContext'
import { homePathForRole } from '../lib/role'
import { useSeo } from '../seo/useSeo'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../lib/utils'

const POLL_INTERVAL_MS = 2000

export default function Login() {
  const { requestOtp, verifyOtp, pollOtp, status, authUser } = useAuth()
  useSeo('/login')
  const navigate = useNavigate()
  const phoneInputRef = useRef(null)
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const phoneReady = isCompletePhoneUz(phone)
  const [code, setCode] = useState('')
  const [otpRequestId, setOtpRequestId] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const pollOtpRef = useRef(pollOtp)
  useEffect(() => {
    pollOtpRef.current = pollOtp
  }, [pollOtp])
  useEffect(() => {
    if (step !== 'code' || !otpRequestId) return undefined
    const interval = setInterval(async () => {
      try {
        const result = await pollOtpRef.current(otpRequestId)
        if (!result.pending) {
          navigate(homePathForRole(result.user), { replace: true })
          return
        }
        // Only sent for accounts that switched on autofill in the kirish bot's Sozlamalar.
        if (result.code) {
          setCode((prev) => prev || result.code)
        }
      } catch {
        /* retry next tick */
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [step, otpRequestId, navigate])

  function onPhoneChange(e) {
    setPhone(maskPhoneUz(e.target.value))
  }

  async function onRequestOtp(e) {
    e.preventDefault()
    if (!isCompletePhoneUz(phone)) {
      setError('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await requestOtp(toE164Uz(phone), { intent: 'login' })
      setOtpRequestId(data.otpRequestId)
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
      const user = await verifyOtp(toE164Uz(phone), code, { intent: 'login' })
      navigate(homePathForRole(user), { replace: true })
    } catch (err) {
      setError(err.message || 'Kod noto‘g‘ri')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'checking' || status === 'checking-telegram') {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm font-semibold text-muted">Yuklanmoqda…</div>
    )
  }

  if (status === 'authed' && authUser) {
    return <Navigate to={homePathForRole(authUser)} replace />
  }

  const notRegistered = /ro‘yxatdan o‘tmagan|royxatdan otmagan/i.test(error || '')

  return (
    <AuthChrome>
      {step === 'phone' ? (
        <form onSubmit={onRequestOtp} className="flex flex-1 flex-col">
          <h1 className="text-[20px] font-extrabold leading-7 tracking-tight">Xush kelibsiz!</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted lg:mt-2 lg:text-[15px] lg:leading-6">Telefon raqamingizni kiriting</p>

          <label className="relative mt-5 block">
            <span className="absolute -top-2 left-3 z-10 bg-white px-1 text-[11px] font-bold text-brand">Telefon raqam</span>
            <div
              className={`flex h-14 items-center gap-2 rounded-[16px] border-[1.5px] bg-white px-3 ${
                phoneReady ? 'border-brand' : 'border-brand/50'
              }`}
            >
              <FlagUz className="h-4 w-[22px]" />
              <span className="text-[15px] font-extrabold">+998</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
              <input
                ref={phoneInputRef}
                value={maskLocalPhoneUz(phone)}
                onChange={onPhoneChange}
                placeholder="87 735 36 36"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={12}
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
          {notRegistered ? (
            <Link
              to="/register"
              state={{ phone }}
              className="mt-2 text-center text-[13px] font-extrabold text-brand"
            >
              Ro‘yxatdan o‘tish
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

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-semibold text-muted">Yoki davom eting</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <a
            href={`https://t.me/${TELEGRAM_BOT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center gap-3 rounded-[16px] border border-line bg-white px-3 transition hover:border-brand/50 hover:bg-[#f7fdfe] lg:h-14 lg:px-4"
          >
            <TelegramMark />
            <span className="min-w-0 flex-1 text-[14px] font-bold">Telegram orqali kirish</span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </a>
          <button
            type="button"
            onClick={() => setNote('Google orqali kirish tez orada qo‘shiladi. Hozircha telefon yoki Telegram ishlating.')}
            className="mt-2 flex h-12 w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-white px-3 transition hover:border-brand/50 hover:bg-[#f7fdfe] lg:mt-3 lg:h-14 lg:px-4"
          >
            <GoogleMark />
            <span className="min-w-0 flex-1 text-left text-[14px] font-bold">Google orqali kirish</span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </button>
          {note ? <p className="mt-2 text-center text-[11px] font-semibold text-muted">{note}</p> : null}

          <p className="mt-auto pt-5 text-center text-[13px] text-muted">
            Hisobingiz yo‘qmi?{' '}
            <Link to="/register" state={{ phone }} className="font-extrabold text-brand">
              Ro‘yxatdan o‘tish
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={onVerify} className="flex flex-1 flex-col">
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="mb-3 flex h-11 items-center gap-1 text-[13px] font-semibold text-muted"
          >
            <ArrowLeft className="h-4 w-4" /> {phone}
          </button>
          <h1 className="text-[20px] font-extrabold leading-7 tracking-tight">Tasdiqlash kodi</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted lg:mt-2 lg:text-[15px] lg:leading-6">
            6 xonali kodni Telegram’dagi kirish botimizdan oling va shu yerga kiriting.
          </p>
          <KirishBotButton start="kirish" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            className="mt-5 h-14 w-full rounded-[16px] border-[1.5px] border-brand/50 bg-white px-4 text-center text-[18px] font-extrabold tracking-[0.35em] outline-none focus:border-brand"
          />
          {error ? <p className="mt-2 text-[13px] font-semibold text-red-500">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="relative mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-brand text-[15px] font-extrabold text-ink shadow-[0_10px_22px_-6px_rgba(0,199,212,0.6)] transition hover:bg-[#00b6c2] active:scale-[0.99] disabled:bg-[#e9eef2] disabled:text-ink/35 disabled:shadow-none lg:h-14 lg:text-[16px]"
          >
            {loading ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
            <ArrowRight className="absolute right-5 h-5 w-5" />
          </button>
        </form>
      )}
    </AuthChrome>
  )
}
