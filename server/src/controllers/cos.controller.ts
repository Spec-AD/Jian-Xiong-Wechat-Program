/**
 * controllers/cos.controller.ts — COS 资源管理控制器
 *
 * 功能：
 *   - 列取 COS 资源
 *   - 批量导入资源为作品
 *   - 资源统计
 */

import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { success } from '../utils/response'
import { AppError } from '../middleware/errorHandler'
import {
  listCosObjects,
  importCosObjectsAsWorks,
  isCosConfigured,
} from '../services/cos.service'
import logger from '../middleware/logger'

/**
 * GET /api/cos/resources
 * 列出 COS 中的资源文件
 */
export async function listResources(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin') {
      throw new AppError('仅管理员可管理 COS 资源', 403, 40300)
    }

    if (!isCosConfigured()) {
      throw new AppError('COS 未配置', 500, 50000)
    }

    const prefix = (req.query.prefix as string) || 'resources/'
    const maxKeys = Math.min(1000, Math.max(1, parseInt(req.query.maxKeys as string) || 100))
    const marker = req.query.marker as string | undefined

    const result = await listCosObjects(prefix, maxKeys, marker)

    success(res, {
      objects: result.objects,
      isTruncated: result.isTruncated,
      nextMarker: result.nextMarker,
      prefix,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/cos/import
 * 批量导入 COS 资源为作品
 */
export async function importResources(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin') {
      throw new AppError('仅管理员可导入资源', 403, 40300)
    }

    if (!isCosConfigured()) {
      throw new AppError('COS 未配置', 500, 50000)
    }

    const { objectKeys, defaultCategoryId } = req.body

    if (!Array.isArray(objectKeys) || objectKeys.length === 0) {
      throw new AppError('请选择要导入的资源', 400, 40001)
    }

    if (objectKeys.length > 500) {
      throw new AppError('单次导入不能超过 500 个文件', 400, 40001)
    }

    logger.info(`[COS导入] 开始批量导入 ${objectKeys.length} 个资源，操作人: ${req.user?.id}`)

    const result = await importCosObjectsAsWorks(
      objectKeys,
      req.user!.id,
      defaultCategoryId,
    )

    success(res, result, `成功导入 ${result.imported} 个资源`)

    logger.info(`[COS导入] 完成: 导入 ${result.imported}, 跳过 ${result.skipped}, 失败 ${result.errors.length}`)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/cos/stats
 * 获取 COS 资源统计信息
 */
export async function getCosStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== 'admin') {
      throw new AppError('仅管理员可查看', 403, 40300)
    }

    if (!isCosConfigured()) {
      throw new AppError('COS 未配置', 500, 50000)
    }

    // 获取 COS 资源全量列表（最多 1000 个）
    const result = await listCosObjects('resources/', 1000)

    // 按文件类型统计
    const typeCount: Record<string, number> = {}
    let totalSize = 0

    for (const obj of result.objects) {
      totalSize += obj.size
      const ext = obj.ext.replace('.', '') || 'unknown'
      typeCount[ext] = (typeCount[ext] || 0) + 1
    }

    // 按大类归类统计
    const categoryCount: Record<string, number> = {
      video: 0,
      audio: 0,
      image: 0,
      doc: 0,
      unknown: 0,
    }

    const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'flv', 'm4v'])
    const AUDIO_EXTS = new Set(['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'])
    const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'])
    const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'])

    for (const ext of Object.keys(typeCount)) {
      const e = ext.toLowerCase()
      if (VIDEO_EXTS.has(e)) categoryCount.video += typeCount[ext]
      else if (AUDIO_EXTS.has(e)) categoryCount.audio += typeCount[ext]
      else if (IMAGE_EXTS.has(e)) categoryCount.image += typeCount[ext]
      else if (DOC_EXTS.has(e)) categoryCount.doc += typeCount[ext]
      else categoryCount.unknown += typeCount[ext]
    }

    success(res, {
      totalFiles: result.objects.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      isTruncated: result.isTruncated,
      typeCount,
      categoryCount,
    })
  } catch (error) {
    next(error)
  }
}

/** 格式化字节数 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
