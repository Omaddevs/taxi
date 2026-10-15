import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, BadgeCheck, Flag, MapPin, Star } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { DriverAdCard, DriverAvatar, RatingLine, TelegramAdCard, tashkentDate, useMessageDriver } from '../components/drivers/driverUi'
import { PlaceSelect, placeQuery } from '../components/drivers/PlaceSelect'
import { api } from '../lib/api'
import { t } from '../i18n'

// "Haydovchilar": every driver's live ads (the trips they post from their driver profile →
// "Reys joylash"), each with who the driver is and three ways to reach them — call, chat, book.
// Drivers' ads from the Telegram groups that an admin approved come in the same list (source
// 'TELEGRAM', call / Telegram only). The second tab lists the top-rated drivers; any driver opens
// their profile (/drivers/:id).

const DATES = [
  { id: '', label: 'Hammasi' },
  { id: 'today', label: 'Bugun' },
  { id: 'tomorrow', label: 'Ertaga' },
]

const EMPTY = { region: null, district: null }

export default function Drivers() {
  const [tab, setTab] = useState('ads')
  const [from, setFrom] = useState(EMPTY)
  const [to, setTo] = useState(EMPTY)
  const [date, setDate] = useState('')
  const fromQ = placeQuery(from)
  const toQ = placeQuery(to)
  const { message, busyId, error } = useMessageDriver()

  const dateParam = date === 'today' ? tashkentDate(0) : date === 'tomorrow' ? tashkentDate(1) : ''
  const { data, isLoading, isError } = useQuery({
    queryKey: ['driver-board', fromQ, toQ, dateParam],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (fromQ) qs.set('from', fromQ)
      if (toQ) qs.set('to', toQ)
      if (dateParam) qs.set('date', dateParam)
      return api.get(`/drivers/board?${qs}`)
    },
    enabled: tab === 'ads',
    refetchInterval: 60_000,
  })
  const { data: top = [], isLoading: topLoading } = useQuery({
    queryKey: ['drivers-top'],
    queryFn: () => api.get('/drivers/top'),
    enabled: tab === 'top',
  })

  const items = data?.items ?? []
  const filtered = Boolean(fromQ || toQ || dateParam)

  return (
    <div className="mx-auto max-w-4xl">
      <ScreenHeader title={t('Haydovchilar')} subtitle={t('E’lonlar va haydovchilar')} />

      {/* Tabs */}
      <div className="mb-4 grid grid-cols-2 rounded-2xl bg-white p-1 shadow-[0_6px_20px_rgba(28,28,40,0.05)]">
        {[
          ['ads', 'E’lonlar'],
          ['top', 'Top haydovchilar'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`h-11 rounded-xl text-[14px] font-extrabold transition ${tab === id ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink'}`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {tab === 'ads' ? (
        <>
          <div className="mb-3 rounded-[22px] bg-white p-3 shadow-[0_6px_20px_rgba(28,28,40,0.05)]">
            <div className="flex items-center gap-2">
              <PlaceSelect value={from} onChange={setFrom} placeholder={t('Qayerdan')} icon={MapPin} />
              <button
                type="button"
                onClick={() => {
                  setFrom(to)
                  setTo(from)
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink transition hover:bg-brand-soft"
                aria-label={t('Almashtirish')}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <PlaceSelect value={to} onChange={setTo} placeholder={t('Qayerga')} icon={Flag} />
            </div>
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {DATES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDate(d.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition ${date === d.id ? 'bg-brand text-white' : 'bg-canvas text-ink'}`}
                >
                  {t(d.label)}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{t(error)}</p> : null}

          {isLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-[236px] animate-pulse rounded-[22px] bg-white" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-10 text-center text-sm font-semibold text-red-500">{t('E’lonlarni yuklab bo‘lmadi. Qaytadan urinib ko‘ring.')}</p>
          ) : !items.length ? (
            <div className="flex flex-col items-center rounded-[22px] bg-white px-6 py-10 text-center">
              <img src="/home/driver-mascot.webp" alt="" className="w-[110px] opacity-90" />
              <p className="mt-4 text-[17px] font-extrabold text-ink">{filtered ? t('Bu yo‘nalishda e’lon topilmadi') : t('Hozircha e’lon yo‘q')}</p>
              <p className="mt-1 max-w-[340px] text-sm text-muted">
                {filtered ? t('Boshqa sana yoki shaharni tanlab ko‘ring.') : t('Haydovchilar reys joylashi bilan shu yerda ko‘rinadi.')}
              </p>
              {filtered ? (
                <button
                  type="button"
                  onClick={() => {
                    setFrom(EMPTY)
                    setTo(EMPTY)
                    setDate('')
                  }}
                  className="mt-4 rounded-full bg-brand-soft px-5 py-2 text-[13px] font-bold text-brand-dark"
                >
                  {t('Filtrni tozalash')}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((offer) =>
                offer.source === 'TELEGRAM' ? (
                  <TelegramAdCard key={`tg-${offer.id}`} ad={offer} />
                ) : (
                  <DriverAdCard key={offer.id} offer={offer} driver={offer.driver} onMessage={message} messaging={busyId === offer.driver.userId} />
                ),
              )}
            </div>
          )}
        </>
      ) : topLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-[22px] bg-white" />
          ))}
        </div>
      ) : !top.length ? (
        <p className="py-10 text-center text-sm text-muted">{t('Hozircha tasdiqlangan haydovchilar yo‘q')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {top.map((d, i) => (
            <Link
              key={d.id}
              to={`/drivers/${d.id}`}
              className="flex items-center gap-3 rounded-[22px] border border-line bg-white p-4 transition hover:border-brand/40"
            >
              <span className={`w-6 text-center text-[15px] font-extrabold ${i < 3 ? 'text-amber-500' : 'text-muted'}`}>{i + 1}</span>
              <DriverAvatar driver={{ ...d, name: d.name || t('Haydovchi') }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-extrabold text-ink">{d.name || t('Haydovchi')}</span>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />
                </span>
                <span className="block truncate text-xs text-muted">{d.carModel}</span>
                <RatingLine driver={d} className="mt-1" />
              </span>
              {i < 3 ? <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" /> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
