import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { verifyToken } from '../utils/jwt'
import { AppError } from './errorHandler'

/**
 * JWT 鉴权中间件
 * 从 Authorization header 提取并验证 token
 * 验证通过后将用户信息挂载到 req.user
 */
export function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('缺少认证凭证', 401, 40100)
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    throw new AppError('缺少认证凭证', 401, 40100)
  }

  try {
    const decoded = verifyToken(token)
    req.user = {
      id: decoded.id,
      openid: decoded.openid,
      role: decoded.role,
    }
    next()
  } catch (error) {
    // 让 errorHandler 处理 JWT 相关错误
    throw error
  }
}

/**
 * 可选鉴权中间件
 * 有 token 就解析，没有也不拒绝
 * 用于作品列表等接口，有用户信息时可返回"是否已点赞"等字段
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = verifyToken(token)
      req.user = {
        id: decoded.id,
        openid: decoded.openid,
        role: decoded.role,
      }
    } catch {
      // token 无效或过期，忽略即可
    }
  }

  next()
}

/**
 * 管理员权限中间件
 * 需在 authMiddleware 之后使用
 */
export function adminMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('权限不足，需要管理员权限', 403, 40300)
  }
  next()
}
