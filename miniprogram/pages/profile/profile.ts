// pages/profile/profile.ts — 个人主页（大重构版：数据中心、编辑资料、隐私设置、认证、浏览记录）
import { getUserStats, request } from '../../utils/api'
import { toast } from '../../utils/util'

const app = getApp<IAppOption>()

/** UID 生成规则：基于 openid 取后6位 */
function generateUid(openid?: string): string {
  if (!openid) return '------'
  let hash = 0
  for (let i = 0; i < openid.length; i++) {
    hash = ((hash << 5) - hash) + openid.charCodeAt(i)
    hash = hash & hash
  }
  const uid = Math.abs(hash % 1000000).toString().padStart(6, '0')
  return 'JX' + uid
}

Page({
    data: {
    userInfo: null as AppUserInfo | null,
    uid: '',
    isVerified: false,
    signature: '',
    stats: {
      publishCount: 0,
      likeCount: 0,
      viewCount: 0,
    } as { publishCount: number; likeCount: number; viewCount: number },
    firstTime: false,
    canPublish: false,
    historyCount: 0,
    /** 是否管理员 */
    isAdmin: false,
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    this.setData({
      userInfo,
      uid: generateUid(app.globalData.openid),
      isVerified: wx.getStorageSync('nju_verified') === true,
    })

    this._loadProfile()
    this._loadStats()
    this._loadHistoryCount()
    this._checkFirstTime()
    this._checkAdmin()
  },

  /** 检查是否为管理员 */
  async _checkAdmin() {
    try {
      const profile = await request<{ role: string }>({
        url: '/user/profile',
        method: 'GET',
      })
      this.setData({ isAdmin: profile.role === 'admin' })
    } catch {
      // 静默降级
    }
  },

  _checkFirstTime() {
    const shown = wx.getStorageSync('profile_first_time_shown')
    if (!shown) {
      this.setData({ firstTime: true })
    }
  },

  onCloseGuide() {
    this.setData({ firstTime: false })
    wx.setStorageSync('profile_first_time_shown', true)
  },

  async _loadProfile() {
    try {
      const profileData = await request<{
        signature?: string
        isVerified?: boolean
        canPublish?: boolean
      }>({ url: '/user/profile', method: 'GET' })
      this.setData({
        signature: profileData.signature || '',
        canPublish: profileData.canPublish ?? false,
      })
    } catch {
      // 静默降级
    }
  },

  async _loadStats() {
    try {
      const stats = await getUserStats()
      this.setData({ stats })
    } catch (err: any) {
      console.warn('[Profile] 获取统计数据失败:', err.message || err)
    }
  },

  async _loadHistoryCount() {
    try {
      const data = await request<{ count: number }>({
        url: '/user/history',
        method: 'GET',
      })
      this.setData({ historyCount: data.count || 0 })
    } catch {
      this.setData({ historyCount: 0 })
    }
  },

  onSyncWechatInfo() {
    wx.getUserProfile({
      desc: '用于展示个人资料',
      success: (res) => {
        const { nickName, avatarUrl } = res.userInfo
        app.saveUserInfo({ nickName, avatarUrl } as AppUserInfo)
        request({
          url: '/user/profile',
          method: 'PUT',
          data: { nickName, avatarUrl },
        }).catch(() => {})
        this.setData({
          userInfo: { ...this.data.userInfo, nickName, avatarUrl },
        } as any)
        toast('已同步微信信息', 'success')
      },
      fail: () => {
        toast('需要授权才能同步')
      },
    })
  },

  onMenuTap(e: any) {
    const key: string = e.currentTarget.dataset.key
    switch (key) {
      case 'dataCenter':
        wx.navigateTo({ url: '/pages/data-center/data-center' })
        break
      case 'myPublish':
        app.globalData.hallMode = 'my'
        wx.switchTab({ url: '/pages/hall/hall' })
        break
      case 'myLike':
        app.globalData.hallMode = 'liked'
        wx.switchTab({ url: '/pages/hall/hall' })
        break
      case 'history':
        wx.switchTab({ url: '/pages/hall/hall' })
        toast('浏览记录功能即将上线')
        break
      case 'downloads':
        toast('下载记录功能即将上线')
        break
      case 'publish':
        if (!this.data.canPublish) {
          wx.showModal({
            title: '暂不可发布',
            content: '新注册同学暂不能发布作品。请先完善个人资料并参与书院活动，获得发布权限。',
            confirmText: '了解',
            showCancel: false,
          })
          return
        }
        wx.navigateTo({ url: '/pages/publish/publish' })
        break
      case 'settings':
        wx.navigateTo({ url: '/pages/settings/settings' })
        break
      case 'editProfile':
        wx.navigateTo({ url: '/pages/edit-profile/edit-profile' })
        break
      case 'verification':
        wx.navigateTo({ url: '/pages/verification/verification' })
        break
      case 'privacy':
        wx.navigateTo({ url: '/pages/privacy-settings/privacy-settings' })
        break
      case 'github':
        wx.setClipboardData({
          data: 'https://github.com/jianxiong-academy',
          success: () => toast('GitHub 链接已复制', 'success'),
        })
        break
      case 'afdian':
        wx.setClipboardData({
          data: 'https://afdian.com/@jianxiong',
          success: () => toast('爱发电链接已复制', 'success'),
        })
        break
            case 'about':
        wx.showModal({
          title: '关于健雄书院',
          content:
            '健雄书院是南京大学于2021年成立的住宿制学院，以「砺学修身·致知力行」为院训。\n\n本平台展示书院学生在学业、科研、文艺、体育、志愿服务等方面的优秀成果。',
          showCancel: false,
          confirmText: '了解',
        })
        break
      case 'admin':
        wx.navigateTo({ url: '/pages/admin/admin' })
        break
    }
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      confirmColor: '#e57373',
      success: (res) => {
        if (res.confirm) {
          app.clearUserInfo()
          wx.reLaunch({ url: '/pages/index/index' })
        }
      },
    })
  },
})