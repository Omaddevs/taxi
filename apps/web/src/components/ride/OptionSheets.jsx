import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { LUGGAGE } from '../../lib/ride'
import { cn } from '../../lib/utils'
import { Sheet, SheetButton } from './Sheet'
import { t } from '../../i18n'

const LANDMARK_MAX = 200

/** "Mo‘ljal": a note that helps the driver find the passenger at the pickup pin. */
export function LandmarkSheet({ open, onClose, accent, value, onConfirm }) {
  const [text, setText] = useState(value)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setText(value)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Mo‘ljal')}
      footer={
        <SheetButton accent={accent} onClick={() => onConfirm(text.trim())}>
          {t('Saqlash')}
        </SheetButton>
      }
    >
      <p className="mb-3 text-[14px] text-muted">{t('Haydovchi sizni oson topishi uchun yaqin atrofdagi mo‘ljalni yozing.')}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, LANDMARK_MAX))}
        rows={3}
        autoFocus
        placeholder={t('Masalan: universitet darvozasi oldi, 2-kirish')}
        className="w-full resize-none rounded-2xl border border-line bg-canvas px-4 py-3 text-[15px] text-ink outline-none placeholder:text-slate-400 focus:border-brand focus:bg-white"
      />
      <p className="mt-1 text-right text-[12px] tabular-nums text-muted">
        {text.length}/{LANDMARK_MAX}
      </p>
    </Sheet>
  )
}

/** "Bagaj hajmi": picking a size applies it at once. */
export function LuggageSheet({ open, onClose, accent, value, onChange }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('Bagaj hajmi')}>
      <div className="space-y-2.5">
        {LUGGAGE.map((item) => {
          const active = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onChange(item.id)
                onClose()
              }}
              className={cn(
                'block w-full rounded-[18px] border-2 px-4 py-3 text-left transition',
                active ? cn(accent.soft, accent.border) : 'border-line bg-white',
              )}
            >
              <span className="block text-[16px] font-extrabold text-ink">{t(item.title)}</span>
              <span className="block text-[13px] text-muted">{t(item.desc)}</span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/**
 * "So‘rovingiz yuborildi". `result` is the POST /bot-orders/mine response: how many driver chats
 * the request reached, and whether a women-only request is still with female drivers alone.
 */
export function SentSheet({ result, womenOnly, accent, onClose, onDone }) {
  const sent = result?.sent > 0
  const message = !result
    ? ''
    : womenOnly
      ? sent
        ? result.order?.femaleOnly
          ? t('So‘rovingiz avval ayol haydovchilarga yuborildi. 5 daqiqada hech kim qabul qilmasa, barcha haydovchilarga ochiladi.')
          : t('Hozir bu yo‘nalishda bo‘sh ayol haydovchi yo‘q, shuning uchun so‘rovingiz barcha haydovchilarga yuborildi. Qabul qilgan haydovchi siz bilan telefon orqali bog‘lanadi.')
        : t('So‘rovingiz saqlandi — bu yo‘nalishdagi haydovchi qabul qilishi bilan sizga xabar beramiz.')
      : sent
        ? t('Haydovchilar so‘rovingizni oldi. Haydovchi qabul qilishi bilan sizga "Haydovchi topildi" deb xabar beramiz.')
        : t('So‘rovingiz saqlandi va haydovchilar bo‘limida ko‘rinadi. Bu yo‘nalishdagi haydovchi qabul qilishi bilan sizga xabar beramiz.')

  return (
    <Sheet
      open={Boolean(result)}
      onClose={onClose}
      title={t('So‘rovingiz yuborildi')}
      footer={
        <SheetButton accent={accent} onClick={onDone}>
          {t('Safarlarimga o‘tish')}
        </SheetButton>
      }
    >
      <div className="flex flex-col items-center pb-1 pt-2 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
        </span>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{message}</p>
      </div>
    </Sheet>
  )
}
