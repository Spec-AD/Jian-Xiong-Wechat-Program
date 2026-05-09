import { Router } from 'express'
import * as workController from '../controllers/work.controller'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { createWorkValidator, updateWorkValidator } from '../validators/work.validator'
import { validate } from './index'

const router = Router()

// ============ 公开接口（无需登录） ============

/**
 * GET /api/works
 * 作品列表（分页+分类+搜索）
 */
router.get('/', optionalAuthMiddleware, workController.getWorks)

/**
 * GET /api/works/banner
 * Banner 推荐作品
 */
router.get('/banner', workController.getBannerWorks)

/**
 * GET /api/works/:id
 * 作品详情
 */
router.get('/:id', optionalAuthMiddleware, workController.getWorkById)

/**
 * POST /api/works/:id/view
 * 记录浏览量
 */
router.post('/:id/view', workController.recordView)

// ============ 需登录接口 ============

/**
 * POST /api/works
 * 发布作品
 */
router.post('/', authMiddleware, createWorkValidator, validate, workController.createWork)

/**
 * PUT /api/works/:id
 * 编辑作品
 */
router.put('/:id', authMiddleware, updateWorkValidator, validate, workController.updateWork)

/**
 * DELETE /api/works/:id
 * 删除作品
 */
router.delete('/:id', authMiddleware, workController.deleteWork)

/**
 * POST /api/works/:id/like
 * 点赞/取消点赞
 */
router.post('/:id/like', authMiddleware, workController.toggleLike)

/**
 * GET /api/works/my
 * 我发布的作品列表
 */
router.get('/my/list', authMiddleware, workController.getMyWorks)

/**
 * GET /api/works/liked
 * 我点赞的作品列表
 */
router.get('/liked/list', authMiddleware, workController.getLikedWorks)

export default router
