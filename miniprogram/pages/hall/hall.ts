// hall.ts
interface WorkItem {
  id: string
  title: string
  author: string
  date: string
  cover: string
  type: string
  typeName: string
  typeIcon: string
  fileUrl: string
  likes: number
  categoryId: string
}

const CATEGORIES = [
  { id: 'all', name: '全部', icon: '🏛️' },
  { id: 'video', name: '视频', icon: '🎬' },
  { id: 'audio', name: '音频', icon: '🎵' },
  { id: 'image', name: '图片', icon: '🖼️' },
  { id: 'doc', name: '文档', icon: '📄' },
]

// Mock data — replace with real API call
const MOCK_WORKS: WorkItem[] = [
  {
    id: '1', title: '健雄书院2024年度汇报', author: '张同学',
    date: '2024-06', cover: '', type: 'video', typeName: '视频',
    typeIcon: '🎬', fileUrl: '', likes: 42, categoryId: 'video',
  },
  {
    id: '2', title: '院歌演唱录音', author: '合唱团',
    date: '2024-05', cover: '', type: 'audio', typeName: '音频',
    typeIcon: '🎵', fileUrl: '', likes: 28, categoryId: 'audio',
  },
  {
    id: '3', title: '书院风光摄影集', author: '李同学',
    date: '2024-04', cover: '', type: 'image', typeName: '图片',
    typeIcon: '🖼️', fileUrl: '', likes: 65, categoryId: 'image',
  },
  {
    id: '4', title: '科研项目结题报告', author: '王同学',
    date: '2024-03', cover: '', type: 'doc', typeName: '文档',
    typeIcon: '📄', fileUrl: '', likes: 19, categoryId: 'doc',
  },
  {
    id: '5', title: '社会实践纪录片', author: '实践队',
    date: '2024-06', cover: '', type: 'video', typeName: '视频',
    typeIcon: '🎬', fileUrl: '', likes: 37, categoryId: 'video',
  },
  {
    id: '6', title: '书法作品展', author: '陈同学',
    date: '2024-05', cover: '', type: 'image', typeName: '图片',
    typeIcon: '🖼️', fileUrl: '', likes: 54, categoryId: 'image',
  },
]

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: 'all',
    keyword: '',
    allWorks: MOCK_WORKS,
    filteredWorks: MOCK_WORKS,
  },

  onTabTap(e: any) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeCategory: id })
    this._filter()
  },

  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    this._filter()
  },

  _filter() {
    const { allWorks, activeCategory, keyword } = this.data
    const kw = keyword.trim().toLowerCase()
    const result = allWorks.filter(w => {
      const matchCat = activeCategory === 'all' || w.categoryId === activeCategory
      const matchKw = !kw || w.title.toLowerCase().includes(kw) || w.author.toLowerCase().includes(kw)
      return matchCat && matchKw
    })
    this.setData({ filteredWorks: result })
  },

  onWorkTap(e: any) {
    const item: WorkItem = e.currentTarget.dataset.item
    wx.navigateTo({
      url: `/pages/viewer/viewer?type=${item.type}&url=${encodeURIComponent(item.fileUrl)}&title=${encodeURIComponent(item.title)}`,
    })
  },
})