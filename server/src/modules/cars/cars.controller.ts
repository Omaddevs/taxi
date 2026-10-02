import type { Request, Response } from 'express'
import * as carsService from './cars.service.js'

export async function listCars(_req: Request, res: Response) {
  res.json(await carsService.listCars())
}

export async function listCarsAdmin(_req: Request, res: Response) {
  res.json(await carsService.listCarsWithUsage())
}

export async function createCar(req: Request, res: Response) {
  res.status(201).json(await carsService.createCar(req.body))
}

export async function updateCar(req: Request, res: Response) {
  res.json(await carsService.updateCar(req.params.id, req.body))
}

export async function deleteCar(req: Request, res: Response) {
  await carsService.deleteCar(req.params.id)
  res.status(204).end()
}
