// pages/detail/detail.js
const app = getApp()
const { getFileType, getFileTypeLabel, formatDuration, toast, ACHIEVEMENT_CATEGORIES } = require('../../utils/util')

// ─── 模拟数据（同大厅页，后端联调时替换）───
const MOCK_MAP = {
  '1': {
    id: '1', title: '《健雄之声》院歌演唱',
    description: '由书院合唱团精心演绎，这首院歌凝聚了健雄书院全体师生的情感与记忆。\n\n歌词由书院文学社创作，曲调融合了南京民间音乐元素，旋律优美动人。\n\n2024年春季学期，合唱团历经三个月排练，在书院年度文艺晚会上首演，获得全场热烈掌声。',
    category: 'art', fileType: 'audio',
    fileUrl: 'https://www.w3schools.com/html/horse.mp3', // 测试音频
    coverUrl: '/assets/images/mock/cover1.jpg',
    authorName: '书院合唱团', authorAvatar: '', views: 128, likes: 36,
    publishTime: '2024-05-20', tags: ['音乐', '合唱', '院歌', '文艺'],
    imageList: []
  },
  '2': {
    id: '2', title: '2024年科研创新大赛一等奖',
    description: '本项目聚焦水环境智能监测领域，基于机器学习算法（XGBoost + LSTM）实现对水体中重金属、有机物等污染指标的实时预测。\n\n系统在实际河道测试中达到 95.3% 的准确率，已向相关部门提交专利申请（申请号：CN2024XXXXX）。',
    category: 'research', fileType: 'pdf',
    fileUrl: 'https://www.africau.edu/images/default/sample.pdf', // 测试PDF
    coverUrl: '/assets/images/mock/cover2.jpg',
    authorName: '张明远', authorAvatar: '', views: 256, likes: 88,
    publishTime: '2024-06-15', tags: ['科研', '机器学习', '水质检测', '竞赛'],
    imageList: []
  },
  '3': {
    id: '3', title: '书院运动会精彩瞬间',
    description: '2024年健雄书院运动会，同学们奋力拼搏，展现了书院人的运动风采与团队精神。本视频记录了田径、球类等多个项目的精彩片段。',
    category: 'sports', fileType: 'video',
    fileUrl: 'https://www.w3schools.com/html/movie.mp4', // 测试视频
    coverUrl: '/assets/images/mock/cover3.jpg',
    authorName: '体育部', authorAvatar: '', views: 512, likes: 164,
    publishTime: '2024-04-28', tags: ['运动会', '体育', '团队'],
    imageList: []
  },
  '4': {
    id: '4', title: '校园摄影展——《光影里的健雄》',
    description: '用镜头记录书院四季风貌，长图展示全景摄影作品集。作品拍摄于2023-2024学年，涵盖书院建筑、师生风采、节日活动等主题。',
    category: 'art', fileType: 'image',
    fileUrl: 'https://picsum.photos/750/2000', // 测试长图
    coverUrl: '/assets/images/mock/cover4.jpg',
    authorName: '李晓婷', authorAvatar: '', views: 341, likes: 102,
    publishTime: '2024-03-10', tags: ['摄影', '文艺', '书院风光'],
    imageList: ['https://picsum.photos/750/2000', 'https://picsum.photos/750/1500']
  },
  '5': {
    id: '5', title: '乡村支教志愿服务报告',
    description: '暑期赴苏北农村支教15天，服务学生200余名，开展科学、艺术、体育等课程。本报告详细记录了支教全程，附有教学计划、总结与学生反馈。',
    category: 'volunteer', fileType: 'pdf',
    fileUrl: 'https://www.africau.edu/images/default/sample.pdf',
    coverUrl: '/assets/images/mock/cover5.jpg',
    authorName: '志愿服务队', authorAvatar: '', views: 189, likes: 67,
    publishTime: '2024-08-30', tags: ['志愿', '支教', '社会实践'],
    imageList: []
  }
}

Page({
  data: {
    item: null,
    loading: true,
    liked: false,
    // 音频
    audioPlaying: false,
    audioProgress: 0,
    audioCurrentTime: '00:00',
    audioDuration: '00:00',
    // PDF
    pdfLoading: false
  },

  _audioContext: null,

  onLoad(options) {
    const { id } = options
    this._loadDetail(id)
  },

  onUnload() {
    // 离开页面时停止音频
    if (this._audioContext) {
      this._audioContext.stop()
      this._audioContext.destroy()
      this._audioContext = null
    }
  },

  onShareAppMessage() {
    const { item } = this.data
    return {
      title: item ? item.title : '健雄书院成果展示',
      path: `/pages/detail/detail?id=${item ? item.id : ''}`,
      imageUrl: item ? item.coverUrl : ''
    }
  },

  // ─────────────────────────────
  //  数据加载
  // ─────────────────────────────
  _loadDetail(id) {
    this.setData({ loading: true })

    // TODO: 替换为 request({ url: `${app.globalData.baseUrl}/achievement/${id}` })
    setTimeout(() => {
      const raw = MOCK_MAP[id]
      if (!raw) {
        toast('成果不存在')
        setTimeout(() => wx.navigateBack(), 1000)
        return
      }
      const item = {
        ...raw,
        fileType: raw.fileType || getFileType(raw.fileUrl || ''),
        fileTypeLabel: getFileTypeLabel(raw.fileType),
        categoryLabel: ACHIEVEMENT_CATEGORIES.find(c => c.key === raw.category)?.label || '其他'
      }
      this.setData({ item, loading: false })

      // 初始化音频（若为音频类型）
      if (item.fileType === 'audio') {
        this._initAudio(item.fileUrl)
      }
    }, 400)
  },

  // ─────────────────────────────
  //  图片预览（支持长图）
  // ─────────────────────────────
  onImagePreview(e) {
    const { src, list } = e.currentTarget.dataset
    const urls = list && list.length > 0 ? list : [src]
    wx.previewImage({
      current: src,
      urls,
      // 开启长按识别菜单
      showmenu: true
    })
  },

  // ─────────────────────────────
  //  音频控制（wx.createInnerAudioContext）
  // ─────────────────────────────
  _initAudio(src) {
    if (!src) return
    const ctx = wx.createInnerAudioContext()
    ctx.src = src
    ctx.obeyMuteSwitch = false // 静音开关下仍可播放

    ctx.onTimeUpdate(() => {
      const cur = ctx.currentTime
      const dur = ctx.duration || 0
      const progress = dur > 0 ? Math.round((cur / dur) * 100) : 0
      this.setData({
        audioProgress: progress,
        audioCurrentTime: formatDuration(cur),
        audioDuration: formatDuration(dur)
      })
    })

    ctx.onPlay(() => this.setData({ audioPlaying: true }))
    ctx.onPause(() => this.setData({ audioPlaying: false }))
    ctx.onStop(() => this.setData({ audioPlaying: false, audioProgress: 0, audioCurrentTime: '00:00' }))
    ctx.onEnded(() => this.setData({ audioPlaying: false }))
    ctx.onError(err => {
      console.error('[audio error]', err)
      toast('音频加载失败')
    })

    this._audioContext = ctx
  },

  onAudioToggle() {
    if (!this._audioContext) return
    if (this.data.audioPlaying) {
      this._audioContext.pause()
    } else {
      this._audioContext.play()
    }
  },

  onAudioSliderChange(e) {
    if (!this._audioContext) return
    const dur = this._audioContext.duration || 0
    const seekTo = (e.detail.value / 100) * dur
    this._audioContext.seek(seekTo)
  },

  onAudioSeekBack() {
    if (!this._audioContext) return
    const t = Math.max(0, this._audioContext.currentTime - 15)
    this._audioContext.seek(t)
  },

  onAudioSeekForward() {
    if (!this._audioContext) return
    const dur = this._audioContext.duration || 0
    const t = Math.min(dur, this._audioContext.currentTime + 15)
    this._audioContext.seek(t)
  },

  // ─────────────────────────────
  //  视频事件
  // ─────────────────────────────
  onVideoPlay()  { console.log('[video] play') },
  onVideoPause() { console.log('[video] pause') },
  onVideoEnded() { console.log('[video] ended') },
  onVideoError(e){ console.error('[video] error', e.detail); toast('视频加载失败') },

  // ─────────────────────────────
  //  PDF 预览（wx.downloadFile + wx.openDocument）
  // ─────────────────────────────
  onOpenPDF() {
    const { item } = this.data
    if (!item || !item.fileUrl) {
      toast('文件地址不存在')
      return
    }
    this.setData({ pdfLoading: true })

    wx.showLoading({ title: '正在加载文档…' })

    wx.downloadFile({
      url: item.fileUrl,
      success: res => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            showMenu: true, // 显示右上角菜单（可转发、收藏）
            success: () => console.log('[pdf] opened'),
            fail: err => {
              console.error('[pdf] openDocument fail', err)
              toast('文档打开失败')
            }
          })
        } else {
          toast('文件下载失败')
        }
        this.setData({ pdfLoading: false })
      },
      fail: err => {
        wx.hideLoading()
        console.error('[pdf] downloadFile fail', err)
        toast('文件下载失败，请检查网络')
        this.setData({ pdfLoading: false })
      }
    })
  },

  // ─────────────────────────────
  //  操作栏：点赞 / 分享 / 下载
  // ─────────────────────────────
  onLike() {
    const liked = !this.data.liked
    this.setData({ liked })
    // TODO: 调用后端点赞接口
    toast(liked ? '点赞成功 ❤️' : '已取消点赞')
    if (liked) {
      const item = this.data.item
      this.setData({ 'item.likes': item.likes + 1 })
    }
  },

  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onDownload() {
    const { item } = this.data
    if (!item || !item.fileUrl) {
      toast('暂无可下载文件')
      return
    }

    wx.showLoading({ title: '下载中…' })
    wx.downloadFile({
      url: item.fileUrl,
      success: res => {
        wx.hideLoading()
        if (res.statusCode === 200) {
          const ft = item.fileType
          if (ft === 'image') {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => toast('图片已保存到相册'),
              fail: () => toast('保存失败，请授权相册权限')
            })
          } else if (ft === 'video') {
            wx.saveVideoToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => toast('视频已保存到相册'),
              fail: () => toast('保存失败，请授权相册权限')
            })
          } else {
            // PDF / 音频 → 用 openDocument 打开并提示另存
            wx.openDocument({
              filePath: res.tempFilePath,
              showMenu: true,
              success: () => toast('文件已打开，可从菜单另存')
            })
          }
        }
      },
      fail: () => {
        wx.hideLoading()
        toast('下载失败')
      }
    })
  }
})