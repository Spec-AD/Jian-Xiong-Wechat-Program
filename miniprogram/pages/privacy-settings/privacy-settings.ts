// pages/privacy-settings/privacy-settings.ts — 隐私设置
import { request } from '../../utils/api'
import { toast } from '../../utils/util'

/** 隐私字段配置 */
interface PrivacyItem {
  key: string
  label: string
  desc: string
  visible: boolean
}

Page({
  data: {
    /** 隐私开关列表 */
    items: [
      { key: 'showNickname', label: '显示昵称', desc: '在作品展示中公开你的昵称', visible: true },
      { key: 'showAvatar', label: '显示头像', desc: '在作品展示中公开你的头像', visible: true },
      { key: 'showLikes', label: '显示获赞数', desc: '在个人主页公开你的获赞数量', visible: true },
      { key: 'showViews', label: '显示浏览量', desc: '在个人主页公开你的作品浏览量', visible: true },
      { key: 'showRegion', label: '显示地域', desc: '在个人主页公开你的地区信息', visible: false },
      { key: 'showBirthday', label: '显示生日', desc: '在个人主页公开你的生日', visible: false },
      { key: 'allowStrangerView', label: '允许游客浏览', desc: '允许未登录用户查看你的作品', visible: true },
    ] as PrivacyItem[],
    /** 是否允许通过 UID 搜索到我 */
    allowSearchByUid: true,
    loading: false,
  },

  onLoad() {
    this._loadSettings()
  },

  /** 从后端加载隐私设置 */
  async _loadSettings() {
    this.setData({ loading: true })
    try {
      const settings = await request<Record<string, boolean>>({
        url: '/user/privacy-settings',
        method: 'GET',
      })
      if (settings) {
        const items = this.data.items.map(item => ({
          ...item,
          visible: settings[item.key] !== null && settings[item.key] !== void 0 ? settings[item.key] : item.visible,
        }))
        this.setData({
          items,
          allowSearchByUid: settings.allowSearchByUid !== null && settings.allowSearchByUid !== void 0 ? settings.allowSearchByUid : true,
        })
      }
    } catch {
      // 如果后端未实现此接口，保持默认值
      console.log('[Privacy] 使用默认设置')
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 切换开关 */
  async onSwitchChange(e: any) {
    const key = e.currentTarget.dataset.key as string
    const checked = e.detail.value as boolean

    // 更新本地状态
    if (key === 'allowSearchByUid') {
      this.setData({ allowSearchByUid: checked })
    } else {
      const items = this.data.items.map(item =>
        item.key === key ? { ...item, visible: checked } : item
      )
      this.setData({ items })
    }

    // 同步到后端
    try {
      const settings: Record<string, boolean> = {}
      this.data.items.forEach(item => { settings[item.key] = item.visible })
      settings.allowSearchByUid = this.data.allowSearchByUid

      await request({
        url: '/user/privacy-settings',
        method: 'PUT',
        data: settings,
      })
    } catch {
      toast('设置保存失败')
      // 回滚
      this._loadSettings()
    }
  },
})
