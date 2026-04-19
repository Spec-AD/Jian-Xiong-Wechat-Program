// pages/viewer/viewer.ts
import { formatDuration, toast } from '../../utils/util'

Page({
  data: {
    type: '' as string,
    fileUrl: '' as string,
    title: '' as string,
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
    docLoading: false,
  },

  _audio: null as WechatMiniprogram.InnerAudioContext | null,

  onLoad(options: any) {
    const type      = options.type || ''
    const fileUrl   = decodeURIComponent(options.url || '')
    const title     = decodeURIComponent(options.title || '文件预览')
    let imageList: string[] = []
    try {
      imageList = JSON.parse(decodeURIComponent(options.imageList || '[]'))
    } catch { imageList = [] }

    this.setData({ type, fileUrl, title, imageList })
    wx.setNavigationBarTitle({ title })

    if (type === 'audio') this._initAudio(fileUrl)
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
  onLike() {
    const liked = !this.data.liked
    this.setData({ liked })
    toast(liked ? '已点赞 ❤️' : '已取消点赞')
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
