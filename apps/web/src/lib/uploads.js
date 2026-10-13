import { API_BASE } from './api'
import { t } from '../i18n'

// Same cap as the server (leadDocuments.service.ts) — checked here first so a too-large file is
// refused before any of it is sent.
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024

/** "1.4 MB", "820 KB" */
export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Uploads one applicant document (POST /leads/documents). The file travels as the raw request
 * body; its name and type go in headers. Resolves with `{ token, fileName, size }` — the token is
 * what the application later lists to attach the file. `abort()` cancels the transfer.
 */
export function uploadLeadDocument(file, kind, { onProgress } = {}) {
  const xhr = new XMLHttpRequest()
  const promise = new Promise((resolve, reject) => {
    xhr.open('POST', `${API_BASE}/leads/documents?kind=${encodeURIComponent(kind)}`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
    if (file.type) xhr.setRequestHeader('X-File-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      let body = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* not JSON — handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.token) resolve(body)
      else reject(new Error(body?.error?.message || t('Faylni yuklab bo‘lmadi. Qayta urinib ko‘ring')))
    }
    xhr.onerror = () => reject(new Error(t('Faylni yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring')))
    xhr.onabort = () => reject(Object.assign(new Error('aborted'), { aborted: true }))
    xhr.send(file)
  })
  return { promise, abort: () => xhr.abort() }
}
