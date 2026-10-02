import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export async function writeAudit(input: {
  actorId?: string | null
  action: string
  targetType: string
  targetId?: string | null
  meta?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? undefined,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? undefined,
      meta: (input.meta as Prisma.InputJsonValue) ?? undefined,
    },
  })
}
