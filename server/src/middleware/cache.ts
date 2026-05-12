import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'

/**
 * 简单的内存缓存
 */
const cacheStore = new Map<string, { data: any; expiry: number }>()

// 定期清理过期缓存（每 5 分钟）
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cacheStore.entries()) {
    if (value.expiry < now) {
      cacheStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * 响应缓存中间件
 * 对 GET 请求启用内存缓存，缓存时间可配置
 * @param ttl 缓存有效期（秒），默认 60 秒
 */
export function responseCache(ttl: number = 60) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // 仅缓存 GET 请求
    if (req.method !== 'GET') {
      return next()
    }

    // 对需要登录的接口不缓存（数据个性化）
    if (req.headers.authorization) {
      return next()
    }

    const key = `__cache__:${req.originalUrl || req.url}`

    const cached = cacheStore.get(key)
    if (cached && cached.expiry > Date.now()) {
      // 设置缓存命中标记
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.data)
    }

    // 保存原始的 res.json 方法
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      // 只有成功响应才缓存
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(key, {
          data: body,
          expiry: Date.now() + ttl * 1000,
        })
        res.setHeader('X-Cache', 'MISS')
        res.setHeader('Cache-Control', `public, max-age=${ttl}`)
      }
      return originalJson(body)
    }

    next()
  }
}

/**
 * 设置静态资源的强缓存头
 */
export function setStaticCacheHeaders(req: AuthRequest, res: Response, next: NextFunction) {
  // 对图片、字体等静态资源设置强缓存（1 年）
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|ico|svg|woff2?|ttf|otf|eot)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
  next()
}
