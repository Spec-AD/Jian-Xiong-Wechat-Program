import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { success } from '../utils/response'
import { AppError } from '../middleware/errorHandler'
import { uploadBuffer as cosUploadBuffer, isCosConfigured } from '../services/cos.service'
import logger from '../middleware/logger'

/**
 * 统一上传处理：根据存储模式获取文件 URL
 * - COS 模式：从 buffer 上传到 COS，返回 COS URL
 * - 本地模式：从磁盘路径获取本地 URL
 */
async function getFileUrl(file: Express.Multer.File): Promise<{
  url: string
  filename: string
}> {
  if (isCosConfigured()) {
    // ── COS 模式：内存存储，buffer 上传 ──
    const url = await cosUploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
    )
    return { url, filename: file.originalname }
  } else {
    // ── 本地模式：磁盘存储，返回本地路径 ──
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
    }
  }
}

/**
 * POST /upload
 * 通用文件上传（自动选择 COS / 本地存储）
 */
export async function uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError('请选择要上传的文件', 400, 40001)
    }

    const { url, filename } = await getFileUrl(req.file)
    const storageMode = isCosConfigured() ? 'COS' : 'Local'
    logger.info(`[Upload] ${storageMode} 存储 | url: ${url}`)

    success(res, {
      url,
      filename,
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

    const { url } = await getFileUrl(req.file)
    const storageMode = isCosConfigured() ? 'COS' : 'Local'
    logger.info(`[Upload] 头像 ${storageMode} 存储 | url: ${url}`)

    success(res, { avatarUrl: url }, '头像上传成功')
  } catch (error) {
    next(error)
  }
}
