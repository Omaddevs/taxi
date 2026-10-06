import { Router, type Request, type Response } from 'express'
import type { z } from 'zod'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as newsService from './news.service.js'
import {
  createNewsSchema,
  idParamSchema,
  listPublicNewsQuerySchema,
  slugParamSchema,
  updateNewsSchema,
  imageIdParamSchema,
  uploadImageSchema,
} from './news.schema.js'

export const newsRouter = Router()

newsRouter.get(
  '/',
  validate({ query: listPublicNewsQuerySchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await newsService.listPublic(req.query as unknown as z.infer<typeof listPublicNewsQuerySchema>))
  }),
)
newsRouter.get(
  '/images/:id',
  validate({ params: imageIdParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    const img = await newsService.getImage(req.params.id)
    res.setHeader('Content-Type', img.mime)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(Buffer.from(img.data))
  }),
)
newsRouter.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await newsService.getPublic(req.params.slug))
  }),
)

export const adminNewsRouter = Router()
adminNewsRouter.use(requireAuth, requireRole('ADMIN'))

adminNewsRouter.get(
  '/',
  asyncRoute(async (_req: Request, res: Response) => {
    res.json(await newsService.listAdmin())
  }),
)
adminNewsRouter.post(
  '/images',
  validate({ body: uploadImageSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.status(201).json(await newsService.uploadImage(req.body))
  }),
)
adminNewsRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await newsService.getAdmin(req.params.id))
  }),
)
adminNewsRouter.post(
  '/',
  validate({ body: createNewsSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.status(201).json(await newsService.create(req.body, req.user!.id))
  }),
)
adminNewsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateNewsSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await newsService.update(req.params.id, req.body, req.user!.id))
  }),
)
adminNewsRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    await newsService.remove(req.params.id, req.user!.id)
    res.status(204).end()
  }),
)
