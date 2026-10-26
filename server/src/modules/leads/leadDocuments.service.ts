import { randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, stat, statfs, unlink } from 'node:fs/promises'
import path from 'node:path'
import { Transform, type Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { Prisma } from '@prisma/client'
import type { Response } from 'express'
import { env } from '../../config/env.js'
import { AppError, NotFoundError, ServiceUnavailableError, ValidationError } from '../../errors/AppError.js'
import { prisma } from '../../lib/prisma.js'

// Documents an applicant attaches to the "Haydovchi bo‘ling" form (passport, licence, car papers).
// They are private: the bytes live on disk under UPLOAD_DIR — never in a web-served folder — and
// only staff can read them back, through an authenticated endpoint.
//
// Upload and application are two steps. A file is uploaded first and the uploader gets back a
// random token; the application then lists the tokens it wants attached. Until then the row has
// no owner, and uploads nobody claimed within a day are deleted. A driver's application owns its
// files through `applicationId` ("Haydovchi arizalari"); any other website lead through `leadId`.

export const DOCUMENT_KINDS = ['PASSPORT', 'LICENSE', 'VEHICLE_DOCS', 'VEHICLE_INFO'] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
export const MAX_DOCUMENTS_PER_LEAD = 8
const TOO_LARGE = 'Fayl hajmi 15 MB dan oshmasligi kerak'
const UNCLAIMED_TTL_MS = 24 * 60 * 60 * 1000
// Per-IP caps don't stop many addresses at once; these bound what anonymous uploads can take overall.
const MAX_UNCLAIMED_BYTES = 2 * 1024 * 1024 * 1024
const MIN_FREE_DISK_BYTES = 5 * 1024 * 1024 * 1024
const BUSY = 'Hozir fayl qabul qilib bo‘lmaydi. Birozdan so‘ng qayta urinib ko‘ring'

const DIR = path.resolve(env.UPLOAD_DIR, 'lead-documents')
const fileOf = (storageKey: string) => path.join(DIR, storageKey)

// Shown back to staff as-is, so keep it a plain name: no path, no control characters.
function cleanFileName(raw: string | undefined) {
  let name = raw ?? ''
  try {
    name = decodeURIComponent(name)
  } catch {
    /* not URI-encoded — use as sent */
  }
  name = name
    .replace(/\p{Cc}/gu, '')
    .replace(/[\\/]/g, '_')
    .trim()
    .slice(0, 180)
  return name || 'fayl'
}

function cleanMime(raw: string | undefined) {
  const mime = (raw ?? '').trim().toLowerCase()
  return /^[a-z0-9.+-]{1,60}\/[a-z0-9.+-]{1,60}$/.test(mime) ? mime : 'application/octet-stream'
}

export function assertDocumentSize(contentLength: string | undefined) {
  const declared = Number(contentLength)
  if (Number.isFinite(declared) && declared > MAX_DOCUMENT_BYTES) throw new ValidationError(TOO_LARGE)
}

async function assertRoomForUpload() {
  const unclaimed = await prisma.leadDocument.aggregate({ where: { leadId: null, applicationId: null }, _sum: { size: true } })
  if ((unclaimed._sum.size ?? 0) + MAX_DOCUMENT_BYTES > MAX_UNCLAIMED_BYTES) throw new ServiceUnavailableError(BUSY)
  const disk = await statfs(DIR).catch(() => null)
  if (disk && disk.bavail * disk.bsize < MIN_FREE_DISK_BYTES) throw new ServiceUnavailableError(BUSY)
}

/** Streams an upload to disk and records it. Returns the token that later attaches it to a lead. */
export async function saveDocument(body: Readable, meta: { kind: DocumentKind; fileName?: string; mime?: string }) {
  await mkdir(DIR, { recursive: true })
  await assertRoomForUpload()
  const storageKey = randomBytes(16).toString('hex')
  const file = fileOf(storageKey)

  let size = 0
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      size += chunk.length
      done(size > MAX_DOCUMENT_BYTES ? new ValidationError(TOO_LARGE) : null, chunk)
    },
  })
  try {
    await pipeline(body, limit, createWriteStream(file, { flags: 'wx' }))
    if (size === 0) throw new ValidationError('Fayl bo‘sh — boshqasini tanlang')
  } catch (err) {
    await unlink(file).catch(() => {})
    throw err instanceof AppError ? err : new ValidationError('Faylni yuklab bo‘lmadi. Qayta urinib ko‘ring')
  }

  const fileName = cleanFileName(meta.fileName)
  const uploadToken = randomBytes(24).toString('hex')
  await prisma.leadDocument.create({
    data: { kind: meta.kind, fileName, mime: cleanMime(meta.mime), size, storageKey, uploadToken },
  })
  // Housekeeping rides along with uploads; it must never fail one.
  void purgeUnclaimed().catch(() => {})
  return { token: uploadToken, kind: meta.kind, fileName, size }
}

type Owner = { leadId: string } | { applicationId: string }

/** Attaches uploaded-but-unclaimed documents to their owner. Unknown or already-used tokens are ignored. */
export async function attachDocuments(owner: Owner, tokens: string[]) {
  if (!tokens.length) return 0
  const { count } = await prisma.leadDocument.updateMany({
    where: { uploadToken: { in: tokens }, leadId: null, applicationId: null },
    data: owner,
  })
  return count
}

async function open(where: Prisma.LeadDocumentWhereInput) {
  const doc = await prisma.leadDocument.findFirst({ where })
  if (!doc) throw new NotFoundError('Hujjat topilmadi')
  const file = fileOf(doc.storageKey)
  if (!(await stat(file).catch(() => null))) throw new NotFoundError('Hujjat fayli serverda topilmadi')
  return { doc, stream: createReadStream(file) }
}

/** A lead's document; `ownerId` narrows it to one operator's own leads. */
export function openDocument(id: string, scope: { ownerId?: string }) {
  return open({ id, lead: scope.ownerId ? { ownerId: scope.ownerId } : { isNot: null } })
}

/** A driver application's document. */
export function openApplicationDocument(id: string) {
  return open({ id, application: { isNot: null } })
}

// Only images and PDFs are shown in the browser; anything else is forced to download, and nothing
// is ever sniffed into a different type.
const INLINE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])

/** Streams an opened document to staff — never cached, never served from a public path. */
export function sendDocument(res: Response, { doc, stream }: Awaited<ReturnType<typeof open>>) {
  const inline = INLINE_MIME.has(doc.mime)
  res.setHeader('Content-Type', inline ? doc.mime : 'application/octet-stream')
  res.setHeader('Content-Length', String(doc.size))
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

async function removeFiles(storageKeys: string[]) {
  await Promise.all(storageKeys.map((key) => unlink(fileOf(key)).catch(() => {})))
}

/** Call before deleting the owner: its document rows cascade away, the files on disk would not. */
export async function removeOwnerFiles(owner: Owner) {
  const docs = await prisma.leadDocument.findMany({ where: owner, select: { storageKey: true } })
  await removeFiles(docs.map((d) => d.storageKey))
}

export async function purgeUnclaimed() {
  const stale = await prisma.leadDocument.findMany({
    where: { leadId: null, applicationId: null, createdAt: { lt: new Date(Date.now() - UNCLAIMED_TTL_MS) } },
    select: { id: true, storageKey: true },
    take: 200,
  })
  if (!stale.length) return 0
  await removeFiles(stale.map((d) => d.storageKey))
  await prisma.leadDocument.deleteMany({ where: { id: { in: stale.map((d) => d.id) } } })
  return stale.length
}
