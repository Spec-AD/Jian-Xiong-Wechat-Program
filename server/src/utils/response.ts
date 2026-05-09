import { Response } from 'express'
import { ApiResponse, PaginatedData } from '../types'

/**
 * 统一响应工具
 * 确保所有 API 返回一致的格式
 */

/**
 * 成功响应
 */
export function success<T>(res: Response, data: T, message: string = 'ok', statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    code: 0,
    message,
    data,
  }
  res.status(statusCode).json(response)
}

/**
 * 分页成功响应
 */
export function successWithPagination<T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = 'ok',
): void {
  const data: PaginatedData<T> = {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
  success(res, data, message)
}

/**
 * 错误响应
 */
export function fail(res: Response, code: number = 40000, message: string = '请求失败', statusCode: number = 400): void {
  const response: ApiResponse = {
    code,
    message,
    data: null,
  }
  res.status(statusCode).json(response)
}

/**
 * 创建成功响应（201）
 */
export function created<T>(res: Response, data: T, message: string = '创建成功'): void {
  success(res, data, message, 201)
}

/**
 * 无内容响应（204）
 */
export function noContent(res: Response): void {
  res.status(204).send()
}
