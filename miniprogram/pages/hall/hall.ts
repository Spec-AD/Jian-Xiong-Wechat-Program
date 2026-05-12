// pages/hall/hall.ts — 作品大厅（真实 API 版）
import { WORK_CATEGORIES, getFileTypeLabel, getFileTypeIcon, toast, formatDate } from '../../utils/util'
import { getWorks, getBannerWorks, getMyWorks, getLikedWorks, getHistory } from '../../utils/api'

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
    mode: 'hall' as 'hall' | 'my' | 'liked' | 'history',  // 当前模式
  },

  onLoad(options: any) {
    // 支持从 profile 页跳转：通过 globalData.hallMode 传入 'my' 或 'liked'
    this._applyHallMode(options)
  },

  /** 每次页面显示时检查是否有模式切换（switchTab 不会触发 onLoad） */
  onShow() {
    if (app.globalData.hallMode && app.globalData.hallMode !== this.data.mode) {
      this._applyHallMode({})
    }
  },

  /** 应用大厅模式并刷新数据 */
  _applyHallMode(options: any) {
    const mode = options.mode || app.globalData.hallMode || 'hall'
    if (mode === this.data.mode && this.data.works.length > 0) {
      app.globalData.hallMode = 'hall' // 无需切换，重置标记
      return
    }
    app.globalData.hallMode = 'hall' // 消费后重置
    this.setData({
      mode,
      works: [],
      page: 1,
      hasMore: true,
    })
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

  /** 返回真正的大厅（全部作品） */
  onBackToHall() {
    this.setData({
      mode: 'hall',
      activeCategory: 'all',
      keyword: '',
      page: 1,
      works: [],
      hasMore: true,
    })
    this._loadData(true)
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

      // 仅在 hall 模式下加载 Banner（与主数据并发，不阻塞）
      const bannerPromise = reset && mode === 'hall'
        ? getBannerWorks().then(bannerData => {
            this.setData({
              bannerList: (bannerData || []).map((item: any) => ({
                ...item,
                typeName: getFileTypeLabel(item.type),
                typeIcon: getFileTypeIcon(item.type),
              })),
            })
          }).catch(() => {
            // Banner 加载失败不阻塞主列表
            console.warn('[Hall] Banner 加载失败，跳过')
          })
        : Promise.resolve()

      // 根据模式调用不同 API
      let result: any
      if (mode === 'my') {
        result = await getMyWorks({ page: reset ? 1 : page, pageSize: PAGE_SIZE })
      } else if (mode === 'liked') {
        result = await getLikedWorks({ page: reset ? 1 : page, pageSize: PAGE_SIZE })
      } else if (mode === 'history') {
        result = await getHistory({ page: reset ? 1 : page, pageSize: PAGE_SIZE })
      } else {
        // 只传有值的参数，避免 undefined 被序列化为字符串 "undefined"
        const params: Record<string, any> = {
          page: reset ? 1 : page,
          pageSize: PAGE_SIZE,
        }
        if (activeCategory !== 'all' && activeCategory) {
          params.categoryId = activeCategory
        }
        if (keyword) {
          params.keyword = keyword
        }
        result = await getWorks(params)
      }

      // 兼容返回格式：可能是数组 {list: [...]} 或 {list: [...], pagination: {...}}
      const list = result.list || result || []
      const total = result.total || (result.pagination && result.pagination.total) || list.length

      // 丰富前端展示字段
      const enriched = list.map((item: any) => ({
        ...item,
        typeName: getFileTypeLabel(item.type),
        typeIcon: getFileTypeIcon(item.type),
        date: item.date ? formatDate(item.date) : (item.createdAt ? formatDate(item.createdAt) : ''),
        actualAuthor: item.actualAuthor || '',
      }))

      // 分页信息
      const currentPage = (result.pagination && result.pagination.page) || result.page || 1
      const pageTotal = result.pagination && result.pagination.total
      const totalPages = (result.pagination && result.pagination.totalPages) ||
        Math.ceil((pageTotal || result.total || 0) / PAGE_SIZE) ||
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