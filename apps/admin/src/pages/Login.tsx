import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center text-lg font-extrabold text-ink">Admin panel</h1>
        <p className="mb-6 text-center text-sm text-muted">Telefon raqami va parol bilan kiring</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998901112233"
            className="h-11 w-full rounded-2xl border border-line bg-canvas px-4 text-sm outline-none focus:border-brand"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Parol"
            className="h-11 w-full rounded-2xl border border-line bg-canvas px-4 text-sm outline-none focus:border-brand"
          />
          {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Kirilmoqda…' : 'Kirish'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
