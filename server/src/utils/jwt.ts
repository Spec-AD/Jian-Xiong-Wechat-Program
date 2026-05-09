import jwt from 'jsonwebtoken'
import config from '../config'
import { UserRole } from '../types'

/**
 * JWT Token 载荷
 */
export interface TokenPayload {
  id: string
  openid: string
  role: UserRole
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions)
}

/**
 * 验证 JWT Token
 * 成功返回解码后的载荷，失败抛出异常
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload
}

/**
 * 从请求头中解析 Token 并提取用户 ID
 * 常用于不需要强制鉴权的场景
 */
export function getUserIdFromToken(token?: string): string | null {
  if (!token) return null
  try {
    const decoded = verifyToken(token)
    return decoded.id
  } catch {
    return null
  }
}
