import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CarFront, Check, ChevronDown, FileText, IdCard, Info, ScrollText, Upload, X } from 'lucide-react'
import { CONSENT_INTRO, CONSENT_SECTIONS } from '../../data/consent'
import { lockScroll } from '../../lib/scrollLock'
import { formatFileSize } from '../../lib/uploads'
import { t } from '../../i18n'

// The two extra parts of the "Haydovchi bo‘ling" application form: the applicant's documents
// (uploaded one by one, as soon as they are picked) and the personal-data consent that has to be
// read to the end and accepted before the form can be sent.

const DOCUMENT_SLOTS = [
  { kind: 'PASSPORT', title: 'Pasport yoki ID-karta', icon: IdCard },
  { kind: 'LICENSE', title: 'Haydovchilik guvohnomasi', icon: FileText },
  { kind: 'VEHICLE_DOCS', title: 'Avtomobil hujjatlari', icon: ScrollText },
  { kind: 'VEHICLE_INFO', title: 'Avtomobil ma’lumotlari', icon: CarFront },
]

function DocumentRow({ slot, doc, onPick, onRemove }) {
  const inputRef = useRef(null)
  const Icon = slot.icon
  const status = doc?.status

  return (
    <li className="flex items-center gap-3 rounded-[18px] bg-white p-2.5 pr-2">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
          status === 'done' ? 'bg-emerald-50 text-emerald-600' : status === 'error' ? 'bg-red-50 text-red-500' : 'bg-brand-soft text-brand-dark'
        }`}
      >
        {status === 'done' ? <Check className="h-5 w-5" strokeWidth={2.6} /> : status === 'error' ? <AlertCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" strokeWidth={2.1} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-extrabold leading-tight text-ink">{t(slot.title)}</p>
        {status === 'uploading' ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(doc.progress * 100)}
              aria-label={t(slot.title)}
            >
              <span className="block h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${Math.max(4, doc.progress * 100)}%` }} />
            </span>
            <span className="w-9 shrink-0 text-right text-[11.5px] font-bold tabular-nums text-muted">{Math.round(doc.progress * 100)}%</span>
          </div>
        ) : status === 'error' ? (
          <p className="mt-0.5 truncate text-[12px] font-semibold text-red-500" role="alert">
            {doc.error}
          </p>
        ) : status === 'done' ? (
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {doc.name} · {formatFileSize(doc.size)}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-[12px] text-muted">{t('Fayl tanlanmagan')}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onPick(e.target.files?.[0])
          // Same file picked again after a failure must still fire `change`.
          e.target.value = ''
        }}
      />
      {status === 'uploading' || status === 'done' ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink transition hover:bg-slate-200"
          aria-label={status === 'done' ? t('{0} — faylni olib tashlash', t(slot.title)) : t('{0} — yuklashni bekor qilish', t(slot.title))}
        >
          <X className="h-4 w-4" strokeWidth={2.4} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-extrabold text-white transition hover:bg-black"
          aria-label={t('{0} — fayl yuklash', t(slot.title))}
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={2.6} />
          {status === 'error' ? t('Qayta') : t('Yuklash')}
        </button>
      )}
    </li>
  )
}

/** The four document rows. `uploads` comes from useDocumentUploads(). */
export function DocumentUploads({ uploads }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-[15px] font-extrabold text-ink 2xl:text-[17px]">{t('Hujjatlar')}</legend>
      <p className="mt-1 text-[12.5px] leading-snug text-ink/75 2xl:text-[14px]">{t('Istalgan formatda — rasm, PDF, Word va boshqalar. Har bir fayl 15 MB gacha.')}</p>
      <ul className="mt-3 space-y-2">
        {DOCUMENT_SLOTS.map((slot) => (
          <DocumentRow
            key={slot.kind}
            slot={slot}
            doc={uploads.docs[slot.kind]}
            onPick={(file) => uploads.pick(slot.kind, file)}
            onRemove={() => uploads.remove(slot.kind)}
          />
        ))}
      </ul>
    </fieldset>
  )
}

/**
 * The consent text in a sheet. "Qabul qilaman" unlocks only once the text has been scrolled to
 * its end (or fits without scrolling).
 */
function ConsentSheet({ open, onAccept, onClose }) {
  // Mounted only while open, so "read to the end" starts from scratch every time.
  return open ? <ConsentDialog onAccept={onAccept} onClose={onClose} /> : null
}

function ConsentDialog({ onAccept, onClose }) {
  const boxRef = useRef(null)
  const [readToEnd, setReadToEnd] = useState(false)

  const check = () => {
    const box = boxRef.current
    if (box && box.scrollTop + box.clientHeight >= box.scrollHeight - 12) setReadToEnd(true)
  }

  useEffect(() => {
    const unlock = lockScroll()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // A short text on a tall screen needs no scrolling at all.
    const frame = requestAnimationFrame(check)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      unlock()
    }
    // Once, when the dialog mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-ink/55" aria-label={t('Yopish')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="relative flex max-h-[92svh] w-full flex-col rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(16,42,67,0.25)] sm:max-w-[560px] sm:rounded-[28px] sm:px-7 sm:pb-7 sm:pt-7"
      >
        <span className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden" />
        <span className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <Info className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <h2 id="consent-title" className="mt-4 shrink-0 text-center text-[22px] font-extrabold leading-tight tracking-tight text-ink sm:text-[24px]">
          {t('Shaxsiy ma’lumotlarga rozilik')}
        </h2>
        <p className="mt-1.5 shrink-0 text-center text-[14px] leading-snug text-muted">{t('Davom etish uchun shartlarni oxirigacha o‘qing va qabul qiling')}</p>

        <div className="relative mt-5 min-h-0 flex-1">
          <div
            ref={boxRef}
            onScroll={check}
            tabIndex={0}
            className="h-full max-h-[46svh] overflow-y-auto overscroll-contain rounded-[20px] bg-canvas px-5 py-5 text-[14.5px] leading-[1.6] text-ink/85 outline-none focus-visible:ring-2 focus-visible:ring-brand [-webkit-overflow-scrolling:touch]"
          >
            <p className="font-extrabold uppercase tracking-wide text-ink">{t('Shaxsiy ma’lumotlarni qayta ishlashga rozilik')}</p>
            <p className="mt-3">{t(CONSENT_INTRO)}</p>
            {CONSENT_SECTIONS.map((section) => (
              <section key={section.title} className="mt-5">
                <h3 className="font-extrabold text-ink">{t(section.title)}</h3>
                <p className="mt-1">{t(section.text)}</p>
              </section>
            ))}
          </div>
          {readToEnd ? null : (
            <button
              type="button"
              onClick={() => boxRef.current?.scrollBy({ top: boxRef.current.clientHeight * 0.8, behavior: 'smooth' })}
              className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_18px_rgba(15,29,42,0.35)] transition hover:bg-black"
              aria-label={t('Pastga aylantirish')}
            >
              <ChevronDown className="h-5 w-5" strokeWidth={2.4} />
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={!readToEnd}
          onClick={onAccept}
          className={`mt-5 flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-extrabold transition ${
            readToEnd ? 'bg-brand text-ink shadow-[0_12px_26px_-8px_rgba(0,163,174,0.7)] hover:bg-brand-dark hover:text-white' : 'bg-canvas text-slate-400'
          }`}
        >
          {readToEnd ? (
            <>
              <Check className="h-5 w-5" strokeWidth={2.6} /> {t('Qabul qilaman')}
            </>
          ) : (
            t('Davom etish uchun oxirigacha o‘qing')
          )}
        </button>
        <button type="button" onClick={onClose} className="mt-2 h-11 w-full shrink-0 rounded-full text-[14px] font-bold text-muted transition hover:text-ink">
          {t('Bekor qilish')}
        </button>
      </div>
    </div>,
    document.body,
  )
}

/**
 * The consent line of the form. It can only be ticked through the sheet — by reading the text to
 * the end and accepting it; unticking is immediate.
 */
export function ConsentField({ accepted, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="mt-6 flex items-start gap-3 rounded-[18px] bg-white/25 p-3.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={accepted}
          aria-label={t('Shaxsiy ma’lumotlarimni qayta ishlash va TaxiLine serverida saqlashga roziman')}
          onClick={() => (accepted ? onChange(false) : setOpen(true))}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-2 transition ${
            accepted ? 'border-ink bg-ink text-white' : 'border-ink/50 bg-white text-transparent'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
        <p className="min-w-0 text-[13px] leading-snug text-ink 2xl:text-[14.5px]">
          {t('Shaxsiy ma’lumotlarimni qayta ishlash va TaxiLine serverida saqlashga roziman.')}{' '}
          <button type="button" onClick={() => setOpen(true)} className="font-extrabold underline underline-offset-2">
            {t('Shartlarni o‘qish')}
          </button>
        </p>
      </div>
      <ConsentSheet
        open={open}
        onClose={() => setOpen(false)}
        onAccept={() => {
          onChange(true)
          setOpen(false)
        }}
      />
    </>
  )
}
