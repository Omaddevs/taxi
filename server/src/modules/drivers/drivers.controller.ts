import type { Request, Response } from 'express'
import * as driversService from './drivers.service.js'
import * as applicationsService from './applications.service.js'
import * as ratingsService from '../ratings/ratings.service.js'
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

export async function updateMe(req: Request, res: Response) {
  const driver = await driversService.updateMe(req.user!.id, req.body)
  res.json(driver)
}

export async function getStats(req: Request, res: Response) {
  const stats = await driversService.getStats(req.user!.id)
  res.json(stats)
}

export async function getMyRatings(req: Request, res: Response) {
  res.json(await ratingsService.getDriverRatingDetail(req.user!.id))
}


export async function listDrivers(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listDriversQuerySchema>
  const drivers = await driversService.listDrivers(query)
  res.json(drivers)
}


export async function listLiveDrivers(_req: Request, res: Response) {
  res.json(await driversService.listLiveDrivers())
}

export async function getDriverById(req: Request, res: Response) {
  res.json(await driversService.getDriverById(req.params.id))
}

export async function setApproved(req: Request, res: Response) {
  res.json(await driversService.setApproved(req.params.id, req.body.approved))
}

export async function setGender(req: Request, res: Response) {
  res.json(await driversService.setDriverGender(req.params.id, req.user!.id, req.body.gender))
}

export async function archiveDriver(req: Request, res: Response) {
  res.json(await driversService.archiveDriver(req.params.id, req.user!.id, req.body.reason))
}

export async function restoreDriver(req: Request, res: Response) {
  res.json(await driversService.restoreDriver(req.params.id, req.user!.id))
}

export async function listTopDrivers(_req: Request, res: Response) {
  res.json(await driversService.listTopDrivers())
}

export async function listApplications(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listApplicationsQuerySchema>
  res.json(await applicationsService.listApplications(query))
}

export async function reviewApplication(req: Request, res: Response) {
  res.json(await applicationsService.reviewApplication(req.params.id, req.user!.id, req.body.status, req.body.rejectionReason))
}

export async function updateApplication(req: Request, res: Response) {
  res.json(await applicationsService.updateApplication(req.params.id, req.body, req.user!.id))
}

export async function blockApplication(req: Request, res: Response) {
  res.json(await applicationsService.setApplicationBlocked(req.params.id, req.body.blocked, req.user!.id, req.body.reason))
}

export async function createApplicationAdmin(req: Request, res: Response) {
  res.status(201).json(await applicationsService.createApplication(req.body, req.user!.id))
}

export async function deleteApplication(req: Request, res: Response) {
  await applicationsService.deleteApplication(req.params.id, req.user!.id)
  res.status(204).end()
}
