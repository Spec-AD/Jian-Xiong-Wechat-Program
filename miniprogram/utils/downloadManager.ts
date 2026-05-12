/**
 * utils/downloadManager.ts — 健雄书院下载管理器
 *
 * 功能：
 *  - 管理下载任务（添加、移除、查询）
 *  - 追踪下载进度、速度、预计剩余时间
 *  - 持久化存储下载记录
 */

const DOWNLOADS_KEY = 'jianxiong_downloads'

export interface DownloadRecord {
  /** 下载任务唯一 ID */
  id: string
  /** 作品 ID */
  workId: string
  /** 作品标题 */
  title: string
  /** 作品类型 */
  type: string
  /** 下载来源 URL */
  url: string
  /** 本地文件路径（下载完成后） */
  localPath: string
  /** 文件总大小（字节） */
  totalBytes: number
  /** 已下载大小（字节） */
  downloadedBytes: number
  /** 下载进度百分比（0-100） */
  progress: number
  /** 当前下载速度（字节/秒） */
  speed: number
  /** 预计剩余时间（秒） */
  eta: number
  /** 下载状态：downloading | completed | paused | failed */
  status: 'downloading' | 'completed' | 'paused' | 'failed'
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
  /** 失败原因 */
  errorMsg?: string
}

/**
 * 获取所有下载记录
 */
export function getDownloads(): DownloadRecord[] {
  try {
    const raw = wx.getStorageSync(DOWNLOADS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * 保存下载记录列表
 */
function saveDownloads(list: DownloadRecord[]): void {
  wx.setStorageSync(DOWNLOADS_KEY, JSON.stringify(list))
}

/**
 * 根据 ID 获取下载记录
 */
export function getDownloadById(id: string): DownloadRecord | undefined {
  return getDownloads().find((d) => d.id === id)
}

/**
 * 添加下载记录
 */
export function addDownloadRecord(record: Omit<DownloadRecord, 'id' | 'createdAt'>): DownloadRecord {
  const list = getDownloads()
  const newRecord: DownloadRecord = {
    ...record,
    id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  list.unshift(newRecord)
  saveDownloads(list)
  return newRecord
}

/**
 * 更新下载记录
 */
export function updateDownloadRecord(id: string, updates: Partial<DownloadRecord>): void {
  const list = getDownloads()
  const index = list.findIndex((d) => d.id === id)
  if (index !== -1) {
    list[index] = { ...list[index], ...updates }
    saveDownloads(list)
  }
}

/**
 * 删除一条下载记录
 */
export function removeDownloadRecord(id: string): void {
  const list = getDownloads()
  const filtered = list.filter((d) => d.id !== id)
  saveDownloads(filtered)
}

/**
 * 清空所有下载记录
 */
export function clearDownloads(): void {
  wx.removeStorageSync(DOWNLOADS_KEY)
}

/**
 * 获取活跃下载数
 */
export function getActiveDownloadCount(): number {
  return getDownloads().filter((d) => d.status === 'downloading').length
}

/**
 * 格式化文件大小（友好显示）
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化速度
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '--'
  return formatFileSize(bytesPerSec) + '/s'
}

/**
 * 格式化预计剩余时间
 */
export function formatETA(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '--'
  if (seconds < 60) return Math.ceil(seconds) + '秒'
  if (seconds < 3600) return Math.ceil(seconds / 60) + '分钟'
  return (seconds / 3600).toFixed(1) + '小时'
}

/**
 * 下载状态中文标签
 */
export function getStatusLabel(status: DownloadRecord['status']): string {
  const map: Record<DownloadRecord['status'], string> = {
    downloading: '下载中',
    completed: '已完成',
    paused: '已暂停',
    failed: '失败',
  }
  return map[status] || '未知'
}

/**
 * 获取下载统计
 */
export function getDownloadStats(): {
  total: number
  completed: number
  downloading: number
  failed: number
  totalSize: number
} {
  const list = getDownloads()
  return {
    total: list.length,
    completed: list.filter((d) => d.status === 'completed').length,
    downloading: list.filter((d) => d.status === 'downloading').length,
    failed: list.filter((d) => d.status === 'failed').length,
    totalSize: list.reduce((sum, d) => sum + d.totalBytes, 0),
  }
}
