// pages/viewer/viewer.ts — 素材详情页（信息卡片 + 评论区 + 统一模板）
import { formatDuration, formatRelativeTime, getPlatformIcon, toast } from '../../utils/util'
import { getWorkDetail, toggleLike, recordView, getWorkComments, addWorkComment, deleteWork, getUserProfile, getToken, requireAuth } from '../../utils/api'
import { markdownToHtml } from '../../utils/markdown'

const app = getApp<IAppOption>()

Page({
  data: {
    id: '' as string,
    type: '' as string,
    fileUrl: '' as string,
    cover: '' as string,
    title: '' as string,
    author: '' as string,
    authorAvatar: '' as string,
    authorStudentId: '' as string,
    actualAuthor: '' as string,
    description: '' as string,
    date: '' as string,
    tags: [] as string[],
    externalLink: '' as string,
    platform: '' as string,
    platformIcon: '' as string,
    // 图片多图模式
    imageList: [] as string[],
    // 音频
    audioPlaying: false,
    audioProgress: 0,
    audioDuration: 100,
    audioCurrentTime: '00:00',
    audioDurationText: '00:00',
    // Markdown 渲染
    mdHtml: '' as string,
    mdLoading: false,
    // 操作
    liked: false,
    likesCount: 0,
    views: 0,
    commentsCount: 0,
    // 格式化后的显示值
    viewsDisplay: '0',
    likesCountDisplay: '0',
    commentsCountDisplay: '0',
    dateDisplay: '',
    docLoading: false,
    loading: true,
    // 评论
    comments: [] as Array<{
      id: string
      author: string
      authorAvatar: string
      content: string
      createdAt: string
      relativeTime: string
    }>,
    commentText: '',
    sendingComment: false,
    commentInputFocused: false,
    // 权限控制
    canEdit: false,
    // 多文件模式下用于跳转
    fileIndex: 0,
    totalFiles: 0,
  },

  _audio: null as WechatMiniprogram.InnerAudioContext | null,
  _workId: '',

  async onLoad(options: any) {
    const id = options.id || ''
    if (!id) { toast('作品ID无效'); return }
    this._workId = id
    this.setData({ id, loading: true })

    try {
      // 1. 并发加载作品详情 + 评论
      const [detail, commentsData] = await Promise.all([
        getWorkDetail(id),
        getWorkComments(id).catch(() => ({ list: [] })),
      ])

      // 2. 组装作品数据
      const rawViews = detail.views || 0
      const rawLikes = detail.likes || 0
      const commentsAny = (commentsData as any)
      const rawCommentsCount = (commentsAny && commentsAny.list && commentsAny.list.length) || detail.commentsCount || 0

      // 检测是否为 Markdown 文件（按类型或按文件后缀）
      let resolvedType = detail.type || ''
      if (resolvedType !== 'markdown' && detail.fileUrl) {
        const ext = detail.fileUrl.split('.').pop()?.toLowerCase()
        if (ext === 'md' || ext === 'markdown') {
          resolvedType = 'markdown'
        }
      }

      this.setData({
        type: resolvedType,
        fileUrl: detail.fileUrl || '',
        cover: detail.cover || '',
        title: detail.title || '作品预览',
        author: detail.author || '',
        authorAvatar: detail.authorAvatar || '',
        authorStudentId: detail.authorStudentId || '',
        actualAuthor: detail.actualAuthor || '',
        description: detail.description || '',
        date: detail.date || detail.createdAt || '',
        tags: detail.tags || [],
        imageList: detail.imageList || [],
        externalLink: detail.externalLink || '',
        platform: detail.platform || '',
        platformIcon: getPlatformIcon(detail.platform || ''),
        liked: detail.liked || false,
        likesCount: rawLikes,
        views: rawViews,
        commentsCount: rawCommentsCount,
        // 预计算格式化显示值
        viewsDisplay: this._formatCount(rawViews),
        likesCountDisplay: this._formatCount(rawLikes),
        commentsCountDisplay: this._formatCount(rawCommentsCount),
        dateDisplay: this._formatDate(detail.date || detail.createdAt),
        loading: false,
      })

      // 3. 处理评论列表（添加相对时间）
      const commentsAny2 = (commentsData as any)
      const rawComments = (commentsAny2 && commentsAny2.list) || []
      this.setData({
        comments: rawComments.map((c: any) => ({
          id: c.id,
          author: c.author,
          authorAvatar: c.authorAvatar,
          content: c.content,
          createdAt: c.createdAt,
          relativeTime: formatRelativeTime(c.createdAt),
        })),
      })

      wx.setNavigationBarTitle({ title: detail.title || '作品预览' })

      // 4. 检查编辑权限（仅管理员可编辑）
      this._checkEditPermission()

      // 5. 如果是音频则初始化播放器
      if (detail.type === 'audio' && detail.fileUrl) {
        this._initAudio(detail.fileUrl)
      }

      // 6. 如果是 Markdown 则渲染
      if (detail.type === 'markdown' && detail.fileUrl) {
        this._renderMarkdown(detail.fileUrl)
      }

      // 7. 异步记录浏览量
      this._recordView(id)
    } catch (err: any) {
      console.error('[Viewer] 加载失败:', err)
      toast('作品加载失败')
      this.setData({ loading: false })
    }
  },

  // ─── 工具函数：格式化大数字（1234 → 1.2k）─────
  _formatCount(val: number): string {
    if (!val && val !== 0) return '0'
    if (val >= 10000) return (val / 10000).toFixed(1) + 'w'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
    return String(val)
  },

  /** 格式化时间为 YYYY-MM-DD HH:mm */
  _formatDate(val: string | undefined): string {
    if (!val) return ''
    try {
      const d = new Date(val)
      if (isNaN(d.getTime())) return val
      const Y = d.getFullYear()
      const M = String(d.getMonth() + 1).padStart(2, '0')
      const D = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const m = String(d.getMinutes()).padStart(2, '0')
      return `${Y}-${M}-${D} ${h}:${m}`
    } catch {
      return val
    }
  },

  /** 异步记录浏览量（同时记录浏览历史） */
  async _recordView(id: string) {
    try {
      await recordView(id)
      const newViews = this.data.views + 1
      this.setData({ 
        views: newViews,
        viewsDisplay: this._formatCount(newViews),
      })
    } catch { /* 静默 */ }
  },

  /** 渲染 Markdown 内容 */
  async _renderMarkdown(url: string) {
    if (!url) return
    this.setData({ mdLoading: true })
    try {
      const res = await new Promise<string>((resolve, reject) => {
        wx.request({
          url,
          method: 'GET',
          success: (resp) => {
            if (resp.statusCode === 200) {
              resolve(resp.data as string)
            } else {
              reject(new Error('获取 Markdown 内容失败'))
            }
          },
          fail: (err) => reject(err),
        })
      })
      const html = markdownToHtml(res)
      this.setData({ mdHtml: html, mdLoading: false })
    } catch (err: any) {
      console.error('[Viewer] Markdown 渲染失败:', err)
      toast('Markdown 内容加载失败')
      this.setData({ mdLoading: false })
    }
  },

  onUnload() {
    if (this._audio) {
      this._audio.stop()
      this._audio.destroy()
      this._audio = null
    }
  },

  onShareAppMessage() {
    return {
      title: this.data.title,
      path: `/pages/viewer/viewer?id=${this._workId}`,
    }
  },

  // ─── 音频 ───────────────────────────────────────────────
  _initAudio(src: string) {
    if (!src) return
    const audio = wx.createInnerAudioContext()
    audio.src = src
    audio.obeyMuteSwitch = false

    audio.onTimeUpdate(() => {
      const cur = audio.currentTime
      const dur = audio.duration || 0
      this.setData({
        audioProgress: Math.floor(cur),
        audioCurrentTime: formatDuration(cur),
        audioDuration: Math.max(Math.floor(dur), 1),
        audioDurationText: formatDuration(dur),
      })
    })
    audio.onPlay(()   => this.setData({ audioPlaying: true }))
    audio.onPause(()  => this.setData({ audioPlaying: false }))
    audio.onStop(()   => this.setData({ audioPlaying: false, audioProgress: 0, audioCurrentTime: '00:00' }))
    audio.onEnded(()  => this.setData({ audioPlaying: false }))
    audio.onError((e) => { console.error('[audio]', e); toast('音频加载失败') })

    this._audio = audio
  },

  onAudioPlay() {
    const audio = this._audio
    if (!audio) return
    this.data.audioPlaying ? audio.pause() : audio.play()
  },

  onSliderChange(e: any) {
    if (this._audio) { this._audio.seek(e.detail.value) }
  },

  onSeekBack() {
    if (!this._audio) return
    this._audio.seek(Math.max(0, this._audio.currentTime - 15))
  },

  onSeekForward() {
    if (!this._audio) return
    const dur = this._audio.duration || 0
    this._audio.seek(Math.min(dur, this._audio.currentTime + 15))
  },

  // ─── 图片 ───────────────────────────────────────────────
  onImageTap(e: any) {
    const src = e.currentTarget.dataset.src as string
    const { imageList, fileUrl } = this.data
    const urls = imageList.length > 0 ? imageList : [fileUrl]
    wx.previewImage({ urls, current: src || fileUrl, showmenu: true })
  },

  // ─── 外链作品：打开外部链接 ────────────────────────────
  onOpenExternalLink() {
    const { externalLink, platform } = this.data
    if (!externalLink) { toast('暂无外部链接'); return }
    wx.setClipboardData({
      data: externalLink,
      success: () => {
        wx.showToast({ title: `链接已复制，可在浏览器中打开${platform ? '（' + platform + '）' : ''}`, icon: 'none' })
      },
    })
  },

  // ─── 文档预览 ───────────────────────────────────────────
  onOpenDoc() {
    const { fileUrl } = this.data
    if (!fileUrl) { toast('暂无文件链接'); return }
    this.setData({ docLoading: true })
    wx.showLoading({ title: '正在加载…' })
    wx.downloadFile({
      url: fileUrl,
      success: res => {
        wx.hideLoading()
        this.setData({ docLoading: false })
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            fail: () => toast('无法打开文件'),
          })
        } else {
          toast('文件下载失败')
        }
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ docLoading: false })
        toast('下载失败，请检查网络')
      },
    })
  },

  // ─── 点赞 ───────────────────────────────────────────────
  async onLike() {
    try {
      const result = await toggleLike(this._workId)
      this.setData({
        liked: result.liked,
        likesCount: result.likesCount,
        likesCountDisplay: this._formatCount(result.likesCount),
      })
      toast(result.liked ? '已点赞' : '已取消点赞')
    } catch (err: any) {
      toast('操作失败，请重试')
    }
  },

  // ─── 分享 ───────────────────────────────────────────────
  onShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] })
  },

  // ─── 编辑作品（管理员） ───────────────────────────
  onEdit() {
    // 未登录时跳转登录页
    if (!requireAuth()) return
    wx.navigateTo({ url: `/pages/edit-work/edit-work?id=${this._workId}` })
  },

  /** 删除作品（管理员） */
  onDelete() {
    const { title } = this.data

    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${title || '作品'}」吗？此操作不可恢复。`,
      confirmColor: '#e57373',
      confirmText: '删除',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中…', mask: true })
          try {
            await deleteWork(this._workId)
            wx.hideLoading()
            toast('已删除', 'success')
            wx.navigateBack()
          } catch (err: any) {
            wx.hideLoading()
            toast(err.message || '删除失败')
          }
        }
      },
    })
  },

  /** 检查编辑权限（仅管理员可编辑/删除） */
  async _checkEditPermission() {
    // 未登录则无编辑权限
    if (!getToken()) {
      this.setData({ canEdit: false })
      return
    }

    try {
      const profile = await getUserProfile()
      this.setData({ canEdit: profile.role === 'admin' })
    } catch {
      // 获取用户信息失败，默认无编辑权限
      this.setData({ canEdit: false })
    }
  },

  // ─── 下载（带进度追踪）───────────────────────────────────
  onDownload() {
    const { fileUrl, type, title, id: workId } = this.data
    if (!fileUrl) { toast('暂无可下载文件'); return }
    wx.showLoading({ title: '准备下载…' })

    // 从后端获取文件大小信息（HEAD 请求）
    let expectedBytes = 0

    const doDownload = () => {
      const startTime = Date.now()
      let lastBytes = 0
      let lastTime = startTime

      const task = wx.downloadFile({
        url: fileUrl,
        success: res => {
          wx.hideLoading()
          if (res.statusCode !== 200) {
            // 更新记录为失败
            const { updateDownloadRecord } = require('../../utils/downloadManager')
            updateDownloadRecord(recordId, {
              status: 'failed',
              errorMsg: '服务器返回 ' + res.statusCode,
            })
            toast('下载失败')
            return
          }

          // 更新记录为完成
          const { updateDownloadRecord } = require('../../utils/downloadManager')
          updateDownloadRecord(recordId, {
            status: 'completed',
            progress: 100,
            downloadedBytes: expectedBytes,
            localPath: res.tempFilePath,
            completedAt: new Date().toISOString(),
          })

          // 根据类型自动处理
          if (type === 'image') {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => toast('图片已保存到相册', 'success'),
              fail: () => toast('保存失败，请授权相册权限'),
            })
          } else if (type === 'video') {
            wx.saveVideoToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => toast('视频已保存到相册', 'success'),
              fail: () => toast('保存失败，请授权相册权限'),
            })
          } else {
            wx.openDocument({ filePath: res.tempFilePath, showMenu: true,
              success: () => toast('文件已打开，可从菜单另存') })
          }
        },
        fail: (err) => {
          wx.hideLoading()
          const { updateDownloadRecord } = require('../../utils/downloadManager')
          updateDownloadRecord(recordId, {
            status: 'failed',
            errorMsg: err.errMsg || '网络异常',
          })
          toast('下载失败，请检查网络')
        },
      })

      // 追踪下载进度
      task.onProgressUpdate((res) => {
        const now = Date.now()
        const elapsed = (now - lastTime) / 1000 // 秒
        const bytesDelta = res.totalBytesWritten - lastBytes
        const speed = elapsed > 0 ? bytesDelta / elapsed : 0

        // 估算剩余时间
        const remaining = res.totalBytesExpectedToWrite - res.totalBytesWritten
        const eta = speed > 0 ? remaining / speed : 0

        lastBytes = res.totalBytesWritten
        lastTime = now
        expectedBytes = res.totalBytesExpectedToWrite

        const { updateDownloadRecord } = require('../../utils/downloadManager')
        updateDownloadRecord(recordId, {
          progress: res.progress,
          downloadedBytes: res.totalBytesWritten,
          totalBytes: res.totalBytesExpectedToWrite,
          speed: Math.round(speed),
          eta: Math.round(eta),
        })
      })
    }

    // 创建下载记录
    const { addDownloadRecord } = require('../../utils/downloadManager')
    const record = addDownloadRecord({
      workId,
      title: title || '未知作品',
      type,
      url: fileUrl,
      localPath: '',
      totalBytes: 0,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'downloading',
    })
    const recordId = record.id

    // 开始下载
    wx.hideLoading()
    wx.showToast({ title: '开始下载', icon: 'success', duration: 1500 })
    doDownload()
  },

  /** 跳转到下载管理页 */
  onGoDownloads() {
    wx.navigateTo({ url: '/pages/downloads/downloads' })
  },

  // ─── 评论功能 ───────────────────────────────────────────

  /** 输入框聚焦 */
  onCommentFocus() {
    this.setData({ commentInputFocused: true })
  },

  /** 输入框输入（实时更新 commentText，使发送按钮高亮） */
  onCommentInput(e: any) {
    this.setData({ commentText: e.detail.value || '' })
  },

  /** 输入框失焦 */
  onCommentBlur(e: any) {
    this.setData({
      commentInputFocused: false,
      commentText: e.detail.value || '',
    })
  },

  /** 键盘发送（confirm-type="send"） */
  onCommentConfirm(e: any) {
    const text = (e.detail.value || '').trim()
    if (text) {
      this.setData({ commentText: text })
      this._submitComment(text)
    }
  },

  /** 点击发送按钮 */
  onSendComment() {
    const text = (this.data.commentText || '').trim()
    if (text) {
      this._submitComment(text)
    }
  },

  /** 提交评论 */
  async _submitComment(content: string) {
    if (this.data.sendingComment) return
    if (!content.trim()) {
      toast('请输入评论内容')
      return
    }
    this.setData({ sendingComment: true })

    try {
      const result = await addWorkComment(this._workId, content)

      // 将新评论插入列表顶部
      const newComment = {
        id: result.comment.id,
        author: result.comment.author,
        authorAvatar: result.comment.authorAvatar,
        content: result.comment.content,
        createdAt: result.comment.createdAt,
        relativeTime: '刚刚',
      }

      this.setData({
        comments: [newComment, ...this.data.comments],
        commentsCount: this.data.commentsCount + 1,
        commentText: '',
        sendingComment: false,
      })

      toast('评论成功', 'success')
    } catch (err: any) {
      // 显示后端返回的具体错误信息（如：内容不能为空、请先登录等）
      toast(err.message || '评论发送失败，请重试')
      this.setData({ sendingComment: false })
    }
  },
})


