// app.ts
import { removeToken } from './utils/api'

App<IAppOption>({
    globalData: {
    userInfo: null as AppUserInfo | null,
    openid: '',
    loginCode: '',
    baseUrl: 'https://jx-plform.site/api',
        /** hall 页面的展示模式：hall | my | liked | history */
    hallMode: 'hall' as 'hall' | 'my' | 'liked' | 'history',
  },

    onLaunch() {
    // ── 加载全局自定义字体 ──
    this.loadCustomFont()

    // ── 恢复本地缓存用户信息 ──
    const cached = wx.getStorageSync('userInfo')
    if (cached) {
      this.globalData.userInfo = cached
    }

                // ── 登录态恢复 ──
        // 不自动调用 wx.login() 或主动验证 token，避免后台 API 调用意外清除有效 token。
        // 如果 token 已过期，首次需要鉴权的 API 请求会返回 401，由 api.ts 统一处理跳转登录。
        // 用户信息从缓存恢复，登录页「一键登录」触发完整登录流程。

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

        /** 加载全局自定义字体（Torus-Semi-Bold） */
  loadCustomFont() {
    try {
      wx.loadFontFace({
        family: 'Torus-Semi-Bold',
        source: 'url("https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/Torus-Semi-Bold.otf")',
        global: true,
        fail: () => console.warn('[App] Torus-Semi-Bold 加载失败'),
      })
    } catch (err) {
      // 低版本基础库不支持 loadFontFace，静默忽略
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