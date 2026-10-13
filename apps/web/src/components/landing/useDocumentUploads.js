import { useEffect, useRef, useState } from 'react'
import { MAX_DOCUMENT_BYTES, uploadLeadDocument } from '../../lib/uploads'
import { t } from '../../i18n'

/**
 * Upload state for the form: `docs` is `{ [kind]: { status: 'uploading' | 'done' | 'error', name,
 * size, progress, token, error } }`. Picking a file starts its upload at once; `tokens` are the
 * finished ones, ready to go into the application.
 */
export function useDocumentUploads() {
  const [docs, setDocs] = useState({})
  const transfers = useRef({})

  // Leaving the page mid-upload: stop the transfers.
  useEffect(() => {
    const running = transfers.current
    return () => Object.values(running).forEach((transfer) => transfer.abort())
  }, [])

  const patch = (kind, next) => setDocs((cur) => ({ ...cur, [kind]: { ...cur[kind], ...next } }))

  function remove(kind) {
    transfers.current[kind]?.abort()
    delete transfers.current[kind]
    setDocs((cur) => {
      const rest = { ...cur }
      delete rest[kind]
      return rest
    })
  }

  function pick(kind, file) {
    if (!file) return
    transfers.current[kind]?.abort()
    const base = { name: file.name, size: file.size, token: null, error: '', progress: 0 }
    if (file.size === 0) return setDocs((cur) => ({ ...cur, [kind]: { ...base, status: 'error', error: t('Fayl bo‘sh — boshqasini tanlang') } }))
    if (file.size > MAX_DOCUMENT_BYTES) {
      return setDocs((cur) => ({ ...cur, [kind]: { ...base, status: 'error', error: t('Fayl hajmi 15 MB dan oshmasligi kerak') } }))
    }
    setDocs((cur) => ({ ...cur, [kind]: { ...base, status: 'uploading' } }))
    const transfer = uploadLeadDocument(file, kind, { onProgress: (progress) => patch(kind, { progress }) })
    transfers.current[kind] = transfer
    transfer.promise
      .then((saved) => patch(kind, { status: 'done', token: saved.token, progress: 1 }))
      .catch((err) => {
        if (!err.aborted) patch(kind, { status: 'error', error: err.message })
      })
      .finally(() => {
        if (transfers.current[kind] === transfer) delete transfers.current[kind]
      })
  }

  const list = Object.values(docs)
  return {
    docs,
    pick,
    remove,
    reset: () => Object.keys(docs).forEach(remove),
    uploading: list.some((d) => d.status === 'uploading'),
    tokens: list.filter((d) => d.status === 'done').map((d) => d.token),
  }
}
