import type { LeadChannel, LeadStatus, LeadType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { normalizePhone } from '../../lib/otp.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import type { JwtRole } from '../../lib/jwt.js'
import { attachDocuments, removeOwnerFiles } from './leadDocuments.service.js'
import { submitWebsiteApplication } from '../drivers/applications.service.js'

const LEAD_INCLUDE = {
  owner: { select: { id: true, name: true, phone: true } },
  // What the applicant uploaded — metadata only; the bytes are read through /admin/leads/documents/:docId.
  documents: {
    select: { id: true, kind: true, fileName: true, mime: true, size: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
}

function scopeWhere(actorRole: JwtRole, actorId: string) {
  return actorRole === 'ADMIN' ? {} : { ownerId: actorId }
}

export async function listLeads(
  actorRole: JwtRole,
  actorId: string,
  filter: { status?: LeadStatus; leadType?: LeadType; channel?: LeadChannel; q?: string; dueOnly?: boolean },
) {
  return prisma.lead.findMany({
    where: {
      ...scopeWhere(actorRole, actorId),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.leadType ? { leadType: filter.leadType } : {}),
      ...(filter.channel ? { channel: filter.channel } : {}),
      ...(filter.dueOnly ? { followUpAt: { lte: new Date() }, status: { notIn: ['CONVERTED', 'LOST'] } } : {}),
      ...(filter.q
        ? { OR: [{ name: { contains: filter.q, mode: 'insensitive' as const } }, { phone: { contains: filter.q } }] }
        : {}),
    },
    orderBy: [{ followUpAt: 'asc' }, { createdAt: 'desc' }],
    take: 300,
    include: LEAD_INCLUDE,
  })
}

export async function createLead(
  actorRole: JwtRole,
  actorId: string,
  input: {
    name?: string
    phone: string
    source?: string
    note?: string
    followUpAt?: string
    ownerId?: string
    leadType?: LeadType
  },
) {
  const ownerId = actorRole === 'ADMIN' && input.ownerId ? input.ownerId : actorId
  return prisma.lead.create({
    data: {
      name: input.name,
      phone: normalizePhone(input.phone),
      source: input.source,
      note: input.note,
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : undefined,
      ownerId,
      leadType: input.leadType,
      channel: 'MANUAL',
    },
    include: LEAD_INCLUDE,
  })
}

// Load-balanced assignment for auto-captured leads (Instagram DM / Lead Ads): the active SALES
// operator with the fewest currently-open leads gets the next one, so leads spread out evenly
// without needing a separate rotation cursor. Falls back to an active ADMIN if no SALES staff
// exist yet, since a lead still needs an owner to satisfy Lead.ownerId.
export async function pickLeadOwner(): Promise<string> {
  const salesStaff = await prisma.user.findMany({
    where: { staffKind: 'SALES', staffActive: true },
    select: { id: true, _count: { select: { leads: { where: { status: { notIn: ['CONVERTED', 'LOST'] } } } } } },
  })
  if (salesStaff.length) {
    salesStaff.sort((a, b) => a._count.leads - b._count.leads)
    return salesStaff[0].id
  }
  const admin = await prisma.user.findFirst({ where: { staffKind: 'ADMIN', staffActive: true }, select: { id: true } })
  if (!admin) throw new Error('No active staff available to assign the lead to')
  return admin.id
}

async function ownedLead(id: string, actorRole: JwtRole, actorId: string) {
  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) throw new NotFoundError('Lid topilmadi')
  if (actorRole !== 'ADMIN' && lead.ownerId !== actorId) throw new ForbiddenError('Bu lid sizga tegishli emas')
  return lead
}

export async function updateLead(
  id: string,
  actorRole: JwtRole,
  actorId: string,
  patch: {
    name?: string
    phone?: string
    source?: string
    note?: string
    followUpAt?: string | null
    status?: LeadStatus
    leadType?: LeadType
  },
) {
  const lead = await ownedLead(id, actorRole, actorId)

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone ? { phone: normalizePhone(patch.phone) } : {}),
      ...(patch.source !== undefined ? { source: patch.source } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.followUpAt !== undefined ? { followUpAt: patch.followUpAt ? new Date(patch.followUpAt) : null } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.leadType ? { leadType: patch.leadType } : {}),
    },
    include: LEAD_INCLUDE,
  })

  // Crediting a converted lead as a KPI win only makes sense for sales operators — an admin
  // reassigning/converting leads on someone else's behalf shouldn't inflate a non-sales owner's
  // activity log.
  if (patch.status === 'CONVERTED' && lead.status !== 'CONVERTED') {
    const owner = await prisma.user.findUnique({ where: { id: lead.ownerId }, select: { staffKind: true } })
    if (owner?.staffKind === 'SALES') {
      await prisma.operatorActivity.create({
        data: {
          operatorId: lead.ownerId,
          kind: 'NEW_USER',
          title: `Lid mijozga aylandi: ${lead.name || lead.phone}`,
          refId: lead.id,
        },
      })
    }
  }

  return updated
}

export async function deleteLead(id: string, actorRole: JwtRole, actorId: string) {
  await ownedLead(id, actorRole, actorId)
  await removeOwnerFiles({ leadId: id })
  await prisma.lead.delete({ where: { id } })
}

const ACTIVITY_LABEL = { driver: 'Haydovchi', passenger: 'Yo‘lovchi' } as const

// Sayt formasidan kelgan ariza: navbatdagi sotuv operatoriga biriktiriladi va darhol "qo‘ng‘iroq
// qilish kerak" ro‘yxatiga tushadi. Bir raqamdan ochiq ariza bo‘lsa, yangisi ochilmaydi —
// mavjudi yangilanadi (takroriy bosish yoki qayta yuborishda ro‘yxat to‘lib ketmasligi uchun).
export async function createWebsiteLead(input: {
  name: string
  phone: string
  city?: string
  activity: keyof typeof ACTIVITY_LABEL
  fromRegion?: string
  toRegion?: string
  documents?: string[]
  consent?: boolean
  consentVersion?: string
}) {
  const phone = normalizePhone(input.phone)
  if (!/^\+998\d{9}$/.test(phone)) throw new ValidationError('Telefon raqami +998 XX XXX XX XX formatida bo‘lishi kerak')
  const tokens = input.documents ?? []
  // Documents are personal data: we only keep them for someone who agreed to that.
  if (tokens.length && !input.consent) {
    throw new ValidationError('Hujjatlarni yuborish uchun shaxsiy ma’lumotlarni qayta ishlashga rozilik bering')
  }
  const consent = input.consent ? { consentAt: new Date(), consentVersion: input.consentVersion ?? null } : {}

  // A driver's application belongs in "Haydovchi arizalari", where staff review the documents and
  // approve, block or delete it — not in the sales leads list.
  if (input.activity === 'driver') {
    return submitWebsiteApplication({ fullName: input.name, phone, fromRegion: input.fromRegion, toRegion: input.toRegion, tokens, ...consent })
  }
  const leadType: LeadType = input.activity === 'passenger' ? 'PASSENGER' : 'DRIVER'
  const route = input.fromRegion || input.toRegion ? `Yo‘nalish: ${input.fromRegion || '—'} → ${input.toRegion || '—'}` : null
  const note = [`Faoliyat: ${ACTIVITY_LABEL[input.activity]}`, input.city ? `Shahar: ${input.city}` : null, route].filter(Boolean).join(' · ')
  const source = 'Sayt: “Haydovchi bo‘ling” formasi'

  const open = await prisma.lead.findFirst({
    where: { phone, channel: 'WEBSITE', status: { notIn: ['CONVERTED', 'LOST'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (open) {
    await prisma.lead.update({
      where: { id: open.id },
      data: { name: input.name, note, leadType, followUpAt: new Date(), ...consent },
    })
    return { ok: true, duplicate: true, documents: await attachDocuments({ leadId: open.id }, tokens) }
  }

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      phone,
      source,
      note,
      leadType,
      channel: 'WEBSITE',
      ownerId: await pickLeadOwner(),
      followUpAt: new Date(),
      ...consent,
    },
  })
  return { ok: true, duplicate: false, documents: await attachDocuments({ leadId: lead.id }, tokens) }
}

// "Aloqa" sahifasidan kelgan murojaat. Arizadan farqli o‘laroq, bu yerda takror birlashtirilmaydi:
// har bir xabarning o‘z matni bor, shuning uchun har biri alohida lid bo‘lib tushadi.
export async function createContactLead(input: { name: string; phone: string; message: string }) {
  const phone = normalizePhone(input.phone)
  if (!/^\+998\d{9}$/.test(phone)) throw new ValidationError('Telefon raqami +998 XX XXX XX XX formatida bo‘lishi kerak')

  await prisma.lead.create({
    data: {
      name: input.name,
      phone,
      source: 'Sayt: Aloqa sahifasi',
      note: input.message,
      channel: 'WEBSITE',
      ownerId: await pickLeadOwner(),
      followUpAt: new Date(),
    },
  })
  return { ok: true }
}
