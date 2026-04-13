// viewer.ts
Page({
  data: {
    type: '',
    fileUrl: '',
    title: '',
    audioPlaying: false,
    audioProgress: 0,
    audioDuration: 100,
    audioCurrentTime: '0:00',
    audioDurationText: '0:00',
  },

  _audio: null as WechatMiniprogram.InnerAudioContext | null,

  onLoad(options: any) {
    const type = options.type || ''
    const fileUrl = decodeURIComponent(options.url || '')
    const title = decodeURIComponent(options.title || '文件预览')
    this.setData({ type, fileUrl, title })
    wx.setNavigationBarTitle({ title })

    if (type === 'audio') {
      this._initAudio(fileUrl)
    }
  },

  _initAudio(src: string) {
    const audio = wx.createInnerAudioContext()
    audio.src = src
    audio.onTimeUpdate(() => {
      this.setData({
        audioProgress: Math.floor(audio.currentTime),
        audioCurrentTime: this._fmt(audio.currentTime),
      })
    })
    audio.onCanplay(() => {
      this.setData({
        audioDuration: Math.floor(audio.duration) || 100,
        audioDurationText: this._fmt(audio.duration),
      })
    })
    audio.onEnded(() => this.setData({ audioPlaying: false }))
    this._audio = audio
  },

  _fmt(sec: number): string {
    const s = Math.floor(sec || 0)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  },

  onAudioPlay() {
    const audio = this._audio
    if (!audio) return
    if (this.data.audioPlaying) {
      audio.pause()
      this.setData({ audioPlaying: false })
    } else {
      audio.play()
      this.setData({ audioPlaying: true })
    }
  },

  onSliderChange(e: any) {
    const audio = this._audio
    if (!audio) return
    audio.seek(e.detail.value)
  },

  onImageTap() {
    wx.previewImage({
      urls: [this.data.fileUrl],
      current: this.data.fileUrl,
    })
  },

  onOpenDoc() {
    const { fileUrl } = this.data
    if (!fileUrl) {
      wx.showToast({ title: '暂无文件链接', icon: 'none' })
      return
    }
    wx.downloadFile({
      url: fileUrl,
      success(res) {
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail() {
            wx.showToast({ title: '无法打开文件', icon: 'none' })
          },
        })
      },
      fail() {
        wx.showToast({ title: '下载失败', icon: 'none' })
      },
    })
  },

  onUnload() {
    this._audio?.destroy()
  },
})
