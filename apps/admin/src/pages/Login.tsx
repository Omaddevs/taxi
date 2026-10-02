import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { Field, inputClass } from '../components/ui/Chart'
import { isCompletePhoneUz, maskLocalPhoneUz, toE164Uz } from '../lib/utils'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneReady = isCompletePhoneUz(phone)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!phoneReady) {
      setError('Telefon raqamini to‘liq kiriting')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(toE164Uz(phone), password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="login-grid relative hidden flex-col justify-between p-10 text-white lg:flex">
        <Logo light />
        <div className="max-w-md">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">Operator paneli</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight">TaxiLine tizimini boshqaring</h1>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Foydalanuvchilar, haydovchilar, bronlar, moliya va xizmatlarni bitta joydan kuzating va boshqaring.
          </p>
        </div>
        <p className="text-xs text-white/40">Admin, sotuv va texnik operatorlar uchun</p>
      </div>
      <div className="flex items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-xl font-extrabold text-ink">Admin panelga kirish</h2>
          <p className="mt-1 mb-6 text-sm text-muted">Faqat telefon raqami va parol kifoya — email shart emas</p>
          <form onSubmit={onSubmit} className="space-y-3" autoComplete="on">
            <Field label="Telefon raqami">
              <div className={`${inputClass} flex items-center gap-2 focus-within:border-brand`}>
                <span className="shrink-0 text-sm font-bold text-ink">+998</span>
                <input
                  value={maskLocalPhoneUz(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="87 735 36 36"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={12}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            </Field>
            <Field label="Parol">
              <div className={`${inputClass} flex items-center gap-2 focus-within:border-brand`}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parol"
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-muted hover:text-ink"
                  aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            <Button type="submit" disabled={loading || !phoneReady || !password} className="w-full">
              {loading ? 'Kirilmoqda…' : 'Kirish'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
