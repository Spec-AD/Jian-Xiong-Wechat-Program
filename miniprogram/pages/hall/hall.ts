// pages/hall/hall.ts
import { WORK_CATEGORIES, getFileTypeLabel, getFileTypeIcon, FileType, toast } from '../../utils/util'

interface WorkItem {
  id: string
  title: string
  author: string
  authorAvatar: string
  date: string
  cover: string
  type: FileType
  typeName: string
  typeIcon: string
  fileUrl: string
  likes: number
  views: number
  categoryId: string
  isBanner: boolean
  description: string
  tags: string[]
  imageList: string[] // 多图时使用
}

// ─── Mock 数据：后端联调时替换为 wx.request ───
const MOCK_WORKS: WorkItem[] = [
  {
    id: '1', title: '健雄书院2024年度汇报', author: '张明远', authorAvatar: '',
    date: '2024-06-15', cover: '', type: 'video', fileUrl: 'https://www.w3schools.com/html/movie.mp4',
    typeName: '视频', typeIcon: '🎬', likes: 42, views: 312, categoryId: 'video',
    isBanner: true, description: '本视频详细回顾了健雄书院2024年度在学业、科研、文艺、体育等方面的丰硕成果。',
    tags: ['年度汇报', '书院文化'], imageList: [],
  },
  {
    id: '2', title: '院歌演唱录音《健雄之声》', author: '合唱团', authorAvatar: '',
    date: '2024-05-20', cover: '', type: 'audio', fileUrl: 'https://www.w3schools.com/html/horse.mp3',
    typeName: '音频', typeIcon: '🎵', likes: 88, views: 256, categoryId: 'audio',
    isBanner: true, description: '由书院合唱团精心演绎，展现书院精神与文化底蕴的院歌录音。',
    tags: ['音乐', '合唱', '院歌'], imageList: [],
  },
  {
    id: '3', title: '书院风光摄影集', author: '李晓婷', authorAvatar: '',
    date: '2024-04-10', cover: '', type: 'image', fileUrl: 'https://picsum.photos/750/2000',
    typeName: '图片', typeIcon: '🖼️', likes: 65, views: 489, categoryId: 'image',
    isBanner: false, description: '用镜头记录书院四季风貌，长图展示全景摄影作品。',
    tags: ['摄影', '书院风光'], imageList: ['https://picsum.photos/750/2000', 'https://picsum.photos/750/1600'],
  },
  {
    id: '4', title: '水质智能检测系统结题报告', author: '王子轩', authorAvatar: '',
    date: '2024-03-28', cover: '', type: 'doc', fileUrl: 'https://www.africau.edu/images/default/sample.pdf',
    typeName: '文档', typeIcon: '📄', likes: 19, views: 134, categoryId: 'doc',
    isBanner: false, description: '基于机器学习的水质检测系统，荣获省级竞赛一等奖，已申请专利。',
    tags: ['科研', '机器学习', '竞赛'], imageList: [],
  },
  {
    id: '5', title: '苏北支教社会实践纪录片', author: '志愿服务队', authorAvatar: '',
    date: '2024-06-01', cover: '', type: 'video', fileUrl: 'https://www.w3schools.com/html/movie.mp4',
    typeName: '视频', typeIcon: '🎬', likes: 37, views: 201, categoryId: 'video',
    isBanner: false, description: '暑期赴苏北农村支教15天，服务学生200余名，记录全程的纪录片。',
    tags: ['志愿', '支教', '社会实践'], imageList: [],
  },
  {
    id: '6', title: '书法作品展——行云流水', author: '陈思雨', authorAvatar: '',
    date: '2024-05-08', cover: '', type: 'image', fileUrl: 'https://picsum.photos/750/1200',
    typeName: '图片', typeIcon: '🖼️', likes: 54, views: 367, categoryId: 'image',
    isBanner: false, description: '以传统书法艺术展示中华文化之美，书法社年度优秀作品集。',
    tags: ['书法', '文艺', '传统文化'], imageList: [],
  },
]

Page({
  data: {
    categories: WORK_CATEGORIES,
    activeCategory: 'all',
    keyword: '',
    allWorks: MOCK_WORKS as WorkItem[],
    filteredWorks: MOCK_WORKS as WorkItem[],
    bannerList: MOCK_WORKS.filter(w => w.isBanner) as WorkItem[],
    loading: false,
    refreshing: false,
  },

  onLoad() {
    this._filter()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.setData({ refreshing: true })
    // TODO: 替换为实际 API 请求
    setTimeout(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
      toast('已是最新内容', 'success')
    }, 800)
  },

  /** 触底加载更多 */
  onReachBottom() {
    // TODO: 分页加载
    toast('已加载全部内容')
  },

  onShareAppMessage() {
    return {
      title: '健雄书院 · 学生成果展示平台',
      path: '/pages/hall/hall',
    }
  },

  onTabTap(e: any) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeCategory) return
    this.setData({ activeCategory: id })
    this._filter()
  },

  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    this._filter()
  },

  onSearchClear() {
    this.setData({ keyword: '' })
    this._filter()
  },

  _filter() {
    const { allWorks, activeCategory, keyword } = this.data
    const kw = keyword.trim().toLowerCase()
    const result = allWorks.filter(w => {
      const matchCat = activeCategory === 'all' || w.categoryId === activeCategory
      const matchKw = !kw ||
        w.title.toLowerCase().includes(kw) ||
        w.author.toLowerCase().includes(kw) ||
        w.tags.some(t => t.toLowerCase().includes(kw))
      return matchCat && matchKw
    })
    this.setData({ filteredWorks: result })
  },

  onBannerTap(e: any) {
    this._goViewer(e.currentTarget.dataset.item)
  },

  onWorkTap(e: any) {
    this._goViewer(e.currentTarget.dataset.item)
  },

  _goViewer(item: WorkItem) {
    wx.navigateTo({
      url: `/pages/viewer/viewer?id=${item.id}&type=${item.type}&url=${encodeURIComponent(item.fileUrl)}&title=${encodeURIComponent(item.title)}&imageList=${encodeURIComponent(JSON.stringify(item.imageList))}`,
    })
  },
})