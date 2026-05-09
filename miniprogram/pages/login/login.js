// pages/login/login.js
const app = getApp()

Page({
  data: {
    loading: false
  },

  // ───── 静默登录 ─────
  handleQuickLogin() {
    this.setData({ loading: true })

    wx.login({
      success: (res) => {
        // 生成默认用户信息
        const rand = Math.floor(1000 + Math.random() * 9000)
        const userInfo = {
          nickName: '建雄用户_' + rand,
          avatarUrl: '/assets/images/default_avatar.png',
          loginCode: res.code || '',
          loginTime: Date.now(),
          isLogin: true
        }

        // 持久化保存
        app.saveUserInfo(userInfo)
        this.setData({ loading: false })

        // 跳转到「我的」
        wx.switchTab({ url: '/pages/profile/profile' })
      },
      fail: () => {
        // wx.login 失败时的兜底
        const rand = Math.floor(1000 + Math.random() * 9000)
        const userInfo = {
          nickName: '建雄用户_' + rand,
          avatarUrl: '/assets/images/default_avatar.png',
          loginCode: '',
          loginTime: Date.now(),
          isLogin: true
        }

        app.saveUserInfo(userInfo)
        this.setData({ loading: false })
        wx.switchTab({ url: '/pages/profile/profile' })
      }
    })
  }
})