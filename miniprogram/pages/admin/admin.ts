// pages/admin/admin.ts — 管理员后台
import { toast } from '../../utils/util'
import { getWorks, getUserStats, request } from '../../utils/api'

const app = getApp<IAppOption>()
const PAGE_SIZE = 20

/** 仪表盘统计数据 */
interface DashboardStats {
  totalWorks: number
  totalUsers: number
  todayViews: number
  totalLikes: number
}

Page({
  data: {
    // 鉴权
    isAdmin: false,
    loading: true,
    // 仪表盘
    stats: {
      totalWorks: 0,
      totalUsers: 0,
      todayViews: 0,
      totalLikes: 0,
    } as DashboardStats,
    // 作品管理
    works: [] as any[],
    page: 1,
    hasMore: true,
    refreshing: false,
    // 筛选
    filterType: 'all' as string,
    keyword: '',
    // 活跃 tab
    activeTab: 'works' as 'works' | 'stats',
  },

  async onLoad() {
    // 检查管理员权限
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      toast('请先登录')
      wx.navigateBack()
      return
    }

    await this._checkAdmin()
  },

  async _checkAdmin() {
    try {
      const profile = await request<{ role: string }>({
        url: '/user/profile',
        method: 'GET',
      })

      if (profile.role !== 'admin') {
        wx.showModal({
          title: '权限不足',
          content: '只有管理员才能访问此页面',
          showCancel: false,
          confirmText: '返回',
          success: () => wx.navigateBack(),
        })
        return
      }

      this.setData({ isAdmin: true, loading: false })
      this._loadDashboard()
      this._loadWorks(true)
    } catch (err: any) {
      toast('权限验证失败')
      wx.navigateBack()
    }
  },

  async _loadDashboard() {
    try {
      const data = await request<DashboardStats>({
        url: '/admin/stats',
        method: 'GET',
      })
      this.setData({ stats: data })
    } catch {
      // 静默降级
    }
  },

  async _loadWorks(reset: boolean) {
    if (!this.data.isAdmin || this.data.refreshing) return

    this.setData({ refreshing: true })

    try {
      if (reset) {
        this.setData({ page: 1, hasMore: true })
      }

      const { filterType, keyword, page } = this.data

      const result = await getWorks({
        page: reset ? 1 : page,
        pageSize: PAGE_SIZE,
        categoryId: filterType === 'all' ? undefined : filterType,
        keyword: keyword || undefined,
      })

      const list = result.list || []
      const currentPage = result.pagination?.page || 1
      const totalPages = result.pagination?.totalPages || 1

      this.setData({
        works: reset ? list : [...this.data.works, ...list],
        hasMore: currentPage < totalPages,
        page: reset ? 2 : page + 1,
      })
    } catch (err: any) {
      toast('加载失败')
    } finally {
      this.setData({ refreshing: false })
    }
  },

  /** 切换tab */
  onTabChange(e: any) {
    const tab = e.currentTarget.dataset.tab as string
    this.setData({ activeTab: tab })
    if (tab === 'works') {
      this._loadWorks(true)
    }
  },

  /** 筛选类型 */
  onFilterType(e: any) {
    const type = e.currentTarget.dataset.type as string
    if (type === this.data.filterType) return
    this.setData({ filterType: type })
    this._loadWorks(true)
  },

  /** 搜索 */
  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    this._loadWorks(true)
  },

  /** 编辑作品 */
  onEditWork(e: any) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/edit-work/edit-work?id=${id}` })
  },

  /** 查看作品 */
  onViewWork(e: any) {
    const id = e.currentTarget.dataset.id as string
    wx.navigateTo({ url: `/pages/viewer/viewer?id=${id}` })
  },

  /** 刷新 */
  onRefresh() {
    this._loadDashboard()
    this._loadWorks(true)
    toast('已刷新', 'success')
  },
})
