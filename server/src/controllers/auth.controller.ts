import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import * as authService from '../services/auth.service'
import * as userService from '../services/user.service'
import { success } from '../utils/response'

/**
 * POST /auth/login
 * 微信登录：用 code 换取 token
 */
export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { code } = req.body
    const result = await authService.loginWithWechat(code)
    success(res, result, '登录成功')
  } catch (error) {
    next(error)
  }
}

/**
 * GET /auth/verify
 * 校验 token 有效性
 */
export async function verify(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(req.user!.id)
    success(res, {
      valid: true,
      user: {
        id: user._id.toString(),
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
}
