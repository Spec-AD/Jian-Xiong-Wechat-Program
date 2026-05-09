// app.ts
import { loginWithCode, getUserProfile, setToken, getToken, removeToken } from './utils/api'

App<IAppOption>({
    globalData: {
    userInfo: null as AppUserInfo | null,
    openid: '',
    loginCode: '',
    baseUrl: 'http://localhost:3000/api',
    /** hall 页面的展示模式：hall | my | liked */
    hallMode: 'hall' as 'hall' | 'my' | 'liked',
  },

  onLaunch() {
    // ── 恢复本地缓存用户信息 ──
    const cached = wx.getStorageSync('userInfo')
    if (cached) {
      this.globalData.userInfo = cached
    }

    // ── 微信登录流程 ──
    this.doLogin()

    // ── 小程序更新检测 ──
    if (wx.canIUse('getUpdateManager')) {
      const mgr = wx.getUpdateManager()
      mgr.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已就绪，是否立即重启？',
          success: res => { if (res.confirm) mgr.applyUpdate() },
        })
      })
      mgr.onUpdateFailed(() => {
        console.warn('[App] Update failed')
      })
    }
  },

  /** 登录：wx.login → 后端换取 token → 获取用户信息 */
  async doLogin() {
    // 如果已有 token，直接获取用户信息
    if (getToken()) {
      console.log('[App] 已有 token，直接获取用户信息')
      this.fetchAndSaveUser()
      return
    }

    try {
      // 1. wx.login 获取临时 code
      const loginRes = await wx.login()
      if (!loginRes.code) {
        console.error('[App] wx.login 失败：未获取到 code')
        return
      }
      this.globalData.loginCode = loginRes.code
      console.log('[App] wx.login code:', loginRes.code)

      // 2. 发送 code 到后端换取 token + openid
      const authRes = await loginWithCode(loginRes.code)
      console.log('[App] 登录成功，openid:', authRes.openid)

      // 3. 保存 token 和 openid
      setToken(authRes.token)
      this.globalData.openid = authRes.openid

      // 4. 获取用户信息
      await this.fetchAndSaveUser()
    } catch (err: any) {
      console.error('[App] 登录流程失败:', err.message || err)
    }
  },

  /** 从后端获取用户信息并保存到 globalData 和缓存 */
  async fetchAndSaveUser() {
    try {
      const profile = await getUserProfile()
      const userInfo: AppUserInfo = {
        nickName: profile.nickName,
        avatarUrl: profile.avatarUrl,
      }
      this.saveUserInfo(userInfo)
      console.log('[App] 用户信息已加载:', userInfo.nickName)
    } catch (err: any) {
      // token 失效则清除
      if (err.message?.includes('401') || err.message?.includes('未登录')) {
        removeToken()
      }
      console.warn('[App] 获取用户信息失败:', err.message || err)
    }
  },

  /** 保存并持久化用户信息 */
  saveUserInfo(info: AppUserInfo) {
    this.globalData.userInfo = info
    wx.setStorageSync('userInfo', info)
  },

  /** 清除用户信息（退出登录） */
  clearUserInfo() {
    this.globalData.userInfo = null
    this.globalData.openid = ''
    removeToken()
    wx.removeStorageSync('userInfo')
  },
})