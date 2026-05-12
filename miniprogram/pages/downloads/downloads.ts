// pages/downloads/downloads.ts — 我的下载页面
import {
  getDownloads,
  removeDownloadRecord,
  clearDownloads,
  formatFileSize,
  formatSpeed,
  formatETA,
  getStatusLabel,
  getDownloadStats,
  DownloadRecord,
} from '../../utils/downloadManager'
import { toast } from '../../utils/util'

Page({
  data: {
    downloads: [] as DownloadRecord[],
    stats: {
      total: 0,
      completed: 0,
      downloading: 0,
      failed: 0,
      totalSize: 0,
    },
    /** 当前筛选：all | completed | downloading | failed */
    filter: 'all' as 'all' | 'completed' | 'downloading' | 'failed',
    /** 是否为空 */
    isEmpty: true,
    /** 是否显示管理模式（可删除） */
    manageMode: false,
  },

  onShow() {
    this._refresh()
  },

  /** 刷新数据 */
  _refresh() {
    const all = getDownloads()
    const stats = getDownloadStats()
    const filtered = this._getFiltered(all, this.data.filter)
    this.setData({
      downloads: filtered,
      stats,
      isEmpty: all.length === 0,
    })
  },

  /** 按筛选条件过滤 */
  _getFiltered(list: DownloadRecord[], filter: string): DownloadRecord[] {
    if (filter === 'all') return list
    return list.filter((d) => d.status === filter)
  },

  /** 切换筛选 */
  onFilterChange(e: any) {
    const filter = e.currentTarget.dataset.filter as string
    this.setData({ filter }, () => this._refresh())
  },

  /** 切换管理模式 */
  onToggleManage() {
    this.setData({ manageMode: !this.data.manageMode })
  },

  /** 删除单条记录 */
  onDeleteItem(e: any) {
    const id = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条下载记录吗？',
      confirmColor: '#e57373',
      success: (res) => {
        if (res.confirm) {
          removeDownloadRecord(id)
          this._refresh()
          toast('已删除')
        }
      },
    })
  },

  /** 清空所有记录 */
  onClearAll() {
    wx.showModal({
      title: '清空记录',
      content: '确定要清空所有下载记录吗？此操作不可恢复。',
      confirmColor: '#e57373',
      success: (res) => {
        if (res.confirm) {
          clearDownloads()
          this._refresh()
          toast('已清空')
        }
      },
    })
  },

  /** 尝试重新下载失败的项目 */
  onRetry(e: any) {
    const id = e.currentTarget.dataset.id as string
    const record = getDownloads().find((d) => d.id === id)
    if (!record) return
    // 触发重新下载 - 通过事件或者直接使用记录中的url
    wx.showLoading({ title: '重新下载中…' })
    const task = wx.downloadFile({
      url: record.url,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          // 更新记录状态
          const { updateDownloadRecord } = require('../../utils/downloadManager')
          updateDownloadRecord(id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            progress: 100,
            downloadedBytes: record.totalBytes,
            localPath: res.tempFilePath,
          })
          this._refresh()
          toast('下载完成', 'success')
        } else {
          toast('下载失败')
        }
      },
      fail: () => {
        wx.hideLoading()
        toast('下载失败，请检查网络')
      },
    })
    // 更新状态
    const { updateDownloadRecord } = require('../../utils/downloadManager')
    updateDownloadRecord(id, { status: 'downloading', errorMsg: '' })
    this._refresh()

    // 追踪进度
    task.onProgressUpdate((res) => {
      updateDownloadRecord(id, {
        progress: res.progress,
        downloadedBytes: res.totalBytesWritten,
        totalBytes: res.totalBytesExpectedToWrite,
      })
      // 实时更新界面
      this._refresh()
    })
  },

  /** 打开已下载的文件 */
  onOpenFile(e: any) {
    const id = e.currentTarget.dataset.id as string
    const record = getDownloads().find((d) => d.id === id)
    if (!record || !record.localPath) {
      toast('文件不存在')
      return
    }
    wx.openDocument({
      filePath: record.localPath,
      showMenu: true,
      fail: () => toast('无法打开文件'),
    })
  },
})
