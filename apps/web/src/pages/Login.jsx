import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { BrandMark } from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('+998')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onRequestOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestOtp(phone)
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
      await verifyOtp(phone, code)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Kod noto‘g‘ri')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        {step === 'phone' ? (
          <form onSubmit={onRequestOtp} className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,40,0.06)]">
            <h1 className="text-lg font-extrabold">Xush kelibsiz</h1>
            <p className="mt-1 text-sm text-muted">Telefon raqamingizni kiriting</p>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901234567"
              inputMode="tel"
              className="mt-4 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm font-semibold outline-none focus:border-brand"
            />
            {error ? <p className="mt-2 text-sm font-semibold text-red-500">{error}</p> : null}
            <Button type="submit" size="lg" disabled={loading} className="mt-4 w-full">
              {loading ? 'Yuborilmoqda…' : 'Kod olish'}
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,40,0.06)]">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="mb-3 flex items-center gap-1 text-sm font-semibold text-muted"
            >
              <ArrowLeft className="h-4 w-4" /> {phone}
            </button>
            <h1 className="text-lg font-extrabold">Tasdiqlash kodi</h1>
            <p className="mt-1 text-sm text-muted">SMS orqali yuborilgan 6 xonali kodni kiriting</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="mt-4 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-center text-lg font-extrabold tracking-[0.3em] outline-none focus:border-brand"
            />
            {error ? <p className="mt-2 text-sm font-semibold text-red-500">{error}</p> : null}
            <Button type="submit" size="lg" disabled={loading || code.length !== 6} className="mt-4 w-full">
              {loading ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
