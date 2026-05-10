// pages/login/login.ts — 登录页（生产级）
import { loginWithCode, setToken, getToken } from '../../utils/api'
import { toast } from '../../utils/util'

const app = getApp<IAppOption>()

Page({
  data: {
    loading: false,
    errorMsg: '',
  },

  onShow() {
    // 如果已经有用户信息，直接跳转（使用 reLaunch 避免闪白）
    if (app.globalData.userInfo && getToken()) {
      wx.reLaunch({ url: '/pages/profile/profile' })
      return
    }
  },

  /**
   * 一键登录（生产流程）
   * 1. wx.login() 获取临时 code
   * 2. 发送 code 到后端 /api/auth/login 换取 token + openid + 用户信息
   * 3. 保存 token 和用户信息到 globalData 和缓存
   * 4. 跳转到「我的」页面
   */
  async handleQuickLogin() {
    // 防止重复点击
    if (this.data.loading) return

    this.setData({ loading: true, errorMsg: '' })

    try {
      // 1. wx.login 获取临时 code
      const loginRes = await wx.login()
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败，请重试')
      }

      // 2. 发送 code 到后端
      const authRes = await loginWithCode(loginRes.code)

      // 3. 保存 token
      setToken(authRes.token)
      app.globalData.openid = authRes.openid

      // 4. 保存用户信息
      if (authRes.user) {
        app.saveUserInfo({
          nickName: authRes.user.nickName,
          avatarUrl: authRes.user.avatarUrl,
        })
      }

      // 5. 跳转到「我的」（使用 reLaunch 避免页面切换闪白）
      wx.reLaunch({ url: '/pages/profile/profile' })
    } catch (err: any) {
      const msg = err.message || '登录失败，请检查网络后重试'
      this.setData({ errorMsg: msg })
      console.error('[Login] 登录失败:', msg)
    } finally {
      this.setData({ loading: false })
    }
  },
})
