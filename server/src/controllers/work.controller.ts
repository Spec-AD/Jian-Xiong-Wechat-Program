import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import * as workService from '../services/work.service'
import { success, successWithPagination, created } from '../utils/response'

/**
 * GET /works
 * 作品列表（分页+筛选）
 */
export async function getWorks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = (req.query.category || req.query.categoryId) as string
    const keyword = req.query.keyword as string
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10))

    const result = await workService.getWorks({
      categoryId: category as string,
      keyword: keyword as string,
      page,
      pageSize,
      currentUserId: req.user?.id || null,
    })

    successWithPagination(res, result.list, result.total, page, pageSize)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /works/banner
 * Banner 推荐作品
 */
export async function getBannerWorks(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const list = await workService.getBannerWorks()
    success(res, list)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /works/my
 * 我发布的作品列表
 */
export async function getMyWorks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10))

    const result = await workService.getUserWorks(req.user!.id, page, pageSize)
    successWithPagination(res, result.list, result.total, page, pageSize)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /works/liked
 * 我点赞的作品列表
 */
export async function getLikedWorks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10))

    const result = await workService.getUserLikedWorks(req.user!.id, page, pageSize)
    successWithPagination(res, result.list, result.total, page, pageSize)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /works/:id
 * 作品详情
 */
export async function getWorkById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const work = await workService.getWorkById(req.params.id, req.user?.id || null)
    success(res, work)
  } catch (error) {
    next(error)
  }
}

/**
 * POST /works
 * 发布作品
 */
export async function createWork(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const work = await workService.createWork(req.user!.id, req.body)
    created(res, { id: work._id.toString() })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /works/:id
 * 编辑作品
 */
export async function updateWork(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const work = await workService.updateWork(req.params.id, req.user!.id, req.user!.role, req.body)
    success(res, { id: work._id.toString() }, '更新成功')
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /works/:id
 * 删除作品
 */
export async function deleteWork(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await workService.deleteWork(req.params.id, req.user!.id, req.user!.role)
    success(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
}

/**
 * POST /works/:id/like
 * 点赞/取消点赞（toggle）
 */
export async function toggleLike(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await workService.toggleLike(req.params.id, req.user!.id)
    success(res, result, result.liked ? '点赞成功' : '取消点赞')
  } catch (error) {
    next(error)
  }
}

/**
 * POST /works/:id/view
 * 记录浏览量
 */
export async function recordView(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await workService.recordView(req.params.id, req.user?.id || null)
    success(res, null)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /works/:id/comments
 * 获取作品评论列表
 */
export async function getComments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await workService.getWorkComments(req.params.id)
    success(res, result)
  } catch (error) {
    next(error)
  }
}

/**
 * POST /works/:id/comments
 * 添加评论
 */
export async function addComment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await workService.addWorkComment(req.params.id, req.user!.id, req.body.content)
    created(res, result, '评论成功')
  } catch (error) {
    next(error)
  }
}
