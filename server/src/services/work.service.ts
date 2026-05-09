import { Work, IWorkDocument } from '../models/work.model'
import { Like } from '../models/like.model'
import { AppError } from '../middleware/errorHandler'
import { WorkType, WorkStatus } from '../types'

/**
 * 查询作品列表（分页 + 分类筛选 + 搜索）
 */
export async function getWorks(params: {
  categoryId?: string
  keyword?: string
  page: number
  pageSize: number
  currentUserId?: string | null
}) {
  const { categoryId, keyword, page, pageSize, currentUserId } = params

  // 构建查询条件
  const filter: any = { status: 'published' }

  // 分类筛选
  if (categoryId && categoryId !== 'all') {
    filter.categoryId = categoryId
  }

  // 关键词搜索
  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [new RegExp(keyword, 'i')] } },
    ]
  }

  // 查询总数
  const total = await Work.countDocuments(filter)

  // 查询列表
  const works = await Work.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate('userId', 'nickName avatarUrl')
    .lean()

  // 如果用户已登录，查询点赞状态
  let likedMap = new Map<string, boolean>()
  if (currentUserId && works.length > 0) {
    const workIds = works.map((w) => w._id)
    const likes = await Like.find({
      userId: currentUserId,
      workId: { $in: workIds },
    }).lean()
    likedMap = new Map(likes.map((l) => [l.workId.toString(), true]))
  }

  // 格式化返回数据
  const list = works.map((work) => ({
    id: work._id.toString(),
    title: work.title,
    author: (work.userId as any)?.nickName || '',
    authorAvatar: (work.userId as any)?.avatarUrl || '',
    date: work.createdAt,
    cover: work.cover,
    type: work.type,
    fileUrl: work.fileUrl,
    likes: work.likesCount,
    views: work.views,
    categoryId: work.categoryId,
    isBanner: work.isBanner,
    description: work.description,
    tags: work.tags,
    imageList: work.imageList,
    liked: likedMap.has(work._id.toString()),
  }))

  return {
    list,
    total,
    page,
    pageSize,
  }
}

/**
 * 获取 Banner 作品列表
 */
export async function getBannerWorks() {
  const works = await Work.find({ isBanner: true, status: 'published' })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'nickName avatarUrl')
    .lean()

  return works.map((work) => ({
    id: work._id.toString(),
    title: work.title,
    author: (work.userId as any)?.nickName || '',
    cover: work.cover,
    type: work.type,
    likes: work.likesCount,
    views: work.views,
  }))
}

/**
 * 获取作品详情
 */
export async function getWorkById(workId: string, currentUserId?: string | null) {
  const work = await Work.findById(workId)
    .populate('userId', 'nickName avatarUrl')
    .lean()

  if (!work) {
    throw new AppError('作品不存在', 404, 40402)
  }

  // 查询当前用户是否点赞
  let liked = false
  if (currentUserId) {
    const like = await Like.findOne({
      userId: currentUserId,
      workId: work._id,
    }).lean()
    liked = !!like
  }

  return {
    id: work._id.toString(),
    title: work.title,
    description: work.description,
    author: (work.userId as any)?.nickName || '',
    authorAvatar: (work.userId as any)?.avatarUrl || '',
    date: work.createdAt,
    cover: work.cover,
    type: work.type,
    fileUrl: work.fileUrl,
    likes: work.likesCount,
    views: work.views,
    categoryId: work.categoryId,
    isBanner: work.isBanner,
    tags: work.tags,
    imageList: work.imageList,
    liked,
  }
}

/**
 * 点赞/取消点赞（toggle）
 */
export async function toggleLike(workId: string, userId: string) {
  // 确认作品存在
  const work = await Work.findById(workId)
  if (!work) {
    throw new AppError('作品不存在', 404, 40402)
  }

  // 查询是否已点赞
  const existingLike = await Like.findOne({ userId, workId })

  if (existingLike) {
    // 已点赞 → 取消点赞
    await Like.deleteOne({ _id: existingLike._id })
    await Work.findByIdAndUpdate(workId, { $inc: { likesCount: -1 } })
    return { liked: false, likesCount: Math.max(0, work.likesCount - 1) }
  } else {
    // 未点赞 → 添加点赞
    await Like.create({ userId, workId })
    await Work.findByIdAndUpdate(workId, { $inc: { likesCount: 1 } })
    return { liked: true, likesCount: work.likesCount + 1 }
  }
}

/**
 * 记录浏览量 (防重复)
 */
export async function recordView(workId: string) {
  const result = await Work.findByIdAndUpdate(workId, { $inc: { views: 1 } }, { new: true })
  if (!result) {
    throw new AppError('作品不存在', 404, 40402)
  }
}

/**
 * 获取用户的作品列表
 */
export async function getUserWorks(userId: string, page: number, pageSize: number) {
  const filter = { userId }
  const total = await Work.countDocuments(filter)
  const works = await Work.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  return {
    list: works.map((w) => ({
      id: w._id.toString(),
      title: w.title,
      type: w.type,
      cover: w.cover,
      likes: w.likesCount,
      views: w.views,
      status: w.status,
      createdAt: w.createdAt,
    })),
    total,
    page,
    pageSize,
  }
}

/**
 * 获取用户点赞的作品列表
 */
export async function getUserLikedWorks(userId: string, page: number, pageSize: number) {
  const total = await Like.countDocuments({ userId })

  const likes = await Like.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .populate({
      path: 'workId',
      populate: { path: 'userId', select: 'nickName avatarUrl' },
    })
    .lean()

  const list = likes
    .filter((l) => l.workId) // 过滤掉已被删除的作品
    .map((l) => {
      const work = l.workId as any
      return {
        id: work._id.toString(),
        title: work.title,
        type: work.type,
        cover: work.cover,
        author: work.userId?.nickName || '',
        likes: work.likesCount,
        views: work.views,
        likedAt: l.createdAt,
      }
    })

  return { list, total, page, pageSize }
}

/**
 * 创建作品
 */
export async function createWork(
  userId: string,
  data: {
    title: string
    description?: string
    type: WorkType
    categoryId: string
    fileUrl?: string
    cover?: string
    imageList?: string[]
    tags?: string[]
    isBanner?: boolean
    status?: WorkStatus
  },
) {
  const work = await Work.create({
    userId,
    title: data.title,
    description: data.description || '',
    type: data.type,
    categoryId: data.categoryId,
    fileUrl: data.fileUrl || '',
    cover: data.cover || '',
    imageList: data.imageList || [],
    tags: data.tags || [],
    isBanner: data.isBanner || false,
    status: data.status || 'published',
  })

  return work
}

/**
 * 更新作品
 */
export async function updateWork(
  workId: string,
  userId: string,
  data: Partial<{
    title: string
    description: string
    type: WorkType
    categoryId: string
    fileUrl: string
    cover: string
    imageList: string[]
    tags: string[]
    isBanner: boolean
    status: WorkStatus
  }>,
) {
  const work = await Work.findById(workId)
  if (!work) {
    throw new AppError('作品不存在', 404, 40402)
  }
  if (work.userId.toString() !== userId) {
    throw new AppError('无权编辑此作品', 403, 40300)
  }

  Object.assign(work, data)
  await work.save()
  return work
}

/**
 * 删除作品
 */
export async function deleteWork(workId: string, userId: string) {
  const work = await Work.findById(workId)
  if (!work) {
    throw new AppError('作品不存在', 404, 40402)
  }
  if (work.userId.toString() !== userId) {
    throw new AppError('无权删除此作品', 403, 40300)
  }

  // 同时删除相关的点赞记录
  await Promise.all([
    Work.deleteOne({ _id: workId }),
    Like.deleteMany({ workId }),
  ])
}
