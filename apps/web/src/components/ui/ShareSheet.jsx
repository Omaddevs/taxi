import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, MessageSquare, Send, Share2, X } from 'lucide-react'
import { t } from '../../i18n'

function ShareSheet({ title, text, url, onClose }) {
  const [copied, setCopied] = useState(false)
  const body = encodeURIComponent(text)
  const link = encodeURIComponent(url || text)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      return
    } catch {
      // Clipboard API yopiq bo‘lsa, matnni tanlab beramiz — foydalanuvchi o‘zi nusxalaydi.
    }
    const area = document.getElementById('share-sheet-text')
    if (area) {
      area.focus()
      area.select()
      try {
        setCopied(document.execCommand('copy'))
      } catch {
        setCopied(false)
      }
    }
  }

  const apps = [
    { id: 'tg', label: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${link}&text=${body}` },
    { id: 'wa', label: 'WhatsApp', icon: Share2, href: `https://wa.me/?text=${body}` },
    { id: 'sms', label: 'SMS', icon: MessageSquare, href: `sms:?body=${body}` },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[11000]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label={t('Yopish')} onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{t('Ulashish')}</p>
            <p className="truncate text-xs text-muted">{t(title)}</p>
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

        <div className="mt-4 grid grid-cols-4 gap-2">
          {apps.map((app) => (
            <a
              key={app.id}
              href={app.href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl bg-canvas py-3 text-[11px] font-semibold"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <app.icon className="h-4 w-4" />
              </span>
              {t(app.label)}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="flex flex-col items-center gap-2 rounded-2xl bg-canvas py-3 text-[11px] font-semibold"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                copied ? 'bg-success/15 text-success' : 'bg-brand-soft text-brand'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </span>
            {copied ? t('Nusxalandi') : t('Nusxalash')}
          </button>
        </div>

        <textarea
          id="share-sheet-text"
          readOnly
          value={text}
          rows={3}
          className="mt-3 w-full resize-none rounded-2xl border border-line bg-canvas p-3 text-xs text-muted outline-none"
        />
      </div>
    </div>,
    document.body,
  )
}

export function useShare() {
  const [payload, setPayload] = useState(null)

  const share = useCallback(async ({ title, text, url }) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }
    } catch {
      return
    }
    setPayload({ title, text, url })
  }, [])

  const sheet = payload ? <ShareSheet {...payload} onClose={() => setPayload(null)} /> : null
  return { share, sheet }
}
