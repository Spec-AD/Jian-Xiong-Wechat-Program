import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth'
import { loginValidator } from '../validators/auth.validator'
import { validate } from './index'

const router = Router()

/**
 * POST /api/auth/login
 * 微信登录
 * Body: { code: string }
 */
router.post('/login', loginValidator, validate, authController.login)

/**
 * GET /api/auth/verify
 * 校验 token 有效性（需登录）
 */
router.get('/verify', authMiddleware, authController.verify)

export default router
