// utils/util.ts — 健雄书院工具函数库

/** 补零 */
export const formatNumber = (n: number): string => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

/** 格式化为 YYYY/MM/DD HH:mm:ss */
export const formatTime = (date: Date): string => {
  const year   = date.getFullYear()
  const month  = date.getMonth() + 1
  const day    = date.getDate()
  const hour   = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

/** 格式化为 YYYY-MM-DD */
export const formatDate = (val: string | number | Date): string => {
  const d = val instanceof Date ? val : new Date(val)
  return `${d.getFullYear()}-${formatNumber(d.getMonth() + 1)}-${formatNumber(d.getDate())}`
}

/**
 * 根据文件名后缀判断类型
 * @returns 'video' | 'audio' | 'image' | 'doc' | 'unknown'
 */
export type FileType = 'video' | 'audio' | 'image' | 'doc' | 'markdown' | 'link' | 'unknown'

export const getFileType = (filename: string): FileType => {
  if (!filename) return 'unknown'
  const parts = filename.split('.')
  const ext = (parts.length > 1 ? parts[parts.length - 1] : '').toLowerCase()
  if (['mp4','mov','avi','mkv','flv','m4v'].includes(ext))          return 'video'
  if (['mp3','wav','aac','flac','ogg','m4a'].includes(ext))         return 'audio'
  if (['jpg','jpeg','png','gif','webp','bmp','heic'].includes(ext)) return 'image'
  if (['pdf','doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) return 'doc'
  if (['md','markdown'].includes(ext)) return 'markdown'
  return 'unknown'
}

/** 文件类型 → 中文标签 */
export const getFileTypeLabel = (type: FileType): string => {
    const map: Record<FileType, string> = {
    video: '视频', audio: '音频', image: '图片', doc: '文档', markdown: 'Markdown', link: '外链', unknown: '其他',
  }
  return map[type] !== null && map[type] !== void 0 ? map[type] : '其他'
}

/** 文件类型 → 图标 */
export const getFileTypeIcon = (type: FileType): string => {
    const map: Record<FileType, string> = {
    video: '', audio: '', image: '', doc: '', markdown: '', link: '🔗', unknown: '',
  }
  return (map[type] !== null && map[type] !== void 0) ? map[type] : ''
}

/**
 * 格式化秒数为 mm:ss
 * @example formatDuration(75) → '01:15'
 */
export const formatDuration = (sec: number): string => {
  const s = Math.floor(sec || 0)
  return `${formatNumber(Math.floor(s / 60))}:${formatNumber(s % 60)}`
}

/** 格式化文件大小 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/** 简易 Toast */
export const toast = (title: string, icon: 'success' | 'error' | 'loading' | 'none' = 'none') => {
  wx.showToast({ title, icon, duration: 2000 })
}

/**
 * 格式化相对时间（刚刚 / N分钟前 / N小时前 / N天前）
 */
export const formatRelativeTime = (val: string | number | Date): string => {
  const now = Date.now()
  const ts = val instanceof Date ? val.getTime() : new Date(val).getTime()
  if (isNaN(ts)) return '未知'
  const diff = now - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return formatDate(val)
}

/** 成果分类配置 */
export interface Category {
  id: string
  name: string
  icon: string
}

export const WORK_CATEGORIES: Category[] = [
  { id: 'all',       name: '全部',   icon: '' },
  { id: 'video',     name: '视频',   icon: '' },
  { id: 'audio',     name: '音频',   icon: '' },
  { id: 'image',     name: '图片',   icon: '' },
  { id: 'doc',       name: '文档',   icon: '' },
  { id: 'research',  name: '科研',   icon: '' },
  { id: 'volunteer', name: '志愿',   icon: '' },
  { id: 'external',  name: '外链作品', icon: '🔗' },
]

/**
 * 节流（300ms 默认）
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay = 300,
): ((...args: Parameters<T>) => void) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }
}

/**
 * 获取 WebP 格式的图片 URL（利用腾讯云 COS 图片处理）
 * COS 万象图片处理：添加 ?imageMogr2/format/webp
 * 在支持 WebP 的浏览器/小程序中节省带宽
 */
export function getWebpUrl(url: string, options?: { width?: number; quality?: number }): string {
  if (!url || !url.includes('cos.ap-')) return url

  const params: string[] = ['imageMogr2']
  params.push('format/webp')

  if (options?.width) {
    params.push(`thumbnail/${options.width}x`)
  }
  if (options?.quality) {
    params.push(`quality/${options.quality}`)
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.join('/')}`
}

/**
 * 外链平台图标映射
 * 根据 platform 字段返回对应的图标 URL
 */
export const PLATFORM_ICONS: Record<string, string> = {
  'Canva': 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/SimpleIconsCanva.png',
  '可画': 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/SimpleIconsCanva.png',
  'Bilibili': 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/StreamlineUltimateBilibiliLogo.png',
  '哔哩哔哩': 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/StreamlineUltimateBilibiliLogo.png',
  '易企秀': 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/SolarInfinityBoldDuotone.png',
  '腾讯云开发个人页面': 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/GlyphsPolyCloud.png',
}

/**
 * 获取平台图标 URL
 */
export function getPlatformIcon(platform: string): string {
  return PLATFORM_ICONS[platform] || ''
}

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay = 300,
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}
