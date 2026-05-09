import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import * as uploadController from '../controllers/upload.controller'
import { authMiddleware } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { isCosConfigured } from '../services/cos.service'

// 文件存储策略：
// - 如果 COS 已配置 → 使用内存存储（直接流转发到 COS）
// - 如果 COS 未配置 → 使用本地磁盘存储（开发环境降级）
const storage = isCosConfigured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, path.resolve(__dirname, '../../uploads'))
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname)
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
        cb(null, name)
      },
    })

// 文件类型白名单
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new AppError(`不支持的文件类型: ${file.mimetype}`, 400, 40003))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 最大 50MB
  },
})

const router = Router()

// 所有上传接口需要登录
router.use(authMiddleware)

/**
 * POST /api/upload
 * 通用文件上传
 */
router.post('/', upload.single('file'), uploadController.uploadFile)

/**
 * POST /api/upload/avatar
 * 上传头像
 */
router.post('/avatar', upload.single('file'), uploadController.uploadAvatar)

export default router
