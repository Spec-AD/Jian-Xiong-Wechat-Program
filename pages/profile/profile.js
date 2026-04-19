// pages/profile/profile.js
const app = getApp()
const { toast } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    myStats: {
      publishCount: 0,
      likeCount: 0,
      viewCount: 0
    }
  },

  onLoad() {
    this._loadUserInfo()
    this._loadStats()
  },

  onShow() {
    this._loadUserInfo()
  },

  // ─────────────────────────────
  //  加载用户信息
  // ─────────────────────────────
  _loadUserInfo() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ userInfo })
  },

  // ─────────────────────────────
  //  加载统计数据（TODO: 对接后端）
  // ─────────────────────────────
  _loadStats() {
    // 模拟数据
    setTimeout(() => {
      this.setData({
        myStats: {
          publishCount: 3,
          likeCount: 186,
          viewCount: 1024
        }
      })
    }, 300)
  },

  // ─────────────────────────────
  //  菜单点击
  // ─────────────────────────────
  onMenuTap(e) {
    const key = e.currentTarget.dataset.key
    switch (key) {
      case 'myPublish':
        toast('我的发布（开发中）')
        break
      case 'myLike':
        toast('我的点赞（开发中）')
        break
      case 'about':
        wx.showModal({
          title: '关于健雄书院',
          content: '健雄书院是南京大学于2021年成立的住宿制学院，以"砺学修身·致知力行"为院训，致力于培养具有综合素质的优秀人才。\n\n本平台展示书院学生在学业、科研、文艺、体育、志愿服务等方面的优秀成果。',
          showCancel: false,
          confirmText: '了解'
        })
        break
      case 'feedback':
        wx.navigateTo({ url: '/pages/logs/logs' })
        break
      case 'privacy':
        wx.showModal({
          title: '隐私政策',
          content: '本应用仅收集您的微信公开信息（头像、昵称）用于个人主页展示，不会对外分享您的个人数据。如有疑问，请联系书院管理员。',
          showCancel: false,
          confirmText: '知道了'
        })
        break
      default:
        break
    }
  },

  // ─────────────────────────────
  //  退出登录
  // ─────────────────────────────
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      confirmColor: '#E53935',
      success: res => {
        if (res.confirm) {
          app.clearUserInfo()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})