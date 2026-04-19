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
export type FileType = 'video' | 'audio' | 'image' | 'doc' | 'unknown'

export const getFileType = (filename: string): FileType => {
  if (!filename) return 'unknown'
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['mp4','mov','avi','mkv','flv','m4v'].includes(ext))          return 'video'
  if (['mp3','wav','aac','flac','ogg','m4a'].includes(ext))         return 'audio'
  if (['jpg','jpeg','png','gif','webp','bmp','heic'].includes(ext)) return 'image'
  if (['pdf','doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) return 'doc'
  return 'unknown'
}

/** 文件类型 → 中文标签 */
export const getFileTypeLabel = (type: FileType): string => {
  const map: Record<FileType, string> = {
    video: '视频', audio: '音频', image: '图片', doc: '文档', unknown: '其他',
  }
  return map[type] ?? '其他'
}

/** 文件类型 → Emoji 图标 */
export const getFileTypeIcon = (type: FileType): string => {
  const map: Record<FileType, string> = {
    video: '🎬', audio: '🎵', image: '🖼️', doc: '📄', unknown: '🔗',
  }
  return map[type] ?? '🔗'
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

/** 成果分类配置 */
export interface Category {
  id: string
  name: string
  icon: string
}

export const WORK_CATEGORIES: Category[] = [
  { id: 'all',       name: '全部', icon: '🏛️' },
  { id: 'video',     name: '视频', icon: '🎬' },
  { id: 'audio',     name: '音频', icon: '🎵' },
  { id: 'image',     name: '图片', icon: '🖼️' },
  { id: 'doc',       name: '文档', icon: '📄' },
  { id: 'research',  name: '科研', icon: '🔬' },
  { id: 'volunteer', name: '志愿', icon: '🤝' },
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
