// pages/viewer/viewer.ts — 作品详情页（真实 API 版）
import { formatDuration, toast } from '../../utils/util'
import { getWorkDetail, toggleLike, request } from '../../utils/api'

Page({
  data: {
    id: '' as string,
    type: '' as string,
    fileUrl: '' as string,
    title: '' as string,
    author: '' as string,
    authorAvatar: '' as string,
    description: '' as string,
    date: '' as string,
    tags: [] as string[],
    // 图片多图模式
    imageList: [] as string[],
    // 音频
    audioPlaying: false,
    audioProgress: 0,         // 当前秒数
    audioDuration: 100,       // 总秒数（slider max）
    audioCurrentTime: '00:00',
    audioDurationText: '00:00',
    // 操作
    liked: false,
    likesCount: 0,
    views: 0,
    docLoading: false,
    loading: true,
  },

  _audio: null as WechatMiniprogram.InnerAudioContext | null,
  _workId: '',

  async onLoad(options: any) {
    const id = options.id || ''
    if (!id) { toast('作品ID无效'); return }
    this._workId = id
    this.setData({ id, loading: true })

    try {
      // 1. 从后端加载作品详情
      const detail = await getWorkDetail(id)

      this.setData({
        type: detail.type || '',
        fileUrl: detail.fileUrl || '',
        title: detail.title || '文件预览',
        author: detail.author || '',
        authorAvatar: detail.authorAvatar || '',
        description: detail.description || '',
        date: detail.date || '',
        tags: detail.tags || [],
        imageList: detail.imageList || [],
        liked: detail.liked || false,
        likesCount: detail.likes || 0,
        views: detail.views || 0,
        loading: false,
      })

      wx.setNavigationBarTitle({ title: detail.title || '文件预览' })

      // 2. 如果是音频则初始化播放器
      if (detail.type === 'audio' && detail.fileUrl) {
        this._initAudio(detail.fileUrl)
      }

      // 3. 异步记录浏览量（不阻塞）
      this._recordView(id)
    } catch (err: any) {
      console.error('[Viewer] 加载失败:', err)
      toast('作品加载失败')
      this.setData({ loading: false })
    }
  },

  /** 异步记录浏览量 */
  async _recordView(id: string) {
    try {
      await request({ url: `/works/${id}/view`, method: 'POST', needAuth: false })
      this.setData({ views: this.data.views + 1 })
    } catch { /* 静默 */ }
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
      path: `/pages/viewer/viewer?type=${this.data.type}&url=${encodeURIComponent(this.data.fileUrl)}&title=${encodeURIComponent(this.data.title)}`,
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
    this._audio?.seek(e.detail.value)
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

  // ─── 文档（PDF）───────────────────────────────────────
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

  // ─── 操作栏 ─────────────────────────────────────────────
  async onLike() {
    try {
      const result = await toggleLike(this._workId)
      this.setData({
        liked: result.liked,
        likesCount: result.likesCount,
      })
      toast(result.liked ? '已点赞 ❤️' : '已取消点赞')
    } catch (err: any) {
      toast('操作失败，请重试')
    }
  },

  onShare() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] })
  },

  onDownload() {
    const { fileUrl, type } = this.data
    if (!fileUrl) { toast('暂无可下载文件'); return }
    wx.showLoading({ title: '下载中…' })
    wx.downloadFile({
      url: fileUrl,
      success: res => {
        wx.hideLoading()
        if (res.statusCode !== 200) { toast('下载失败'); return }
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
      fail: () => { wx.hideLoading(); toast('下载失败') },
    })
  },
})
