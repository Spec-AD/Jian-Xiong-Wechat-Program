/**
 * controllers/admin.controller.ts — 管理后台控制器
 */

import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { success } from '../utils/response'
import { User } from '../models/user.model'
import { Work } from '../models/work.model'
import { Like } from '../models/like.model'

/**
 * GET /api/admin/stats
 * 获取管理后台仪表盘统计
 */
export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ code: 40300, message: '权限不足', data: null })
    }

    // 并发查询各项统计数据
    const [totalWorks, totalUsers, totalLikes] = await Promise.all([
      Work.countDocuments({ status: 'published' }),
      User.countDocuments(),
      Like.countDocuments(),
    ])

    // 今日浏览量（从今天 00:00 开始）
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayWorks = await Work.find({
      updatedAt: { $gte: todayStart },
    }).lean()
    const todayViews = todayWorks.reduce((sum, w) => sum + (w.views || 0), 0)

    success(res, {
      totalWorks,
      totalUsers,
      todayViews,
      totalLikes,
    })
  } catch (error) {
    next(error)
  }
}
