/**
 * routes/cos.routes.ts — COS 资源管理路由
 *
 * 功能：
 *   - GET  /api/cos/resources    列出 COS 中的资源文件（分页）
 *   - POST /api/cos/import       将选中的 COS 资源导入为 Work 作品
 *   - GET  /api/cos/stats        获取 COS 资源统计概览
 *
 * 所有接口仅管理员可用
 */

import { Router } from 'express'
import * as cosController from '../controllers/cos.controller'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 所有 COS 管理接口需要登录且为管理员
router.use(authMiddleware)

/**
 * GET /api/cos/resources
 * 列出 COS 存储桶中指定前缀下的资源
 * Query: prefix (默认 'resources/'), maxKeys, marker
 */
router.get('/resources', cosController.listResources)

/**
 * POST /api/cos/import
 * 批量导入 COS 资源为作品
 * Body: { objectKeys: string[], defaultCategoryId?: string }
 */
router.post('/import', cosController.importResources)

/**
 * GET /api/cos/stats
 * 获取 COS 资源统计信息
 */
router.get('/stats', cosController.getCosStats)

export default router
