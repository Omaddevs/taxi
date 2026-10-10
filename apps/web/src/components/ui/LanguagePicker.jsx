import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react'
import { LANGUAGES, findLanguage } from '../../data/languages'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { getAccessToken } from '../../lib/tokens'
import { FlagGb, FlagRu, FlagUz } from './Flags'
import { lockScroll } from '../../lib/scrollLock'

const FLAGS = { uz: FlagUz, ru: FlagRu, en: FlagGb }

export function LanguageFlag({ code, className = 'h-6 w-8' }) {
  const Flag = FLAGS[code] || FlagUz
  return <Flag className={className} />
}

function useChooseLanguage() {
  const { language, setLanguage } = useApp()
  return {
    active: findLanguage(language),
    choose(code) {
      setLanguage(code)
      if (getAccessToken()) {
        api.patch('/users/me', { language: code }).catch(() => {})
      }
    },
  }
}

// sm (640px) va undan katta ekranlarda ochiladigan menyu, kichiklarida pastki panel ishlatiladi.
function useIsDesktop() {
  const query = '(min-width: 640px)'
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatch(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return match
}

function OptionRow({ lang, selected, highlighted, compact, ...props }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`flex w-full items-center gap-3 rounded-2xl text-left transition-colors ${compact ? 'px-2.5 py-2' : 'px-3 py-3'} ${
        selected ? 'bg-brand-soft' : highlighted ? 'bg-canvas' : 'hover:bg-canvas'
      }`}
      {...props}
    >
      <LanguageFlag code={lang.code} className={`shrink-0 overflow-hidden rounded-[4px] ring-1 ring-black/5 ${compact ? 'h-5 w-7' : 'h-7 w-9'}`} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-bold text-ink ${compact ? 'text-[14px]' : 'text-[15px]'}`}>{lang.name}</span>
        <span className="block truncate text-[12px] text-muted">{lang.native}</span>
      </span>
      <Check className={`h-[18px] w-[18px] shrink-0 text-brand-dark transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={2.6} />
    </button>
  )
}

/* Telefon: pastdan chiqadigan panel · planshet/kompyuter: markazdagi ixcham oyna */
function LanguageSheet({ onClose }) {
  const { active, choose } = useChooseLanguage()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const unlock = lockScroll()
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Yopish"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lang-sheet-title"
        className={`relative w-full max-w-lg rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(15,29,42,0.18)] transition duration-300 ease-[cubic-bezier(.22,.8,.3,1)] sm:max-w-[400px] sm:rounded-[28px] sm:px-5 sm:pb-5 sm:pt-5 sm:shadow-[0_30px_70px_-15px_rgba(15,29,42,0.35)] ${
          shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-100 sm:translate-y-2 sm:scale-[0.97] sm:opacity-0'
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center gap-3">
          <p id="lang-sheet-title" className="min-w-0 flex-1 truncate text-[17px] font-extrabold text-ink">
            {active.sheetTitle}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink transition hover:bg-line"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div role="listbox" aria-label={active.sheetTitle} className="mt-3 space-y-1.5">
          {LANGUAGES.map((lang) => (
            <OptionRow
              key={lang.code}
              lang={lang}
              selected={lang.code === active.code}
              onClick={() => {
                choose(lang.code)
                onClose()
              }}
            />
          ))}
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

/* Tugma ostida ochiladigan til menyusi (planshet/kompyuter). */
function LanguageMenu({ onClose, anchorRef }) {
  const { active, choose } = useChooseLanguage()
  const [hi, setHi] = useState(() => Math.max(0, LANGUAGES.findIndex((l) => l.code === active.code)))
  const menuRef = useRef(null)

  useEffect(() => {
    menuRef.current?.focus()
    function onDown(e) {
      if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [onClose, anchorRef])

  function pick(i) {
    choose(LANGUAGES[i].code)
    onClose()
    anchorRef.current?.focus()
  }

  function onKeyDown(e) {
    const last = LANGUAGES.length - 1
    if (e.key === 'ArrowDown') setHi((h) => (h >= last ? 0 : h + 1))
    else if (e.key === 'ArrowUp') setHi((h) => (h <= 0 ? last : h - 1))
    else if (e.key === 'Home') setHi(0)
    else if (e.key === 'End') setHi(last)
    else if (e.key === 'Enter' || e.key === ' ') pick(hi)
    else if (e.key === 'Escape' || e.key === 'Tab') {
      onClose()
      if (e.key === 'Escape') anchorRef.current?.focus()
      return
    } else return
    e.preventDefault()
  }

  return (
    <div
      ref={menuRef}
      role="listbox"
      tabIndex={-1}
      aria-label={active.sheetTitle}
      aria-activedescendant={`lang-opt-${LANGUAGES[hi].code}`}
      onKeyDown={onKeyDown}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right animate-[lang-pop_.16s_ease-out] rounded-[20px] bg-white p-1.5 shadow-[0_24px_48px_-12px_rgba(15,29,42,0.3)] outline-none ring-1 ring-black/5"
    >
      <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{active.sheetTitle}</p>
      {LANGUAGES.map((lang, i) => (
        <OptionRow
          key={lang.code}
          id={`lang-opt-${lang.code}`}
          lang={lang}
          compact
          tabIndex={-1}
          selected={lang.code === active.code}
          highlighted={i === hi}
          onPointerEnter={() => setHi(i)}
          onClick={() => pick(i)}
        />
      ))}
    </div>
  )
}

export function LanguageChip({ className = '' }) {
  const { active } = useChooseLanguage()
  const isDesktop = useIsDesktop()
  const { openSheet, sheet } = useLanguageSheet()
  const [menuOpen, setMenuOpen] = useState(false)
  const btnRef = useRef(null)

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (isDesktop ? setMenuOpen((v) => !v) : openSheet())}
        aria-haspopup={isDesktop ? 'listbox' : 'dialog'}
        aria-expanded={isDesktop ? menuOpen : undefined}
        aria-label={`Til: ${active.name}`}
        className={`inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-2 pr-2.5 text-xs font-bold text-ink shadow-[0_2px_8px_rgba(15,29,42,0.08)] ring-1 ring-black/5 transition hover:shadow-[0_4px_14px_rgba(15,29,42,0.12)] ${
          menuOpen ? 'ring-brand/40' : ''
        } ${className}`}
      >
        <LanguageFlag code={active.code} className="h-3.5 w-5 overflow-hidden rounded-[3px] ring-1 ring-black/5" />
        {active.name}
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
      </button>
      {menuOpen && isDesktop ? <LanguageMenu anchorRef={btnRef} onClose={() => setMenuOpen(false)} /> : null}
      {sheet}
    </div>
  )
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
