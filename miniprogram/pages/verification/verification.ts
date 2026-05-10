// pages/verification/verification.ts — NJU 实名认证
import { request } from '../../utils/api'
import { toast } from '../../utils/util'

const app = getApp<IAppOption>()

Page({
  data: {
    /** 认证状态：none | pending | verified | rejected */
    status: 'none' as 'none' | 'pending' | 'verified' | 'rejected',
    /** 表单数据 */
    form: {
      realName: '',
      studentId: '',
      idCard: '',
      email: '',
    },
    /** 错误信息 */
    error: '',
    submitting: false,
  },

  onLoad() {
    this._loadStatus()
  },

  /** 加载当前认证状态 */
  async _loadStatus() {
    try {
      const data = await request<{
        status: string
        realName?: string
        studentId?: string
      }>({ url: '/user/verification', method: 'GET' })
      this.setData({
        status: (data.status || 'none') as 'none' | 'pending' | 'verified' | 'rejected',
        'form.realName': data.realName || '',
        'form.studentId': data.studentId || '',
      })
    } catch {
      // 后端未实现时，使用缓存状态
      const verified = wx.getStorageSync('nju_verified') === true
      if (verified) {
        this.setData({
          status: 'verified',
          'form.realName': wx.getStorageSync('nju_realname') || '',
          'form.studentId': wx.getStorageSync('nju_student_id') || '',
        })
      }
    }
  },

  /** 表单输入 */
  onInput(e: any) {
    const field = e.currentTarget.dataset.field as string
    const value = e.detail.value
    this.setData({
      [`form.${field}`]: value,
      error: '',
    })
  },

  /** 提交认证 */
  async onSubmit() {
    const { realName, studentId, idCard, email } = this.data.form
    if (!realName.trim()) { this.setData({ error: '请输入真实姓名' }); return }
    if (!studentId.trim()) { this.setData({ error: '请输入学号' }); return }
    if (!idCard.trim()) { this.setData({ error: '请输入身份证号' }); return }
    if (idCard.length < 15) { this.setData({ error: '请输入有效的身份证号' }); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ error: '请输入有效的邮箱地址' }); return
    }

    this.setData({ submitting: true, error: '' })

    try {
      await request({
        url: '/user/verification',
        method: 'POST',
        data: {
          realName: realName.trim(),
          studentId: studentId.trim(),
          idCard: idCard.trim(),
          email: email.trim(),
        },
      })

      this.setData({ status: 'pending' })
      wx.showModal({
        title: '提交成功',
        content: '认证信息已提交，管理员审核通过后，你的昵称将显示为紫色认证标识。',
        showCancel: false,
        confirmText: '知道了',
      })
    } catch (err: any) {
      this.setData({ error: err.message || '提交失败，请重试' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  /** 认证说明 */
  getStatusText(): string {
    const map: Record<string, string> = {
      none: '未认证',
      pending: '审核中',
      verified: '已认证',
      rejected: '未通过',
    }
    return map[this.data.status] || '未认证'
  },
})
