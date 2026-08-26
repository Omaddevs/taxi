import type { Request, Response } from 'express'
import * as servicesService from './services.service.js'

export async function listActiveServices(_req: Request, res: Response) {
  res.json(await servicesService.listActiveServices())
}

export async function listAllServices(_req: Request, res: Response) {
  res.json(await servicesService.listAllServices())
}

export async function createService(req: Request, res: Response) {
  res.status(201).json(await servicesService.createService(req.body))
}

export async function updateService(req: Request, res: Response) {
  res.json(await servicesService.updateService(req.params.id, req.body))
}
