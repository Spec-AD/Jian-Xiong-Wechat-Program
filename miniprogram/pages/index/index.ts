// pages/index/index.ts — 首页（登录 + 已登录跳转）
// AppUserInfo 已在 typings/index.d.ts 中全局声明：{ avatarUrl: string; nickName: string }
import { updateUserProfile } from '../../utils/api'

const app = getApp<IAppOption>()

const DEFAULT_AVATAR = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    userInfo: { avatarUrl: DEFAULT_AVATAR, nickName: '' } as AppUserInfo,
    hasUserInfo: false,
    loading: false,
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },

  lifetimes: {
    attached() {
      // 已有缓存用户信息则直接展示，无需再次授权
      if (app.globalData.userInfo) {
        this.setData({
          userInfo: app.globalData.userInfo,
          hasUserInfo: true,
        })
      }
    },
  },

  methods: {
    /** 微信新规：头像选择 */
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail
      const { nickName } = this.data.userInfo
      this.setData({
        'userInfo.avatarUrl': avatarUrl,
        hasUserInfo: this._isComplete(nickName, avatarUrl),
      })
    },

    /** 昵称输入（type=nickname） */
    onInputChange(e: any) {
      const nickName: string = e.detail.value
      const { avatarUrl } = this.data.userInfo
      this.setData({
        'userInfo.nickName': nickName,
        hasUserInfo: this._isComplete(nickName, avatarUrl),
      })
    },

    _isComplete(nickName: string, avatarUrl: string): boolean {
      return !!(nickName && nickName.trim() && avatarUrl && avatarUrl !== DEFAULT_AVATAR)
    },

    /** 确认登录 → 同步用户信息到后端 */
    async onLogin() {
      const { userInfo, hasUserInfo } = this.data
      if (!hasUserInfo) {
        wx.showToast({ title: '请完善头像与昵称', icon: 'none' })
        return
      }
      this.setData({ loading: true })

      try {
        // 同步头像/昵称到后端
        await updateUserProfile({
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
        })
        app.saveUserInfo(userInfo)
        wx.switchTab({ url: '/pages/hall/hall' })
      } catch (err: any) {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        console.error('[Index] onLogin error:', err.message || err)
      } finally {
        this.setData({ loading: false })
      }
    },

    /** 游客浏览直接跳大厅 */
    goHall() {
      wx.switchTab({ url: '/pages/hall/hall' })
    },

    /** 已登录用户进入大厅 */
    onEnter() {
      wx.switchTab({ url: '/pages/hall/hall' })
    },

    /** 退出登录 */
    onLogout() {
      wx.showModal({
        title: '确认退出',
        content: '退出后需重新登录',
        confirmColor: '#e57373',
        success: res => {
          if (res.confirm) {
            app.clearUserInfo()
            this.setData({
              userInfo: { avatarUrl: DEFAULT_AVATAR, nickName: '' } as AppUserInfo,
              hasUserInfo: false,
            })
          }
        },
      })
    },
  },
})
