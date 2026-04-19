// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    openid: '',
    loginCode: '',
    baseUrl: '', // TODO: 替换为实际后端地址，如 'https://your-server.com/api'
  },

  onLaunch() {
    // ── 恢复本地缓存用户信息 ──
    const cached = wx.getStorageSync('userInfo')
    if (cached) {
      this.globalData.userInfo = cached
    }

    // ── 微信登录：获取 code ──
    wx.login({
      success: res => {
        if (res.code) {
          this.globalData.loginCode = res.code
          console.log('[App] wx.login code:', res.code)
          // TODO: 发送 code 到后端换取 openid & session_key
          // wx.request({
          //   url: `${this.globalData.baseUrl}/login`,
          //   method: 'POST',
          //   data: { code: res.code },
          //   success: (r: any) => { this.globalData.openid = r.data.openid },
          // })
        }
      },
      fail: err => console.error('[App] wx.login failed', err),
    })

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

  /** 保存并持久化用户信息 */
  saveUserInfo(info: WechatMiniprogram.UserInfo) {
    this.globalData.userInfo = info
    wx.setStorageSync('userInfo', info)
  },

  /** 清除用户信息（退出登录） */
  clearUserInfo() {
    this.globalData.userInfo = null
    this.globalData.openid = ''
    wx.removeStorageSync('userInfo')
  },
})