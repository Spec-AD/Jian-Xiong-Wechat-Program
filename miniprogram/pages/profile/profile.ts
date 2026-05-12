// pages/profile/profile.ts — 个人主页（图标配置版）
import { getUserStats, request, getHistory } from '../../utils/api'
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
    birthday: '',
    region: [] as string[],
    regionDisplay: '',
    interests: [] as string[],
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

  /** 格式化地域 */
  _formatRegion(region: string[]) {
    return region && region.length ? region.join(' · ') : ''
  },

  async _loadProfile() {
    try {
      const profileData = await request<{
        nickName?: string
        avatarUrl?: string
        signature?: string
        birthday?: string
        region?: string[]
        interests?: string[]
        isVerified?: boolean
        canPublish?: boolean
      }>({ url: '/user/profile', method: 'GET' })

      // 从后端同步最新的昵称和头像到全局状态
      if (profileData.nickName || profileData.avatarUrl) {
        const syncedInfo: AppUserInfo = {
          nickName: profileData.nickName?.trim() || app.globalData.userInfo?.nickName || '书院同学',
          avatarUrl: profileData.avatarUrl || app.globalData.userInfo?.avatarUrl || '',
        }
        app.saveUserInfo(syncedInfo)
        this.setData({ userInfo: syncedInfo })
      }

      this.setData({
        signature: profileData.signature || '',
        birthday: profileData.birthday || '',
        region: profileData.region || [],
        regionDisplay: this._formatRegion(profileData.region || []),
        interests: profileData.interests || [],
        canPublish: profileData.canPublish !== null && profileData.canPublish !== void 0 ? profileData.canPublish : false,
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
      const result = await getHistory({ page: 1, pageSize: 1 })
      this.setData({ historyCount: result.pagination?.total || 0 })
    } catch {
      // 静默降级
    }
  },

  // ── onSyncWechatInfo 已移除 ──
  // wx.getUserProfile() 在 2.32.3+ 基础库中已废弃
  // 微信信息在登录时已自动获取并保存，此处不再需要手动同步,

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
        app.globalData.hallMode = 'history'
        wx.switchTab({ url: '/pages/hall/hall' })
        break
      case 'downloads':
        wx.navigateTo({ url: '/pages/downloads/downloads' })
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
      case 'github':
        wx.setClipboardData({
          data: 'https://github.com/Spec-AD/Jian-Xiong-Wechat-Program',
          success: () => toast('GitHub 链接已复制', 'success'),
        })
        break
      case 'afdian':
        wx.setClipboardData({
          data: 'https://afdian.com/a/purebeat',
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
          wx.reLaunch({ url: '/pages/login/login' })
        }
      },
    })
  },
})