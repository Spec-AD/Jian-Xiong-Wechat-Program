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
   * 使用 open-type="getUserInfo" 按钮触发微信授权弹窗
   * 1. 从按钮事件 e.detail.userInfo 获取微信头像和昵称（用户确认弹窗）
   * 2. wx.login() 获取临时 code
   * 3. 发送 code + 微信信息 到后端 /api/auth/login 换取 token + openid
   * 4. 保存 token 和用户信息到 globalData 和缓存
   * 5. 跳转到「我的」页面
   */
  async handleQuickLogin(e: any) {
    // 防止重复点击
    if (this.data.loading) return

    this.setData({ loading: true, errorMsg: '' })

    try {
      // ===== 1. 从按钮事件获取微信头像和昵称（open-type="getUserInfo" 弹出授权） =====
      let wechatNickName = ''
      let wechatAvatarUrl = ''

      if (e.detail && e.detail.userInfo) {
        // 用户同意授权
        wechatNickName = e.detail.userInfo.nickName
        wechatAvatarUrl = e.detail.userInfo.avatarUrl
        console.log('[Login] 微信授权成功:', wechatNickName)
      } else {
        // 用户拒绝授权——使用后端生成的默认昵称，仍可登录
        console.warn('[Login] 用户拒绝授权微信信息')
      }

      // ===== 2. wx.login 获取临时 code =====
      const loginRes = await wx.login()
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败，请重试')
      }

      // ===== 3. 发送 code + 微信信息 到后端 =====
      const authRes = await loginWithCode(loginRes.code, wechatNickName, wechatAvatarUrl)

      // ===== 4. 保存 token =====
      setToken(authRes.token)
      app.globalData.openid = authRes.openid

      // ===== 5. 保存用户信息（优先用微信授权获取的） =====
      const displayName = wechatNickName || authRes.user?.nickName || '书院同学'
      const displayAvatar = wechatAvatarUrl || authRes.user?.avatarUrl || ''

      app.saveUserInfo({
        nickName: displayName,
        avatarUrl: displayAvatar,
      })

      // ===== 6. 跳转到「我的」 =====
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
