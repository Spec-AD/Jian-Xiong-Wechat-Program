// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    openid: '',
  },

  onLaunch() {
    // 微信登录：获取 code，可发送给后台换取 openId / sessionKey
    wx.login({
      success: res => {
        if (res.code) {
          console.log('wx.login code:', res.code)
          // TODO: 将 res.code 发送到自己的后端换取 openId、sessionKey
          // wx.request({ url: 'https://your-server/login', data: { code: res.code }, ... })
        }
      },
      fail: err => console.error('wx.login failed', err),
    })

    // 恢复本地缓存的用户信息（如有）
    const cached = wx.getStorageSync('userInfo')
    if (cached) {
      this.globalData.userInfo = cached
    }
  },

  saveUserInfo(info: WechatMiniprogram.UserInfo) {
    this.globalData.userInfo = info
    wx.setStorageSync('userInfo', info)
  },
})