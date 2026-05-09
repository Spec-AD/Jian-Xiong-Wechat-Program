// pages/hall/hall.ts — 作品大厅（真实 API 版）
import { WORK_CATEGORIES, getFileTypeLabel, getFileTypeIcon, toast, formatDate } from '../../utils/util'
import { getWorks, getBannerWorks, getMyWorks, getLikedWorks } from '../../utils/api'

const app = getApp<IAppOption>()
const PAGE_SIZE = 20

Page({
  data: {
    categories: WORK_CATEGORIES,
    activeCategory: 'all',
    keyword: '',
    works: [] as any[],           // 作品列表
    bannerList: [] as any[],      // Banner 推荐
    total: 0,                     // 总作品数
    loading: false,               // 加载中
    refreshing: false,            // 下拉刷新中
    hasMore: true,                // 是否还有更多
    page: 1,                      // 当前页码
    mode: 'hall' as 'hall' | 'my' | 'liked',  // 当前模式
  },

  onLoad(options: any) {
    // 支持从 profile 页跳转：通过 globalData.hallMode 传入 'my' 或 'liked'
    const mode = options.mode || app.globalData.hallMode || 'hall'
    app.globalData.hallMode = 'hall' // 消费后重置
    this.setData({ mode })
    this._loadData(true)
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this._loadData(true)
  },

  /** 触底加载更多 */
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this._loadData(false)
  },

  onShareAppMessage() {
    return {
      title: '健雄书院 · 学生成果展示平台',
      path: '/pages/hall/hall',
    }
  },

  /** 核心加载函数 */
  async _loadData(reset: boolean) {
    if (this.data.loading) return
    this.setData({ loading: true, ...(reset ? { refreshing: true } : {}) })

    try {
      if (reset) {
        this.setData({ page: 1, hasMore: true })
      }

      const { mode, activeCategory, keyword, page } = this.data

      // 仅在 hall 模式下加载 Banner
      if (reset && mode === 'hall') {
        const bannerData = await getBannerWorks()
        this.setData({
          bannerList: (bannerData || []).map((item: any) => ({
            ...item,
            typeName: getFileTypeLabel(item.type),
            typeIcon: getFileTypeIcon(item.type),
          })),
        })
      }

      // 根据模式调用不同 API
      let result: any
      if (mode === 'my') {
        result = await getMyWorks()
      } else if (mode === 'liked') {
        result = await getLikedWorks()
      } else {
        result = await getWorks({
          page: reset ? 1 : page,
          pageSize: PAGE_SIZE,
          categoryId: activeCategory === 'all' ? undefined : activeCategory,
          keyword: keyword || undefined,
        })
      }

      // 兼容返回格式：可能是数组 {list: [...]} 或 {list: [...], pagination: {...}}
      const list = result.list || result || []
      const total = result.total || result.pagination?.total || list.length

      // 丰富前端展示字段
      const enriched = list.map((item: any) => ({
        ...item,
        typeName: getFileTypeLabel(item.type),
        typeIcon: getFileTypeIcon(item.type),
        date: item.date ? formatDate(item.date) : (item.createdAt ? formatDate(item.createdAt) : ''),
      }))

      // 分页信息
      const currentPage = result.pagination?.page || result.page || 1
      const totalPages = result.pagination?.totalPages ||
        Math.ceil((result.pagination?.total || result.total || 0) / PAGE_SIZE) ||
        1

      this.setData({
        works: reset ? enriched : [...this.data.works, ...enriched],
        total,
        hasMore: currentPage < totalPages,
        page: reset ? 2 : page + 1,
      })
    } catch (err: any) {
      console.error('[Hall] 加载失败:', err.message || err)
      toast('加载失败，请下拉刷新重试')
    } finally {
      this.setData({ loading: false, refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  /** 分类切换 */
  onTabTap(e: any) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeCategory) return
    this.setData({ activeCategory: id })
    this._loadData(true)
  },

  /** 搜索输入 */
  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    this._loadData(true)
  },

  /** 清除搜索 */
  onSearchClear() {
    this.setData({ keyword: '' })
    this._loadData(true)
  },

  /** Banner 点击 */
  onBannerTap(e: any) {
    this._goViewer(e.currentTarget.dataset.item.id)
  },

  /** 作品点击 */
  onWorkTap(e: any) {
    this._goViewer(e.currentTarget.dataset.item.id)
  },

  /** 跳转详情页（仅传 id，viewer 页自己调 API 加载） */
  _goViewer(id: string) {
    wx.navigateTo({ url: `/pages/viewer/viewer?id=${id}` })
  },
})