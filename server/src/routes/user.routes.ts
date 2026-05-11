import { Router } from 'express'
import * as userController from '../controllers/user.controller'
import { authMiddleware } from '../middleware/auth'
import { updateProfileValidator } from '../validators/user.validator'
import { validate } from './index'

const router = Router()

// 所有用户路由都需要登录
router.use(authMiddleware)

/**
 * GET /api/user/profile
 * 获取用户个人信息 + 统计
 */
router.get('/profile', userController.getProfile)

/**
 * PUT /api/user/profile
 * 更新用户资料
 * Body: { nickName?: string, avatarUrl?: string }
 */
router.put('/profile', updateProfileValidator, validate, userController.updateProfile)

/**
 * GET /api/user/stats
 * 获取用户统计数据
 */
router.get('/stats', userController.getStats)

/**
 * GET /api/user/history
 * 获取用户浏览记录数量
 * （功能即将上线，目前返回 0）
 */
router.get('/history', userController.getHistory)

export default router
