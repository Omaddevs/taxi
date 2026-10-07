import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Box,
  Car,
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  Fuel,
  Gauge,
  HelpCircle,
  Heart,
  LogOut,
  Map,
  MapPin,
  Moon,
  Shield,
  ShowerHead,
  Siren,
  SquareParking,
  Star,
  User,
  Wrench,
  Zap,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { avatarOrFallback } from '../../lib/adapters'
import { driverCode, formatPhoneUz } from '../../lib/utils'
import { LanguageRow } from '../../components/ui/LanguagePicker'
import { Field, Input } from '../../components/ui/Input'
import { PlateInput, isValidPlateUz } from '../../components/ui/PlateInput'
import { UZ_REGIONS } from '../../data/regions'
import { DriverHeader, DriverSheet, Toggle } from './ui'

const driverServices = [
  { id: 'map', to: '/driver/smart-map', title: 'Smart xarita', icon: Map },
  { id: 'service', to: '/driver/hub/auto-service', title: 'Avtoservis', icon: Wrench },
  { id: 'wash', to: '/driver/hub/wash', title: 'Moyka', icon: ShowerHead },
  { id: 'parking', to: '/driver/hub/parking', title: 'Parking', icon: SquareParking },
  { id: 'ev', to: '/driver/hub/ev', title: 'EV zaryad', icon: Zap },
  { id: 'women', to: '/driver/women', title: 'Ayollar', icon: Heart },
]

export default function DriverSettings() {
  const { user, notifsEnabled, setNotifsEnabled, theme, setTheme, autoAccept, workRegions } = useApp()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [sheet, setSheet] = useState(null)

  const { data: stats } = useQuery({ queryKey: ['driver-stats'], queryFn: () => api.get('/drivers/me/stats') })
  const toggleOnline = useMutation({
    mutationFn: (online) => api.patch('/drivers/me/status', { online }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-stats'] }),
  })

  const name = stats?.name || user?.name || user?.phone
  const avatar = avatarOrFallback(user?.avatarUrl, name)
  // 0 alongside 0 ratings means "no real ratings yet" — never a fabricated default.
  const rating = stats?.ratingAvg ?? user?.driver?.ratingAvg ?? 0
  const ratingCount = stats?.ratingCount ?? 0
  const code = driverCode(user.id)
  const online = stats?.online ?? user?.driver?.online ?? false
  const carModel = user?.driver?.carModel || 'Avtomobil'
  const plate = user?.driver?.plate || 'raqam'

  async function copyId() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function onLogout() {
    if (online) toggleOnline.mutate(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader title="Sozlamalar" />

      <div className="space-y-3 px-5 pb-6 pt-4">
        <button
          type="button"
          onClick={() => setSheet('profile')}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left"
        >
          <div className="relative">
            <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-extrabold">{name}</p>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                {ratingCount > 0 ? Number(rating).toFixed(1) : 'Yangi'} <Star className="h-3 w-3 fill-brand" />
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                copyId()
              }}
              className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted"
            >
              Haydovchi ID: {code} <Copy className="h-3 w-3" />
              {copied ? <span className="text-brand">nusxalandi</span> : null}
            </button>
            <p className="text-xs text-muted">{formatPhoneUz(user.phone)}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>

        <section>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted">Foydali xizmatlar</p>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/driver/roadside" className="relative overflow-hidden rounded-2xl bg-[#ffecec] p-4">
              <span className="absolute right-3 top-3 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">SOS</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-500">
                <Siren className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-extrabold">Yo‘lda yordam</p>
              <p className="mt-0.5 text-[11px] text-muted">Usta · evakuator</p>
            </Link>
            <Link to="/driver/fuel" className="relative overflow-hidden rounded-2xl bg-[#eef8f0] p-4">
              <span className="absolute right-3 top-3 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-3%</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600">
                <Fuel className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-extrabold">Yoqilg‘i</p>
              <p className="mt-0.5 text-[11px] text-muted">Yoqilg‘i shahobchasi</p>
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 sm:grid-cols-6">
            {driverServices.map((item) => (
              <Link key={item.id} to={item.to} className="flex flex-col items-center gap-1.5 rounded-xl py-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas text-slate-700">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-bold leading-tight">{item.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <Group>
          <Row icon={User} color="bg-brand-soft text-brand" title="Profil ma’lumotlari" sub="Shaxsiy ma’lumotlarni tahrirlash" onClick={() => setSheet('profile')} />
          <Row icon={Car} color="bg-sky-50 text-sky-600" title="Avtomobil ma’lumotlari" sub={`${carModel} · ${plate}`} onClick={() => setSheet('car')} />
          <Row icon={FileText} color="bg-emerald-50 text-emerald-600" title="Hujjatlar va sertifikatlar" sub={user?.driver?.licenseNumber || 'Guvohnoma, texpassport va boshqalar'} onClick={() => setSheet('docs')} />
          <Row to="/driver/cargo" icon={Box} color="bg-brand-soft text-brand" title="Yuklar" sub="Yetkazib berish uchun ochiq yuklar" />
          <Row to="/driver/wallet" icon={CreditCard} color="bg-orange-50 text-orange-500" title="To‘lov usullari" sub="Daromad yechish va karta boshqaruvi" />
        </Group>

        <Group>
          <ToggleRow
            icon={Bell}
            color="bg-violet-50 text-violet-600"
            title="Bildirishnomalar"
            on={notifsEnabled}
            onChange={(on) => {
              setNotifsEnabled(on)
              if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {})
              }
            }}
          />
          <Row
            icon={MapPin}
            color="bg-brand-soft text-brand"
            title="Navbat va hududlar"
            sub={workRegions.length ? `${workRegions.length} ta hudud tanlangan` : 'Qaysi hududlardan buyurtma olish'}
            onClick={() => setSheet('regions')}
          />
          <Row
            icon={Gauge}
            color="bg-sky-50 text-sky-600"
            title="Ish rejimi"
            sub={`${online ? 'Onlayn' : 'Oflayn'}${autoAccept ? ' · avto-qabul' : ''}`}
            onClick={() => setSheet('work')}
          />
          <div className="border-b border-line px-4 py-2">
            <LanguageRow className="border-0 px-0" />
          </div>
          <ToggleRow icon={Moon} color="bg-amber-50 text-amber-600" title="Tungi mavzu" on={theme === 'dark'} onChange={(on) => setTheme(on ? 'dark' : 'light')} />
        </Group>

        <Group>
          <Row icon={Shield} color="bg-indigo-50 text-indigo-700" title="Xavfsizlik" sub="Telefon, ID va maxfiylik" onClick={() => setSheet('security')} />
          <Row to="/driver/help" icon={HelpCircle} color="bg-sky-50 text-sky-600" title="Yordam va qo‘llab-quvvatlash" sub="Yordam markazi va tez aloqa" />
        </Group>

        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-red-500">Onlayn rejimdan chiqish</span>
            <span className="block text-[11px] text-muted">Ilovadan chiqish va onlayn rejimni o‘chirish</span>
          </span>
        </button>

        <p className="pt-2 text-center text-[11px] text-muted">
          TaxiLine Haydovchi ilovasi
          <br />
          Versiya 2.1.0
        </p>
      </div>

      {sheet === 'profile' ? <ProfileSheet user={user} name={name} onClose={() => setSheet(null)} /> : null}
      {sheet === 'car' ? <CarSheet user={user} onClose={() => setSheet(null)} /> : null}
      {sheet === 'docs' ? <DocsSheet user={user} onClose={() => setSheet(null)} /> : null}
      {sheet === 'regions' ? <RegionsSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'work' ? (
        <WorkSheet online={online} toggling={toggleOnline.isPending} onToggleOnline={(next) => toggleOnline.mutate(next)} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'security' ? <SecuritySheet user={user} code={code} onLogout={onLogout} onClose={() => setSheet(null)} /> : null}
    </div>
  )
}

function Group({ children }) {
  return <div className="overflow-hidden rounded-2xl bg-white">{children}</div>
}

function Row({ to, icon: Icon, color, title, sub, onClick }) {
  const inner = (
    <>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        {sub ? <span className="block text-[11px] text-muted">{sub}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </>
  )
  if (to) {
    return (
      <Link to={to} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
      {inner}
    </button>
  )
}

function ToggleRow({ icon: Icon, color, title, on, onChange }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold">{title}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

function SaveButton({ pending, saved, onClick, disabled, error }) {
  return (
    <div>
      {error ? <p className="mb-2 text-center text-xs font-semibold text-red-500">{error}</p> : null}
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onClick}
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
      >
        {pending ? 'Saqlanmoqda…' : saved ? 'Saqlandi ✓' : 'Saqlash'}
      </button>
    </div>
  )
}

function ProfileSheet({ user, name, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: name || '', email: user.email || '' })
  const save = useMutation({
    mutationFn: () =>
      api.patch('/users/me', {
        name: form.name.trim(),
        ...(form.email.trim().includes('@') ? { email: form.email.trim() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
    },
  })
  return (
    <DriverSheet
      title="Profil ma’lumotlari"
      onClose={onClose}
      footer={
        <SaveButton
          pending={save.isPending}
          saved={save.isSuccess}
          error={save.error?.message}
          onClick={() => save.mutate()}
          disabled={form.name.trim().length < 2}
        />
      }
    >
      <div className="space-y-3">
        <Field label="Ism familiya">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Telefon">
          <Input value={formatPhoneUz(user.phone)} disabled />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@mail.uz" />
        </Field>
      </div>
    </DriverSheet>
  )
}

function CarSheet({ user, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    carModel: user?.driver?.carModel || '',
    plate: user?.driver?.plate || '',
  })
  const save = useMutation({
    mutationFn: () => api.patch('/drivers/me', { carModel: form.carModel.trim(), plate: form.plate.trim() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  return (
    <DriverSheet
      title="Avtomobil ma’lumotlari"
      onClose={onClose}
      footer={
        <SaveButton
          pending={save.isPending}
          saved={save.isSuccess}
          error={save.error?.message}
          onClick={() => save.mutate()}
          disabled={!form.carModel.trim() || !isValidPlateUz(form.plate)}
        />
      }
    >
      <div className="space-y-3">
        <Field label="Model">
          <Input value={form.carModel} onChange={(e) => setForm((f) => ({ ...f, carModel: e.target.value }))} placeholder="Chevrolet Cobalt" />
        </Field>
        <Field label="Davlat raqami">
          <PlateInput value={form.plate} onChange={(plate) => setForm((f) => ({ ...f, plate }))} />
        </Field>
      </div>
    </DriverSheet>
  )
}

function DocsSheet({ user, onClose }) {
  const queryClient = useQueryClient()
  const [licenseNumber, setLicenseNumber] = useState(user?.driver?.licenseNumber || '')
  const save = useMutation({
    mutationFn: () => api.patch('/drivers/me', { licenseNumber: licenseNumber.trim() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  return (
    <DriverSheet
      title="Hujjatlar"
      onClose={onClose}
      footer={
        <SaveButton
          pending={save.isPending}
          saved={save.isSuccess}
          error={save.error?.message}
          onClick={() => save.mutate()}
          disabled={!licenseNumber.trim()}
        />
      }
    >
      <p className="mb-3 rounded-2xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">
        Holat: {user?.driver?.approved ? 'Haydovchi tasdiqlangan' : 'Ko‘rib chiqilmoqda'}
      </p>
      <Field label="Haydovchilik guvohnomasi raqami">
        <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())} placeholder="AA1234567" />
      </Field>
    </DriverSheet>
  )
}

function RegionsSheet({ onClose }) {
  const { workRegions, setWorkRegions } = useApp()
  const [picked, setPicked] = useState(workRegions)

  function toggle(region) {
    setPicked((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]))
  }

  return (
    <DriverSheet
      title="Navbat va hududlar"
      onClose={onClose}
      footer={
        <SaveButton
          pending={false}
          saved={false}
          onClick={() => {
            setWorkRegions(picked)
            onClose()
          }}
        />
      }
    >
      <p className="mb-3 text-xs text-muted">Tanlangan hududlardan yangi buyurtmalar keladi. Bo‘sh qoldirsangiz — barchasi.</p>
      <div className="space-y-1.5">
        {UZ_REGIONS.map((region) => {
          const on = picked.includes(region)
          return (
            <button
              key={region}
              type="button"
              onClick={() => toggle(region)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold ${
                on ? 'bg-brand-soft text-brand ring-1 ring-brand/30' : 'bg-canvas'
              }`}
            >
              {region}
              <span className={`h-5 w-5 rounded-full ${on ? 'bg-brand' : 'border border-line'}`} />
            </button>
          )
        })}
      </div>
    </DriverSheet>
  )
}

function WorkSheet({ online, toggling, onToggleOnline, onClose }) {
  const { autoAccept, setAutoAccept } = useApp()
  return (
    <DriverSheet title="Ish rejimi" onClose={onClose}>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
          <div>
            <p className="text-sm font-extrabold">{online ? 'Onlayn' : 'Oflayn'}</p>
            <p className="text-[11px] text-muted">{online ? 'Buyurtmalar qabul qilinyapti' : 'Buyurtmalar kelmaydi'}</p>
          </div>
          <Toggle on={online} disabled={toggling} onChange={onToggleOnline} />
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
          <div>
            <p className="text-sm font-extrabold">Avtomatik qabul</p>
            <p className="text-[11px] text-muted">Yangi buyurtma kelishi bilan qabul qilinadi</p>
          </div>
          <Toggle on={autoAccept} onChange={setAutoAccept} />
        </div>
      </div>
    </DriverSheet>
  )
}

function SecuritySheet({ user, code, onLogout, onClose }) {
  return (
    <DriverSheet title="Xavfsizlik" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <p className="rounded-2xl bg-canvas px-4 py-3">
          <span className="block text-[11px] text-muted">Telefon</span>
          <span className="font-extrabold">{formatPhoneUz(user.phone)}</span>
        </p>
        <p className="rounded-2xl bg-canvas px-4 py-3">
          <span className="block text-[11px] text-muted">Haydovchi ID</span>
          <span className="font-extrabold">{code}</span>
        </p>
        <p className="text-xs text-muted">Kirish SMS yoki Telegram tasdiqlash kodi orqali. Alohida parol yo‘q.</p>
        <button type="button" onClick={onLogout} className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-red-50 text-sm font-extrabold text-red-500">
          Hisobdan chiqish
        </button>
      </div>
    </DriverSheet>
  )
}