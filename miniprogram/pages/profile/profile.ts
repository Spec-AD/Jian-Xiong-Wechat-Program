// pages/profile/profile.ts
import { toast } from '../../utils/util'

const app = getApp<IAppOption>()

Page({
  data: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    stats: {
      publishCount: 0,
      likeCount: 0,
      viewCount: 0,
    },
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    this.setData({ userInfo })
    this._loadStats()
  },

  _loadStats() {
    // TODO: 替换为真实 API 请求
    setTimeout(() => {
      this.setData({
        stats: { publishCount: 3, likeCount: 186, viewCount: 1024 },
      })
    }, 300)
  },

  onMenuTap(e: any) {
    const key: string = e.currentTarget.dataset.key
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
          content:
            '健雄书院是南京大学于2021年成立的住宿制学院，以「砺学修身·致知力行」为院训，致力于培养具有综合素质的优秀人才。\n\n本平台展示书院学生在学业、科研、文艺、体育、志愿服务等方面的优秀成果。',
          showCancel: false,
          confirmText: '了解',
        })
        break
      case 'logs':
        wx.navigateTo({ url: '/pages/logs/logs' })
        break
      case 'privacy':
        wx.showModal({
          title: '隐私政策',
          content:
            '本应用仅收集您的微信公开信息（头像、昵称）用于个人主页展示，不会对外分享您的个人数据。如有疑问，请联系书院管理员。',
          showCancel: false,
          confirmText: '知道了',
        })
        break
    }
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      confirmColor: '#e57373',
      success: res => {
        if (res.confirm) {
          app.clearUserInfo()
          wx.switchTab({ url: '/pages/index/index' })
        }
      },
    })
  },
})