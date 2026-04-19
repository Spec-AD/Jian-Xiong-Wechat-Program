// pages/login/login.js
const app = getApp()
const { toast } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    nickNameInput: '',
    tempAvatarUrl: '',
    loading: false
  },

  onLoad() {
    // 若已有用户信息，直接展示
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
    }
  },

  onShow() {
    // 每次显示时同步全局用户信息
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
    }
  },

  // ───── 头像选择（微信新规）─────
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ tempAvatarUrl: avatarUrl })
  },

  // ───── 昵称输入 ─────
  onNickNameInput(e) {
    this.setData({ nickNameInput: e.detail.value })
  },

  onNickNameBlur(e) {
    this.setData({ nickNameInput: e.detail.value })
  },

  // ───── 授权登录 ─────
  onLogin() {
    const { nickNameInput, tempAvatarUrl } = this.data

    if (!nickNameInput.trim()) {
      toast('请填写昵称')
      return
    }

    this.setData({ loading: true })

    // 构造用户信息对象
    const userInfo = {
      nickName: nickNameInput.trim(),
      avatarUrl: tempAvatarUrl || '/assets/images/default_avatar.png',
      loginTime: Date.now()
    }

    // 持久化并写入全局
    app.setUserInfo(userInfo)

    // 模拟异步登录（实际项目中替换为 wx.request 到后端）
    setTimeout(() => {
      this.setData({ loading: false, userInfo })
      // 登录成功跳转大厅（reLaunch 清空页面栈）
      wx.reLaunch({ url: '/pages/hall/hall' })
    }, 600)
  },

  // ───── 已登录 → 进入大厅 ─────
  goToHall() {
    wx.switchTab({ url: '/pages/hall/hall' })
  },

  // ───── 退出登录 ─────
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: res => {
        if (res.confirm) {
          app.clearUserInfo()
          this.setData({ userInfo: null, nickNameInput: '', tempAvatarUrl: '' })
        }
      }
    })
  }
})