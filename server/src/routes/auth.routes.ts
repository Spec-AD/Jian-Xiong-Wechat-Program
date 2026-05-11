import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth'
import { loginValidator } from '../validators/auth.validator'
import { validate } from './index'

const router = Router()

/**
 * 登录接口限流
 * 同一 IP 每分钟最多请求 10 次，防止恶意调用
 * wx.login() 产生的 code 为一次性且有效期短，不影响正常用户
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟窗口
  max: 10, // 每分钟最多 10 次
  message: {
    code: 42900,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Token 校验接口限流（宽松）
 */
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    code: 42900,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * POST /api/auth/login
 * 微信登录（受限流保护）
 * Body: { code: string }
 */
router.post('/login', loginLimiter, loginValidator, validate, authController.login)

/**
 * GET /api/auth/verify
 * 校验 token 有效性（需登录）
 */
router.get('/verify', verifyLimiter, authMiddleware, authController.verify)

export default router
