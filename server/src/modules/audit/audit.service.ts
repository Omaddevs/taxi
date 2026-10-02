import { prisma } from '../../lib/prisma.js'

export async function listAudit(filter: { q?: string; action?: string; take?: number }) {
  return prisma.auditLog.findMany({
    where: {
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.q
        ? {
            OR: [
              { targetId: { contains: filter.q } },
              { action: { contains: filter.q, mode: 'insensitive' as const } },
              { actor: { is: { name: { contains: filter.q, mode: 'insensitive' as const } } } },
              { actor: { is: { phone: { contains: filter.q } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: filter.take ?? 100,
    include: { actor: { select: { id: true, name: true, phone: true } } },
  })
}
