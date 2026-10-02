import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const first = err.issues[0]
    const message = first?.message && first.message !== 'Required' ? first.message : 'Ma’lumotlar noto‘g‘ri kiritilgan'
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message, details: err.flatten() },
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    })
    return
  }

  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } })
}
