import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { validate } from '../../middleware/validate.js'
import * as authController from './auth.controller.js'
import { adminLoginSchema, logoutSchema, otpRequestSchema, otpVerifySchema, refreshSchema } from './auth.schema.js'

export const authRouter = Router()

authRouter.post('/otp/request', validate({ body: otpRequestSchema }), asyncRoute(authController.requestOtp))
authRouter.post('/otp/verify', validate({ body: otpVerifySchema }), asyncRoute(authController.verifyOtp))
authRouter.post('/refresh', validate({ body: refreshSchema }), asyncRoute(authController.refresh))
authRouter.post('/logout', validate({ body: logoutSchema }), asyncRoute(authController.logout))

export const adminAuthRouter = Router()
adminAuthRouter.post('/login', validate({ body: adminLoginSchema }), asyncRoute(authController.adminLogin))
