import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import * as userService from '../services/user.service'
import * as authService from '../services/auth.service'
import * as workService from '../services/work.service'
import { success } from '../utils/response'

/**
 * GET /user/profile
 * 获取用户个人信息 + 统计
 */
export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.user!.id)
    const stats = await authService.getUserStats(req.user!.id)

    success(res, {
      id: user._id.toString(),
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      signature: user.signature,
      birthday: user.birthday,
      region: user.region,
      interests: user.interests,
      role: user.role,
      createdAt: user.createdAt,
      stats,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /user/profile
 * 更新用户资料
 */
export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { nickName, avatarUrl, signature, birthday, region, interests } = req.body

    if (!nickName && !avatarUrl && !signature && !birthday && !region && !interests) {
      success(res, { message: '没有需要更新的字段' })
      return
    }

    const user = await userService.updateUserProfile(req.user!.id, { nickName, avatarUrl, signature, birthday, region, interests })

    success(res, {
      id: user._id.toString(),
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
    }, '更新成功')
  } catch (error) {
    next(error)
  }
}

/**
 * GET /user/stats
 * 获取用户统计数据
 */
export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await authService.getUserStats(req.user!.id)
    success(res, stats)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /user/history
 * 获取用户浏览记录（分页）
 */
export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10))

    const result = await workService.getUserViewHistory(req.user!.id, page, pageSize)
    success(res, result)
  } catch (error) {
    next(error)
  }
}
