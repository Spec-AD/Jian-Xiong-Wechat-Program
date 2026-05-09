import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { success } from '../utils/response'
import { AppError } from '../middleware/errorHandler'

/**
 * POST /upload
 * 通用文件上传（暂用本地存储，后续可迁移到 COS）
 * 前端通过 multipart/form-data 上传文件
 */
export async function uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError('请选择要上传的文件', 400, 40001)
    }

    // 构造可访问的 URL（开发环境用本地地址）
    const fileUrl = `/uploads/${req.file.filename}`

    success(res, {
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, '上传成功')
  } catch (error) {
    next(error)
  }
}

/**
 * POST /upload/avatar
 * 上传头像
 */
export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError('请选择头像图片', 400, 40001)
    }

    const avatarUrl = `/uploads/${req.file.filename}`

    success(res, { avatarUrl }, '头像上传成功')
  } catch (error) {
    next(error)
  }
}
