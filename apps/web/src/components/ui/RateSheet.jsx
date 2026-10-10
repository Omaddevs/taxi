import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Star, X } from 'lucide-react'
import { t } from '../../i18n'

function RateSheet({ title, subtitle, tagOptions, onSubmit, onClose }) {
  const [stars, setStars] = useState(0)
  const [hoverStars, setHoverStars] = useState(0)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const toggleTag = (tag) => setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))

  async function submit() {
    if (stars < 1 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ stars, tags, comment: comment.trim() || undefined })
      onClose()
    } catch {
      setError(t('Xatolik yuz berdi, qaytadan urinib ko‘ring'))
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[11000]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label={t('Yopish')} onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold">{t(title)}</p>
            {subtitle ? <p className="truncate text-xs text-muted">{t(subtitle)}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-canvas"
            aria-label={t('Yopish')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHoverStars(n)}
              onMouseLeave={() => setHoverStars(0)}
              className="p-1"
              aria-label={`${n} yulduz`}
            >
              <Star
                className={`h-9 w-9 ${
                  (hoverStars || stars) >= n ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'
                }`}
              />
            </button>
          ))}
        </div>

        {tagOptions?.length ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  tags.includes(tag) ? 'bg-brand text-white' : 'bg-canvas text-ink'
                }`}
              >
                {t(tag)}
              </button>
            ))}
          </div>
        ) : null}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('Izoh qoldiring (ixtiyoriy)')}
          rows={2}
          maxLength={500}
          className="mt-4 w-full resize-none rounded-2xl border border-line bg-canvas p-3 text-sm outline-none"
        />

        {error ? <p className="mt-2 text-xs font-semibold text-red-500">{t(error)}</p> : null}

        <button
          type="button"
          disabled={stars < 1 || submitting}
          onClick={submit}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
        >
          {submitting ? t('Yuborilmoqda…') : t('Yuborish')}
        </button>
      </div>
    </div>,
    document.body,
  )
}

// Mirrors useShare()'s {trigger, sheet} shape: openRating({title, subtitle, tagOptions,
// onSubmit}) opens the sheet; onSubmit receives {stars, tags, comment} and should throw on
// failure so the sheet can show an inline error instead of silently closing.
export function useRateSheet() {
  const [payload, setPayload] = useState(null)

  const openRating = useCallback((opts) => setPayload(opts), [])
  const closeRating = useCallback(() => setPayload(null), [])

  const sheet = payload ? <RateSheet {...payload} onClose={closeRating} /> : null
  return { openRating, sheet }
}
