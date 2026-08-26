import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, X } from 'lucide-react'
import { LANGUAGES, findLanguage } from '../../data/languages'
import { useApp } from '../../context/AppContext'
import { FlagGb, FlagRu, FlagUz } from './Flags'

const FLAGS = { uz: FlagUz, ru: FlagRu, en: FlagGb }

export function LanguageFlag({ code, className = 'h-6 w-8' }) {
  const Flag = FLAGS[code] || FlagUz
  return <Flag className={className} />
}

function LanguageSheet({ onClose }) {
  const { language, setLanguage } = useApp()
  const active = findLanguage(language)

  return createPortal(
    <div className="fixed inset-0 z-[11000]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-base font-extrabold">{active.sheetTitle}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-canvas"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {LANGUAGES.map((lang) => {
            const selected = lang.code === active.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code)
                  onClose()
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  selected ? 'bg-brand-soft ring-1 ring-brand/30' : 'bg-canvas'
                }`}
              >
                <LanguageFlag code={lang.code} className="h-7 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{lang.name}</span>
                  <span className="block truncate text-xs text-muted">{lang.native}</span>
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    selected ? 'bg-brand text-white' : 'border border-line'
                  }`}
                >
                  {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function useLanguageSheet() {
  const [open, setOpen] = useState(false)
  return {
    openSheet: () => setOpen(true),
    sheet: open ? <LanguageSheet onClose={() => setOpen(false)} /> : null,
  }
}

// Sidebar/drawer ostidagi ramkali qator.
export function LanguageRow({ className = '' }) {
  const { language } = useApp()
  const { openSheet, sheet } = useLanguageSheet()
  const active = findLanguage(language)

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={`flex w-full items-center gap-3 rounded-2xl border border-line px-3 py-2.5 text-left text-sm ${className}`}
      >
        <LanguageFlag code={active.code} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{active.name}</span>
          <span className="block truncate text-xs text-muted">{active.hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </button>
      {sheet}
    </>
  )
}

// Profil/Sozlamalar ro‘yxatidagi qator.
export function LanguageMenuRow({ className = '' }) {
  const { language } = useApp()
  const { openSheet, sheet } = useLanguageSheet()
  const active = findLanguage(language)

  return (
    <>
      <button type="button" onClick={openSheet} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${className}`}>
        <LanguageFlag code={active.code} className="h-8 w-10" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{active.hint}</span>
          <span className="block truncate text-xs text-muted">{active.name}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {sheet}
    </>
  )
}
