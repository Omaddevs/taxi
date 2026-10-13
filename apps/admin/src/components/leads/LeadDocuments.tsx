import { useState } from 'react'
import { Download, Eye, FileText, Loader2, ShieldCheck } from 'lucide-react'
import { API_BASE, ApiError, api } from '../../lib/api'
import { getAccessToken } from '../../lib/tokens'
import { formatDateTime } from '../../lib/utils'
import type { LeadDocumentRow } from '../../types'

const KIND_LABEL: Record<LeadDocumentRow['kind'], string> = {
  PASSPORT: 'Pasport yoki ID-karta',
  LICENSE: 'Haydovchilik guvohnomasi',
  VEHICLE_DOCS: 'Avtomobil hujjatlari',
  VEHICLE_INFO: 'Avtomobil ma’lumotlari',
}

// What the server will show inline (leads.routes.ts INLINE_MIME); everything else only downloads.
const VIEWABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

function fileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Opens the file in a new tab. It is fetched with the staff token — the URL alone shows nothing. */
async function view(path: string) {
  // Opened before the fetch so the browser still treats it as the click's own window.
  const tab = window.open('', '_blank')
  try {
    const token = getAccessToken()
    const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) throw new ApiError(res.status, 'Hujjatni ochib bo‘lmadi')
    const url = URL.createObjectURL(await res.blob())
    if (tab) tab.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    tab?.close()
    throw err
  }
}

/**
 * An applicant's uploaded documents and the consent they gave. `basePath` is where the files are
 * read from: `/admin/leads/documents` for a lead, `/admin/drivers/applications/documents` for a
 * driver application. `always` shows the block even when there is nothing in it.
 */
export function LeadDocuments({
  documents,
  consentAt,
  consentVersion,
  basePath = '/admin/leads/documents',
  always = false,
}: {
  documents?: LeadDocumentRow[]
  consentAt?: string | null
  consentVersion?: string | null
  basePath?: string
  always?: boolean
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const docs = documents ?? []
  const lead = { consentAt, consentVersion }
  const pathOf = (doc: LeadDocumentRow) => `${basePath}/${doc.id}`
  if (!always && !docs.length && !consentAt) return null

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hujjatni ochib bo‘lmadi')
    } finally {
      setBusy('')
    }
  }

  return (
    <section>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">Hujjatlar{docs.length ? ` · ${docs.length}` : ''}</p>

      {lead.consentAt ? (
        <p className="mb-2 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-snug text-emerald-800">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
          <span>
            Shaxsiy ma’lumotlarni qayta ishlash va saqlashga rozilik bergan: <b>{formatDateTime(lead.consentAt)}</b>
            {lead.consentVersion ? ` (shartlar tahriri: ${lead.consentVersion})` : ''}
          </span>
        </p>
      ) : null}

      {docs.length ? (
        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{KIND_LABEL[doc.kind] ?? doc.kind}</p>
                <p className="truncate text-xs text-muted" title={doc.fileName}>
                  {doc.fileName} · {fileSize(doc.size)}
                </p>
              </div>
              {VIEWABLE.has(doc.mime) ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => run(`view-${doc.id}`, () => view(pathOf(doc)))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink transition hover:bg-slate-200 disabled:opacity-50"
                  aria-label={`${doc.fileName} — ko‘rish`}
                  title="Ko‘rish"
                >
                  {busy === `view-${doc.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                </button>
              ) : null}
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => run(`get-${doc.id}`, () => api.download(pathOf(doc), doc.fileName))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink transition hover:bg-slate-200 disabled:opacity-50"
                aria-label={`${doc.fileName} — yuklab olish`}
                title="Yuklab olish"
              >
                {busy === `get-${doc.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">Hujjat yuklanmagan.</p>
      )}
      {error ? <p className="mt-2 text-xs font-semibold text-red-500">{error}</p> : null}
    </section>
  )
}
