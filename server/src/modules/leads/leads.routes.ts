import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as leadsController from './leads.controller.js'
import {
  contactLeadSchema,
  createLeadSchema,
  documentIdParamSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  uploadDocumentQuerySchema,
  websiteLeadSchema,
} from './leads.schema.js'
import * as leadDocuments from './leadDocuments.service.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import * as leadsService from './leads.service.js'

const staff = ['ADMIN', 'SALES_OPERATOR'] as const

export const adminLeadsRouter = Router()

adminLeadsRouter.get(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ query: listLeadsQuerySchema }),
  asyncRoute(leadsController.listLeads),
)
adminLeadsRouter.post(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ body: createLeadSchema }),
  asyncRoute(leadsController.createLead),
)
adminLeadsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: leadIdParamSchema, body: updateLeadSchema }),
  asyncRoute(leadsController.updateLead),
)
adminLeadsRouter.delete(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: leadIdParamSchema }),
  asyncRoute(leadsController.deleteLead),
)

// A lead's uploaded document, for staff only: operators see their own leads' files, admins all.
adminLeadsRouter.get(
  '/documents/:docId',
  requireAuth,
  requireRole(...staff),
  validate({ params: documentIdParamSchema }),
  asyncRoute(async (req, res) => {
    const scope = req.user!.role === 'ADMIN' ? {} : { ownerId: req.user!.id }
    leadDocuments.sendDocument(res, await leadDocuments.openDocument(req.params.docId, scope))
  }),
)

// Ochiq: landing sahifadagi forma (autentifikatsiyasiz, IP bo‘yicha cheklangan)
export const publicLeadsRouter = Router()
publicLeadsRouter.post(
  '/',
  rateLimit(20, 10 * 60_000),
  validate({ body: websiteLeadSchema }),
  asyncRoute(async (req, res) => {
    res.status(201).json(await leadsService.createWebsiteLead(req.body))
  }),
)

// Ochiq: "Aloqa" sahifasidagi murojaat formasi — har bir xabar "Lidlar"ga alohida tushadi.
publicLeadsRouter.post(
  '/contact',
  rateLimit(10, 10 * 60_000),
  validate({ body: contactLeadSchema }),
  asyncRoute(async (req, res) => {
    res.status(201).json(await leadsService.createContactLead(req.body))
  }),
)

// Ochiq: arizaga ilova qilinadigan hujjatni yuklash. Fayl so‘rov tanasida xom holda keladi
// (Content-Type: application/octet-stream), nomi va turi sarlavhalarda: X-File-Name (URI-kodlangan)
// va X-File-Type. Javobdagi `token` keyin POST /leads dagi `documents` ro‘yxatiga qo‘yiladi.
// One application takes at most MAX_DOCUMENTS_PER_LEAD (8) files of up to 15 MB: room for a
// retry or two per IP, and a daily cap so the upload disk can't be filled from one address.
publicLeadsRouter.post(
  '/documents',
  rateLimit(16, 10 * 60_000),
  rateLimit(40, 24 * 60 * 60_000),
  validate({ query: uploadDocumentQuerySchema }),
  asyncRoute(async (req, res) => {
    leadDocuments.assertDocumentSize(req.headers['content-length'])
    const { kind } = req.query as unknown as { kind: leadDocuments.DocumentKind }
    const header = (name: string) => {
      const value = req.headers[name]
      return Array.isArray(value) ? value[0] : value
    }
    res.status(201).json(await leadDocuments.saveDocument(req, { kind, fileName: header('x-file-name'), mime: header('x-file-type') }))
  }),
)
