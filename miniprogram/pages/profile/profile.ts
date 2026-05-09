// pages/profile/profile.ts
import { getUserStats } from '../../utils/api'

const app = getApp<IAppOption>()

Page({
  data: {
    userInfo: null as AppUserInfo | null,
    stats: {
      publishCount: 0,
      likeCount: 0,
      viewCount: 0,
    },
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ userInfo })
    this._loadStats()
  },

  async _loadStats() {
    try {
      const stats = await getUserStats()
      this.setData({ stats })
    } catch (err: any) {
      console.warn('[Profile] 获取统计数据失败:', err.message || err)
    }
  },

    onMenuTap(e: any) {
    const key: string = e.currentTarget.dataset.key
    switch (key) {
            case 'myPublish':
        // 跳转到大厅页，显示我的发布
        app.globalData.hallMode = 'my'
        wx.switchTab({ url: '/pages/hall/hall' })
        break
            case 'myLike':
        // 跳转到大厅页，显示我的点赞
        app.globalData.hallMode = 'liked'
        wx.switchTab({ url: '/pages/hall/hall' })
        break
      case 'publish':
        wx.navigateTo({ url: '/pages/publish/publish' })
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
          wx.redirectTo({ url: '/pages/login/login' })
        }
      },
    })
  },
})