import { Router, type Request, type Response } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as service from './savedPlaces.service.js'
import { placeIdParamSchema, savePlaceSchema, updatePlaceSchema } from './savedPlaces.schema.js'

// The signed-in user's own saved addresses.
export const savedPlacesRouter = Router()

savedPlacesRouter.use(requireAuth)

savedPlacesRouter.get(
  '/',
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.list(req.user!.id))
  }),
)
savedPlacesRouter.post(
  '/',
  validate({ body: savePlaceSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.status(201).json(await service.save(req.user!.id, req.body))
  }),
)
savedPlacesRouter.patch(
  '/:id',
  validate({ params: placeIdParamSchema, body: updatePlaceSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.update(req.user!.id, req.params.id, req.body))
  }),
)
savedPlacesRouter.delete(
  '/:id',
  validate({ params: placeIdParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.remove(req.user!.id, req.params.id))
  }),
)
