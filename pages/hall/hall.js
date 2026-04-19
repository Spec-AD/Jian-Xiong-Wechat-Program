// pages/hall/hall.js
const app = getApp()
const { ACHIEVEMENT_CATEGORIES, getFileType, getFileTypeLabel, toast, throttle } = require('../../utils/util')

// ─── 模拟数据（后端联调时替换为 wx.request）───
const MOCK_ACHIEVEMENTS = [
  {
    id: '1', title: '《健雄之声》院歌演唱', description: '由书院合唱团演绎，展现书院精神与文化底蕴。',
    category: 'art', fileType: 'audio', fileUrl: '', coverUrl: '/assets/images/mock/cover1.jpg',
    authorName: '合唱团', authorAvatar: '', views: 128, likes: 36, isBanner: true
  },
  {
    id: '2', title: '2024年科研创新大赛一等奖', description: '基于机器学习的水质检测系统，荣获省级竞赛一等奖。',
    category: 'research', fileType: 'pdf', fileUrl: '', coverUrl: '/assets/images/mock/cover2.jpg',
    authorName: '张明远', authorAvatar: '', views: 256, likes: 88, isBanner: true
  },
  {
    id: '3', title: '书院运动会精彩瞬间', description: '记录2024年书院运动会全程，展示同学们的拼搏精神。',
    category: 'sports', fileType: 'video', fileUrl: '', coverUrl: '/assets/images/mock/cover3.jpg',
    authorName: '体育部', authorAvatar: '', views: 512, likes: 164, isBanner: false
  },
  {
    id: '4', title: '校园摄影展——《光影里的健雄》', description: '用镜头记录书院四季风貌，长图展示全景摄影作品。',
    category: 'art', fileType: 'image', fileUrl: '', coverUrl: '/assets/images/mock/cover4.jpg',
    authorName: '李晓婷', authorAvatar: '', views: 341, likes: 102, isBanner: false
  },
  {
    id: '5', title: '乡村支教志愿服务报告', description: '暑期赴苏北农村支教15天，服务学生200余名。',
    category: 'volunteer', fileType: 'pdf', fileUrl: '', coverUrl: '/assets/images/mock/cover5.jpg',
    authorName: '志愿服务队', authorAvatar: '', views: 189, likes: 67, isBanner: false
  }
]

Page({
  data: {
    // 搜索
    keyword: '',
    // 分类
    categories: ACHIEVEMENT_CATEGORIES,
    activeCategory: 'all',
    activeCategoryIndex: 0,
    // banner
    bannerList: [],
    // 列表
    achievementList: [],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    noMore: false
  },

  onLoad() {
    this._checkLogin()
    this._loadData()
  },

  onShow() {
    this._checkLogin()
  },

  onPullDownRefresh() {
    this._resetAndLoad(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this._loadMore()
    }
  },

  // ───── 登录检查 ─────
  _checkLogin() {
    if (!app.globalData.userInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
    }
  },

  // ───── 数据加载 ─────
  _loadData() {
    this.setData({ loading: true })

    // TODO: 替换为实际 API 请求
    // const { keyword, activeCategory, page, pageSize } = this.data
    // request({ url: `${app.globalData.baseUrl}/achievements`, data: { keyword, category: activeCategory, page, pageSize } })

    setTimeout(() => {
      const { keyword, activeCategory } = this.data
      let list = MOCK_ACHIEVEMENTS.filter(item => {
        const matchCat = activeCategory === 'all' || item.category === activeCategory
        const matchKw = !keyword || item.title.includes(keyword) || item.authorName.includes(keyword)
        return matchCat && matchKw
      }).map(item => ({
        ...item,
        fileTypeLabel: getFileTypeLabel(item.fileType),
        categoryLabel: ACHIEVEMENT_CATEGORIES.find(c => c.key === item.category)?.label || '其他'
      }))

      const bannerList = list.filter(i => i.isBanner)

      this.setData({
        achievementList: list,
        bannerList,
        total: list.length,
        loading: false,
        noMore: true // 模拟数据一次全部返回
      })
    }, 600)
  },

  _resetAndLoad(cb) {
    this.setData({ page: 1, noMore: false, achievementList: [] }, () => {
      this._loadData()
      cb && cb()
    })
  },

  _loadMore() {
    // 真实分页时在此累加 page 并追加数据
    toast('已加载全部内容')
  },

  // ───── 搜索 ─────
  onSearchInput: throttle(function (e) {
    this.setData({ keyword: e.detail.value })
    this._resetAndLoad()
  }, 500),

  onSearchConfirm() { this._resetAndLoad() },

  onSearchClear() {
    this.setData({ keyword: '' })
    this._resetAndLoad()
  },

  // ───── 分类切换 ─────
  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key
    const idx = this.data.categories.findIndex(c => c.key === key)
    if (key === this.data.activeCategory) return
    this.setData({ activeCategory: key, activeCategoryIndex: idx })
    this._resetAndLoad()
  },

  // ───── 跳转详情 ─────
  onAchievementTap(e) {
    const item = e.currentTarget.dataset.item
    wx.navigateTo({
      url: `/pages/detail/detail?id=${item.id}`
    })
  },

  onBannerTap(e) {
    const item = e.currentTarget.dataset.item
    wx.navigateTo({
      url: `/pages/detail/detail?id=${item.id}`
    })
  }
})