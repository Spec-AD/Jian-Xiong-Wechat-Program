// pages/edit-profile/edit-profile.ts — 编辑个人资料
import { uploadFile, updateUserProfile, request } from '../../utils/api'
import { toast } from '../../utils/util'

const app = getApp<IAppOption>()

interface ProfileData {
  avatarUrl: string
  nickName: string
  signature: string
  birthday: string
  region: string[]
  interests: string[]
}

const INTEREST_OPTIONS = [
  '科研', '文艺', '体育', '志愿', '摄影', '音乐',
  '编程', '阅读', '旅行', '绘画', '舞蹈', '辩论',
]

Page({
  data: {
    profile: {} as ProfileData,
    interestOptions: INTEREST_OPTIONS,
    regionIndex: 0,
    region: ['江苏省', '南京市', ''],
    birthdayDate: '2000-01-01',
    uploading: false,
    saving: false,
  },

  onLoad() {
    this._loadProfile()
  },

  /** 加载当前用户信息 */
  async _loadProfile() {
    try {
      const profileData = await request<ProfileData>({
        url: '/user/profile',
        method: 'GET',
      })
      this.setData({
        profile: {
          avatarUrl: profileData.avatarUrl || '',
          nickName: profileData.nickName || '',
          signature: profileData.signature || '',
          birthday: profileData.birthday || '',
          region: profileData.region || ['江苏省', '南京市', ''],
          interests: profileData.interests || [],
      },
      region: profileData.region || ['江苏省', '南京市', ''],
      birthdayDate: profileData.birthday || '2000-01-01',
      })
    } catch (err: any) {
      console.error('[EditProfile] 加载失败:', err)
    }
  },

  /** 更换头像 — 调用微信选头像 */
  onChooseAvatar(e: any) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) return
    this.setData({ 'profile.avatarUrl': avatarUrl })
    // 自动上传
    this._uploadAvatar(avatarUrl)
  },

  /** 上传头像到后端 */
  async _uploadAvatar(tempPath: string) {
    this.setData({ uploading: true })
    try {
      const result = await uploadFile(tempPath, 'image', 'avatar')
      this.setData({ 'profile.avatarUrl': result.url })
      // 同时更新后端用户信息
      await updateUserProfile({ avatarUrl: result.url })
      // 更新全局
      app.saveUserInfo({
        ...app.globalData.userInfo,
        avatarUrl: result.url,
      } as AppUserInfo)
      toast('头像已更新', 'success')
    } catch (err: any) {
      toast('头像上传失败')
    } finally {
      this.setData({ uploading: false })
    }
  },

  /** 昵称输入 */
  onNicknameInput(e: any) {
    this.setData({ 'profile.nickName': e.detail.value })
  },

  /** 签名输入 */
  onSignatureInput(e: any) {
    this.setData({ 'profile.signature': e.detail.value })
  },

  /** 生日选择 */
  onBirthdayChange(e: any) {
    this.setData({
      birthdayDate: e.detail.value,
      'profile.birthday': e.detail.value,
    })
  },

  /** 地域选择 */
  onRegionChange(e: any) {
    const values = e.detail.value as string[]
    this.setData({
      region: values,
      'profile.region': values,
    })
  },

  /** 兴趣切换 */
  onInterestTap(e: any) {
    const interest = e.currentTarget.dataset.interest as string
    const current = [...(this.data.profile.interests || [])]
    const idx = current.indexOf(interest)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      if (current.length >= 6) {
        toast('最多选择6个兴趣标签')
        return
      }
      current.push(interest)
    }
    this.setData({ 'profile.interests': current })
  },

  /** 保存所有资料 */
  async onSave() {
    const { profile } = this.data
    if (!(profile.nickName && profile.nickName.trim())) {
      toast('请输入昵称')
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中…', mask: true })

    try {
      await updateUserProfile({
        nickName: profile.nickName.trim(),
        avatarUrl: profile.avatarUrl,
        signature: profile.signature,
        birthday: profile.birthday,
        region: profile.region,
        interests: profile.interests,
      })

      // 更新全局
      app.saveUserInfo({
        nickName: profile.nickName.trim(),
        avatarUrl: profile.avatarUrl,
      } as AppUserInfo)

      wx.hideLoading()
      toast('资料已保存', 'success')
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err: any) {
      wx.hideLoading()
      toast(err.message || '保存失败')
    } finally {
      this.setData({ saving: false })
    }
  },
})
