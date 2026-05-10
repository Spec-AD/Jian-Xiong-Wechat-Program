import { Request, Response, NextFunction } from 'express'
import logger from './logger'
import { ApiResponse } from '../types'

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  public statusCode: number
  public code: number

  constructor(message: string, statusCode: number = 400, code?: number) {
    super(message)
    this.statusCode = statusCode
    this.code = code || statusCode
    this.name = 'AppError'
  }
}

/**
 * 错误码映射表
 */
const ERROR_CODES: Record<string, { code: number; statusCode: number; message: string }> = {
  CastError: {
    code: 40004,
    statusCode: 400,
    message: '无效的资源标识符',
  },
  SyntaxError: {
    code: 40005,
    statusCode: 400,
    message: '请求体格式错误（无效的 JSON）',
  },
  ValidationError: {
    code: 40001,
    statusCode: 400,
    message: '数据验证失败',
  },
  JsonWebTokenError: {
    code: 40101,
    statusCode: 401,
    message: '无效的认证凭证',
  },
  TokenExpiredError: {
    code: 40102,
    statusCode: 401,
    message: '认证已过期，请重新登录',
  },
  MulterError: {
    code: 40006,
    statusCode: 400,
    message: '文件上传错误',
  },
}

/**
 * 统一的错误响应构建函数
 */
function buildErrorResponse(code: number, message: string): ApiResponse {
  return { code, message, data: null }
}

/**
 * 统一错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 记录错误日志（包含完整堆栈）
  logger.error('请求处理错误', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  })

  // ─── 1. 已知的应用错误（AppError） ───
  if (err instanceof AppError) {
    res.status(err.statusCode).json(buildErrorResponse(err.code, err.message))
    return
  }

  // ─── 2. Mongoose 重复键错误（code 11000） ───
  if ((err as any).code === 11000) {
    const keyValue = (err as any).keyValue || {}
    const keyStr = Object.keys(keyValue).join(', ')
    res.status(409).json(buildErrorResponse(
      40002,
      `数据已存在：${keyStr} 已被占用`,
    ))
    return
  }

  // ─── 3. 已知错误类型（通过错误名映射） ───
  if (err.name in ERROR_CODES) {
    const errorConfig = ERROR_CODES[err.name]
    let message = errorConfig.message

    // 为特定错误类型补充详细信息
    if (err.name === 'CastError') {
      const castErr = err as any
      message = `无效的 ${castErr.path || '资源'} 标识符`
      if (castErr.value) {
        message += `：${castErr.value}`
      }
    } else if (err.name === 'MulterError') {
      const multerErr = err as any
      switch (multerErr.code) {
        case 'LIMIT_FILE_SIZE':
          message = '文件大小超过限制（最大 50MB）'
          break
        case 'LIMIT_UNEXPECTED_FILE':
          message = '上传字段名称不正确'
          break
        default:
          message = multerErr.message || '文件上传错误'
      }
    } else if (err.name === 'ValidationError') {
      // Mongoose 验证错误附带字段信息
      message = `数据验证失败: ${err.message}`
    }

    res.status(errorConfig.statusCode).json(buildErrorResponse(errorConfig.code, message))
    return
  }

  // ─── 4. 兜底：未知错误 ───
  const isProduction = process.env.NODE_ENV === 'production'
  res.status(500).json(buildErrorResponse(
    50000,
    isProduction ? '服务器内部错误' : err.message,
  ))
}
