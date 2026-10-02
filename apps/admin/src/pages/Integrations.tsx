import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, ShieldOff, XCircle } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card } from '../components/ui/Button'
import { api, API_BASE, ApiError } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import type { InstagramStatus } from '../types'

const CALLBACK_URL = `${API_BASE}/admin/integrations/instagram/callback`
const WEBHOOK_URL = `${API_BASE}/webhooks/instagram`

function CodeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-canvas px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className="break-all font-mono text-xs font-semibold text-ink">{value}</span>
    </div>
  )
}

export default function Integrations() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['instagram-status'],
    queryFn: () => api.get<InstagramStatus>('/admin/integrations/instagram'),
  })

  useEffect(() => {
    const result = searchParams.get('instagram')
    if (!result) return
    if (result === 'connected') {
      setBanner({ kind: 'success', text: 'Instagram akkaunt muvaffaqiyatli ulandi' })
      qc.invalidateQueries({ queryKey: ['instagram-status'] })
    } else if (result === 'error') {
      setBanner({ kind: 'error', text: searchParams.get('message') || 'Ulanishda xatolik yuz berdi' })
    }
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = useMutation({
    mutationFn: () => api.get<{ url: string }>('/admin/integrations/instagram/oauth-url'),
    onSuccess: (res) => {
      window.location.href = res.url
    },
    onError: (err) => setBanner({ kind: 'error', text: err instanceof ApiError || err instanceof Error ? err.message : 'Xatolik' }),
  })

  const disconnect = useMutation({
    mutationFn: () => api.delete('/admin/integrations/instagram'),
    onSuccess: () => {
      setBanner(null)
      qc.invalidateQueries({ queryKey: ['instagram-status'] })
    },
  })

  return (
    <div>
      <PageHeader title="Integratsiyalar" subtitle="Instagram orqali kelgan leadlarni avtomatik CRM’ga ulash" />

      {banner ? (
        <Card
          className={`mb-6 flex items-center gap-2 p-4 text-sm font-semibold ${
            banner.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {banner.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {banner.text}
        </Card>
      ) : null}

      <div className="grid max-w-2xl gap-4">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 text-white">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Instagram</h2>
              <p className="text-xs text-muted">Direct xabarlar va Lead Ads formalar avtomatik lid sifatida tushadi</p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted">Yuklanmoqda…</p>
          ) : data?.connected ? (
            <div className="space-y-3">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Akkaunt</dt>
                  <dd className="font-semibold">@{data.igUsername}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Ulangan</dt>
                  <dd className="font-semibold">{data.connectedAt ? formatDateTime(data.connectedAt) : '—'}</dd>
                </div>
                {data.connectedByName ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Kim ulagan</dt>
                    <dd className="font-semibold">{data.connectedByName}</dd>
                  </div>
                ) : null}
              </dl>
              <Button variant="danger" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                <ShieldOff className="h-3.5 w-3.5" />
                {disconnect.isPending ? 'Uzilmoqda…' : 'Uzish'}
              </Button>
            </div>
          ) : data?.configured ? (
            <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
              {connect.isPending ? 'Yo‘naltirilmoqda…' : 'Instagram bilan ulash'}
            </Button>
          ) : (
            <OnboardingChecklist />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Meta App uchun manzillar</h2>
          <p className="mb-3 text-xs text-muted">
            App sozlashda Webhooks bo‘limiga shu manzil va tokenni kiriting, OAuth redirect URI’ga esa quyidagi callback manzilini qo‘shing.
          </p>
          <div className="space-y-2">
            <CodeRow label="Webhook Callback URL" value={WEBHOOK_URL} />
            <CodeRow label="Verify Token" value="server’dagi INSTAGRAM_VERIFY_TOKEN qiymati" />
            <CodeRow label="OAuth Redirect URI" value={CALLBACK_URL} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function OnboardingChecklist() {
  const steps = [
    'Meta Business Suite’da biznes akkaunt yarating (business.facebook.com) va Instagram Professional (Business) akkauntni shu biznesga bog‘lang.',
    'Instagram akkauntni albatta bitta Facebook sahifasiga ulang — integratsiya shu sahifa orqali ishlaydi.',
    'developers.facebook.com’da yangi App yarating, unga "Instagram Graph API" va "Webhooks" mahsulotlarini qo‘shing.',
    'App Settings → Basic bo‘limidan App ID va App Secret’ni oling.',
    'Webhooks bo‘limida "Page" mavzusiga obuna bo‘lib, quyidagi Callback URL va Verify Token’ni kiriting, "messages" va "leadgen" maydonlarini yoqing.',
    'Facebook Login → Settings’da OAuth Redirect URI sifatida quyidagi callback manzilini qo‘shing.',
    'Server’dagi .env fayliga INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_VERIFY_TOKEN, INSTAGRAM_REDIRECT_URI va INSTAGRAM_TOKEN_ENC_KEY qiymatlarini kiritib, serverni qayta ishga tushiring.',
    'Shu sahifaga qaytib "Instagram bilan ulash" tugmasini bosing.',
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">Instagram hali sozlanmagan. Ulash tugmasi ishlashi uchun avval quyidagilarni bajaring:</p>
      <ol className="space-y-2 text-sm text-muted">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
        Eslatma: real (test bo‘lmagan) foydalanuvchilar bilan ishlashi uchun Meta "instagram_manage_messages" va "leads_retrieval"
        ruxsatlari uchun App Review’dan o‘tishni talab qiladi — bu Meta tomonidan bir necha kun davom etishi mumkin.
      </p>
    </div>
  )
}
