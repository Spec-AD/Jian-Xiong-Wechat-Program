/**
 * routes/admin.routes.ts — 管理后台路由
 */

import { Router } from 'express'
import * as adminController from '../controllers/admin.controller'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 所有管理接口需要登录
router.use(authMiddleware)

/**
 * GET /api/admin/stats
 * 仪表盘统计
 */
router.get('/stats', adminController.getDashboardStats)

export default router
