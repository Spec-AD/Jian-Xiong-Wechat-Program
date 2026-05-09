import { Router, Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { fail } from '../utils/response'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import workRoutes from './work.routes'
import uploadRoutes from './upload.routes'

const router = Router()

/**
 * 参数校验结果处理中间件
 * 在每个路由的校验规则之后使用
 */
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0]
    fail(res, 40001, firstError.msg)
    return
  }
  next()
}

/**
 * 路由挂载
 * 所有接口以 /api 为前缀
 */
router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/works', workRoutes)
router.use('/upload', uploadRoutes)

/**
 * 健康检查
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
