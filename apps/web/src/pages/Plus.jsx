import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Crown, Sparkles, Zap } from 'lucide-react'
import { PLUS_PLANS } from '../data/plus'
import { formatSom } from '../lib/utils'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'

const ICONS = {
  start: Zap,
  plus: Sparkles,
  premium: Crown,
}

export default function Plus() {
  const navigate = useNavigate()
  const { plusPlan, setPlusPlan } = useApp()
  const [picked, setPicked] = useState(plusPlan || 'plus')
  const [done, setDone] = useState(false)
  const current = PLUS_PLANS.find((p) => p.id === picked) || PLUS_PLANS[1]
  const active = plusPlan === picked

  function confirm() {
    setPlusPlan(picked)
    setDone(true)
  }

  return (
    <div className="min-h-full bg-canvas">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-[#f43f7a] to-[#ff7ab0] px-4 pb-16 pt-[max(12px,env(safe-area-inset-top))] text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
            aria-label={t('Orqaga')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold tracking-wide">
            {plusPlan ? 'FAOL' : 'YANGI'}
          </span>
        </div>
        <p className="relative mt-6 text-[13px] font-semibold text-white/80">{t('TaxiLine Plus')}</p>
        <h1 className="relative mt-1 max-w-[280px] text-[28px] font-extrabold leading-tight tracking-tight">
          {t('3 ta tarif. Sizga mosini tanlang.')}
        </h1>
        <p className="relative mt-2 max-w-[260px] text-sm leading-snug text-white/80">
          {t('Chegirma, tezkor haydovchi va ustuvor yordam — bitta Plus hisobida.')}
        </p>
      </section>

      <div className="relative z-10 -mt-8 mx-auto max-w-xl space-y-3 px-4 pb-52">
        {PLUS_PLANS.map((plan) => {
          const Icon = ICONS[plan.id]
          const selected = picked === plan.id
          const featured = plan.id === 'plus'
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setPicked(plan.id)
                setDone(false)
              }}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selected
                  ? featured
                    ? 'border-transparent bg-ink text-white shadow-xl shadow-black/15'
                    : 'border-brand bg-white shadow-lg shadow-brand/15 ring-2 ring-brand/20'
                  : 'border-line bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      selected && featured ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="text-lg font-extrabold">{t(plan.name)}</span>
                      {plan.badge ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {t(plan.badge)}
                        </span>
                      ) : null}
                    </span>
                    <span className={`mt-0.5 block text-xs ${selected && featured ? 'text-white/70' : 'text-muted'}`}>
                      {t(plan.tagline)}
                    </span>
                  </span>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-extrabold leading-none">
                    {plan.price ? formatSom(plan.price).replace(/ so'm$/, '') : t('Bepul')}
                  </span>
                  <span className={`mt-1 block text-[10px] font-semibold ${selected && featured ? 'text-white/55' : 'text-muted'}`}>
                    {plan.price ? t('so‘m / oyiga') : 'doimiy'}
                  </span>
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] font-medium leading-snug">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${selected && featured ? 'text-brand' : 'text-brand'}`}
                      strokeWidth={2.6}
                    />
                    <span className={selected && featured ? 'text-white/90' : 'text-ink'}>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-24 z-30 mx-auto w-full max-w-xl border-t border-line bg-white/95 px-4 pb-3 pt-3 backdrop-blur lg:static lg:mt-0 lg:border-0 lg:bg-transparent lg:px-4 lg:pb-8 lg:pt-0 lg:backdrop-blur-none">
        <p className="mb-2 text-center text-xs text-muted">
          {done || active ? t('{0} tarifi hisobingizga biriktirildi', current.name) : t('{0} — xohlagan payt o‘zgartirasiz', current.name)}
        </p>
        <button
          type="button"
          onClick={confirm}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand to-[#ff6b9d] text-[15px] font-extrabold text-white shadow-lg shadow-brand/30"
        >
          {done || active ? t('Faol tarif') : current.price ? t('{0}ga ulanish', current.name) : t('Startni tanlash')}
        </button>
      </div>
    </div>
  )
}
