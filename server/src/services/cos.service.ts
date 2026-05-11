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
import { Work } from '../models/work.model'

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
 * 上传文件到 COS（保留原始文件名作为 COS Key）
 *
 * @param filePath   本地文件路径
 * @param originalname  原始文件名（用作 COS 对象 key）
 * @param contentType   MIME 类型
 * @param keyPrefix    可选，自定义前缀目录（默认 resources）
 * @returns 可公开访问的文件 URL
 */
export async function uploadFileWithKey(
  filePath: string,
  originalname: string,
  contentType: string,
  keyPrefix = 'resources',
): Promise<string> {
  if (!isCosConfigured()) {
    return saveToLocal(fs.readFileSync(filePath), originalname)
  }

  const cos = getCosClient()
  // 使用原始文件名作为 COS key，保留目录前缀
  const key = `${keyPrefix}/${originalname}`

  return new Promise<string>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: config.cos.bucket,
        Region: config.cos.region,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentType,
      },
      (err, data) => {
        if (err) {
          logger.error('[COS] 上传失败:', err)
          logger.warn('[COS] 降级到本地存储')
          resolve(saveToLocal(fs.readFileSync(filePath), originalname))
          return
        }
        const cosUrl = `https://${data.Location}`
        logger.info(`[COS] 上传成功: ${cosUrl}`)
        resolve(cosUrl)
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

/**
 * COS 对象信息
 */
export interface CosObjectInfo {
  key: string        // COS 对象键 (如 'resources/example.mp4')
  url: string        // 完整访问 URL
  size: number       // 文件大小（字节）
  lastModified: string // 最后修改时间
  ext: string        // 文件扩展名（小写，如 '.mp4'）
  fileName: string   // 文件名（不含目录，如 'example.mp4'）
}

/**
 * 根据文件名后缀判断资源类型
 */
function detectResourceType(ext: string): string {
  const extLower = ext.toLowerCase()
  if (['.mp4', '.mov', '.avi', '.mkv', '.flv', '.m4v'].includes(extLower)) return 'video'
  if (['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'].includes(extLower)) return 'audio'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic'].includes(extLower)) return 'image'
  if (['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'].includes(extLower)) return 'doc'
  return 'unknown'
}

/**
 * 获取 COS 客户端（公开，供其他模块复用）
 */
export function getCosClientInstance(): COS {
  return getCosClient()
}

/**
 * 列出 COS 存储桶中指定前缀下的所有对象
 *
 * @param prefix 对象键前缀（如 'resources/'）
 * @param maxKeys 每页最大返回数（默认 100，最大 1000）
 * @param marker 分页游标
 * @returns 对象列表 + 分页标记
 */
export async function listCosObjects(
  prefix: string,
  maxKeys = 100,
  marker?: string,
): Promise<{
  objects: CosObjectInfo[]
  isTruncated: boolean
  nextMarker: string | undefined
}> {
  if (!isCosConfigured()) {
    throw new Error('COS 未配置，无法列取资源')
  }

  const cos = getCosClient()

  return new Promise((resolve, reject) => {
    cos.getBucket({
      Bucket: config.cos.bucket,
      Region: config.cos.region,
      Prefix: prefix,
      MaxKeys: maxKeys,
      Marker: marker,
    }, (err, data) => {
      if (err) {
        logger.error('[COS] 列取对象失败:', err)
        reject(err)
        return
      }

      const objects: CosObjectInfo[] = (data.Contents || [])
        .filter(item => item.Key && !item.Key.endsWith('/')) // 排除目录
        .map(item => {
          const key = item.Key!
          const ext = path.extname(key).toLowerCase()
          const fileName = path.basename(key)
          return {
            key,
            url: `https://${config.cos.bucket}.cos.${config.cos.region}.myqcloud.com/${key}`,
            size: Number(item.Size) || 0,
            lastModified: item.LastModified || '',
            ext,
            fileName,
          }
        })

      resolve({
        objects,
        isTruncated: data.IsTruncated === 'true' || false,
        nextMarker: data.NextMarker || data.Marker,
      })
    })
  })
}

/**
 * 从文件名中提取基础名称（去掉序号后缀）
 * @example '陈奕涵的成果作品 (1)' → '陈奕涵的成果作品'
 * @example 'IMG_001 (2)' → 'IMG_001'
 */
function extractBaseName(fileName: string): string {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName))
  return nameWithoutExt
    .replace(/\s*[(（]\d+[)）]\s*$/, '')
    .replace(/\s*[-–—]\s*\d+\s*$/, '')
    .replace(/\s*_\s*\d+\s*$/, '')
    .trim()
}

/**
 * 将 COS 对象批量导入为 Work 作品记录
 *
 * 智能合并同一作品的多个图片文件（按基础文件名分组），
 * 避免每张图片被创建为独立作品。
 *
 * @param objectKeys 要导入的 COS 对象键列表
 * @param adminUserId 执行导入的管理员用户 ID
 * @param defaultCategoryId 默认分类 ID（可选，会用类型检测自动推断）
 * @returns 成功导入的数量
 */
export async function importCosObjectsAsWorks(
  objectKeys: string[],
  adminUserId: string,
  defaultCategoryId?: string,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  // ── 1. 将对象按键分组（按基础文件名 + 类型）──
  //    同一组的多个图片文件合并为一个作品
  interface ObjectEntry {
    key: string
    url: string
    ext: string
    type: string
    fileName: string
  }

  const groups = new Map<string, ObjectEntry[]>()

  for (const key of objectKeys) {
    const ext = path.extname(key).toLowerCase()
    const type = detectResourceType(ext) as any
    const fileName = path.basename(key)
    const baseName = extractBaseName(fileName)

    // 图片文件按基础名分组，其他类型各自独立
    const groupKey = type === 'image' ? `${baseName}::${type}` : key

    const cosUrl = `https://${config.cos.bucket}.cos.${config.cos.region}.myqcloud.com/${key}`
    const entry: ObjectEntry = { key, url: cosUrl, ext, type, fileName }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(entry)
  }

  // ── 2. 逐组导入 ──
  for (const [, entries] of groups) {
    try {
      const first = entries[0]

      // 检查是否已导入（用第一个文件的 URL 做去重）
      const existing = await Work.findOne({
        fileUrl: { $regex: first.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$' },
      })
      if (existing) {
        skipped++
        continue
      }

      // 收集该组所有图片 URL
      const allUrls = entries.map(e => e.url)

      // 自动判断分类
      const categoryId = defaultCategoryId || first.type

      await Work.create({
        userId: adminUserId,
        title: extractBaseName(first.fileName) || first.fileName,
        description: entries.length > 1
          ? `自动导入：${first.key} 等 ${entries.length} 个文件`
          : `从 COS 资源目录自动导入：${first.key}`,
        type: first.type,
        categoryId,
        fileUrl: allUrls[0],
        cover: first.type === 'image' ? allUrls[0] : '',
        imageList: first.type === 'image' ? allUrls : [],
        tags: ['COS导入'],
        isBanner: false,
        status: 'published',
      })

      imported++
      const groupInfo = entries.length > 1 ? `（${entries.length} 个文件合并）` : ''
      logger.info(`[COS导入] 成功导入: ${first.key} ${groupInfo} → ${first.type}`)
    } catch (err: any) {
      errors.push(`${entries[0].key}: ${err.message}`)
      logger.error(`[COS导入] 导入失败: ${entries[0].key}`, err)
    }
  }

  return { imported, skipped, errors }
}
