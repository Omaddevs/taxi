import type { Request, Response } from 'express'
import * as driversService from './drivers.service.js'
import type { listApplicationsQuerySchema, listDriversQuerySchema } from './drivers.schema.js'
import type { z } from 'zod'

export async function submitApplication(req: Request, res: Response) {
  const application = await driversService.submitApplication(req.user!.id, req.body)
  res.status(201).json(application)
}

export async function getMyApplication(req: Request, res: Response) {
  const application = await driversService.getMyApplication(req.user!.id)
  res.json(application)
}

export async function setOnlineStatus(req: Request, res: Response) {
  const driver = await driversService.setOnlineStatus(req.user!.id, req.body.online)
  res.json(driver)
}

export async function updateLocation(req: Request, res: Response) {
  const driver = await driversService.updateLocation(req.user!.id, req.body.lat, req.body.lng)
  res.json(driver)
}

export async function getStats(req: Request, res: Response) {
  const stats = await driversService.getStats(req.user!.id)
  res.json(stats)
}

export async function listApplications(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listApplicationsQuerySchema>
  const applications = await driversService.listApplications(query.status)
  res.json(applications)
}

export async function listDrivers(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listDriversQuerySchema>
  const drivers = await driversService.listDrivers(query)
  res.json(drivers)
}

export async function reviewApplication(req: Request, res: Response) {
  const application = await driversService.reviewApplication(
    req.params.id,
    req.user!.id,
    req.body.status,
    req.body.rejectionReason,
  )
  res.json(application)
}
