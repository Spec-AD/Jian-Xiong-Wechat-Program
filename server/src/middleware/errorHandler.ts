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
 * 统一错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 记录错误日志
  logger.error('请求处理错误', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  })

  // 处理已知的应用错误
  if (err instanceof AppError) {
    const response: ApiResponse = {
      code: err.code,
      message: err.message,
      data: null,
    }
    res.status(err.statusCode).json(response)
    return
  }

  // 处理 Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const response: ApiResponse = {
      code: 40001,
      message: `数据验证失败: ${err.message}`,
      data: null,
    }
    res.status(400).json(response)
    return
  }

  // 处理 Mongoose 重复键错误
  if ((err as any).code === 11000) {
    const response: ApiResponse = {
      code: 40002,
      message: '数据已存在，请勿重复操作',
      data: null,
    }
    res.status(409).json(response)
    return
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    const response: ApiResponse = {
      code: 40101,
      message: '无效的认证凭证',
      data: null,
    }
    res.status(401).json(response)
    return
  }

  if (err.name === 'TokenExpiredError') {
    const response: ApiResponse = {
      code: 40102,
      message: '认证已过期，请重新登录',
      data: null,
    }
    res.status(401).json(response)
    return
  }

  // 兜底：未知错误
  const response: ApiResponse = {
    code: 50000,
    message: process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message,
    data: null,
  }
  res.status(500).json(response)
}
