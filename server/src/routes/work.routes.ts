import { Router } from 'express'
import * as workController from '../controllers/work.controller'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { createWorkValidator, updateWorkValidator, listWorksValidator, paginationValidator, objectIdParamValidator } from '../validators/work.validator'
import { validate } from './index'

const router = Router()

// ============ 需登录接口（优先注册，避免被 /:id 路由抢占） ============

/**
 * GET /api/works/my/list
 * 我发布的作品列表
 */
router.get('/my/list', authMiddleware, paginationValidator, validate, workController.getMyWorks)

/**
 * GET /api/works/liked/list
 * 我点赞的作品列表
 */
router.get('/liked/list', authMiddleware, paginationValidator, validate, workController.getLikedWorks)

/**
 * POST /api/works
 * 发布作品
 */
router.post('/', authMiddleware, createWorkValidator, validate, workController.createWork)

/**
 * PUT /api/works/:id
 * 编辑作品
 */
router.put('/:id', authMiddleware, objectIdParamValidator, updateWorkValidator, validate, workController.updateWork)

/**
 * DELETE /api/works/:id
 * 删除作品
 */
router.delete('/:id', authMiddleware, objectIdParamValidator, validate, workController.deleteWork)

/**
 * POST /api/works/:id/like
 * 点赞/取消点赞
 */
router.post('/:id/like', authMiddleware, objectIdParamValidator, validate, workController.toggleLike)

// ============ 公开接口（无需登录） ============

/**
 * GET /api/works
 * 作品列表（分页+分类+搜索）
 */
router.get('/', optionalAuthMiddleware, listWorksValidator, validate, workController.getWorks)

/**
 * GET /api/works/banner
 * Banner 推荐作品
 */
router.get('/banner', workController.getBannerWorks)

/**
 * GET /api/works/:id
 * 作品详情（必须放在 /my/list、/liked/list、/banner 之后）
 */
router.get('/:id', optionalAuthMiddleware, objectIdParamValidator, validate, workController.getWorkById)

/**
 * POST /api/works/:id/view
 * 记录浏览量
 */
router.post('/:id/view', objectIdParamValidator, validate, workController.recordView)

export default router
