/**
 * services/cos.service.ts — 腾讯云 COS 文件上传服务
 *
 * 功能：
 *  - 初始化 COS SDK 客户端
 *  - 上传 Buffer/文件到 COS 存储桶
 *  - 自动判断 COS 是否已配置，未配置时降级为本地存储
 *  - 生成 COS 对象 URL
 */

import COS from 'cos-nodejs-sdk-v5'
import fs from 'fs'
import path from 'path'
import config from '../config'
import logger from '../middleware/logger'

/** COS 客户端单例 */
let cosInstance: COS | null = null

/** 本地存储目录（COS 降级时使用） */
const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

/**
 * 检查 COS 是否已配置
 */
export function isCosConfigured(): boolean {
  return !!(
    config.cos.secretId &&
    config.cos.secretKey &&
    config.cos.bucket
  )
}

/**
 * 获取 COS 客户端实例（单例）
 */
function getCosClient(): COS {
  if (!cosInstance) {
    cosInstance = new COS({
      SecretId: config.cos.secretId,
      SecretKey: config.cos.secretKey,
    })
    logger.info('[COS] 客户端初始化成功')
  }
  return cosInstance
}

/**
 * 生成 COS 对象键（按日期分目录，避免单目录文件过多）
 * @example 'works/2026/05/09/abc123.jpg'
 */
function generateCosKey(originalname: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const ext = path.extname(originalname)
  const randomName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  return `works/${year}/${month}/${day}/${randomName}`
}

/**
 * 上传文件到 COS（Buffer 方式）
 *
 * @param buffer   文件二进制数据
 * @param originalname  原始文件名（用于提取扩展名）
 * @param contentType   MIME 类型
 * @param keyPrefix    可选，自定义前缀目录
 * @returns 可公开访问的文件 URL
 */
export async function uploadBuffer(
  buffer: Buffer,
  originalname: string,
  contentType: string,
  keyPrefix = 'works',
): Promise<string> {
  // ── 若 COS 未配置，降级到本地存储 ──
  if (!isCosConfigured()) {
    return saveToLocal(buffer, originalname)
  }

  const cos = getCosClient()
  const key = generateCosKey(originalname)

  return new Promise<string>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: config.cos.bucket,
        Region: config.cos.region,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // 禁止浏览器直接预览，强制下载（不需要的可注释掉）
        // ContentDisposition: 'attachment',
      },
      (err, data) => {
        if (err) {
          logger.error('[COS] 上传失败:', err)
          // COS 上传失败，降级到本地存储
          logger.warn('[COS] 降级到本地存储')
          resolve(saveToLocal(buffer, originalname))
          return
        }
        // data.Location 是 COS 自动生成的访问 URL（带 Bucket 和 Region）
        const cosUrl = `https://${data.Location}`
        logger.info(`[COS] 上传成功: ${cosUrl}`)
        resolve(cosUrl)
      },
    )
  })
}

/**
 * 上传本地文件到 COS（读取文件后上传）
 *
 * @param filePath   本地文件路径
 * @param originalname  原始文件名
 * @param contentType   MIME 类型
 * @returns 可公开访问的文件 URL
 */
export async function uploadFile(
  filePath: string,
  originalname: string,
  contentType: string,
): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  return uploadBuffer(buffer, originalname, contentType)
}

/**
 * 保存文件到本地（COS 降级方案 / 开发环境）
 */
function saveToLocal(buffer: Buffer, originalname: string): string {
  // 确保目录存在
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true })
  }

  const ext = path.extname(originalname)
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const filePath = path.join(LOCAL_UPLOAD_DIR, filename)

  fs.writeFileSync(filePath, buffer)
  const localUrl = `/uploads/${filename}`

  logger.info(`[LocalStorage] 文件保存成功: ${filePath}`)
  return localUrl
}

/**
 * 删除 COS 上的文件
 */
export async function deleteFile(key: string): Promise<void> {
  if (!isCosConfigured()) {
    logger.warn('[COS] 未配置，跳过删除')
    return
  }

  const cos = getCosClient()
  return new Promise<void>((resolve, reject) => {
    cos.deleteObject(
      {
        Bucket: config.cos.bucket,
        Region: config.cos.region,
        Key: key,
      },
      (err) => {
        if (err) {
          logger.error('[COS] 删除失败:', err)
          reject(err)
          return
        }
        logger.info(`[COS] 删除成功: ${key}`)
        resolve()
      },
    )
  })
}

/**
 * 从 COS URL 中提取对象 key
 * @example
 *   'https://bucket.cos.ap-nanjing.myqcloud.com/works/2026/05/09/abc.jpg'
 *   → 'works/2026/05/09/abc.jpg'
 */
export function extractKeyFromUrl(url: string): string {
  const parts = url.split('.myqcloud.com/')
  return parts[1] || ''
}
