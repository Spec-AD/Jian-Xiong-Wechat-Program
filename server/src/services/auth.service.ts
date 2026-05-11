import { User } from '../models/user.model'
import { generateToken } from '../utils/jwt'
import { wxLogin, generateDefaultNickName } from '../utils/wx'
import { AppError } from '../middleware/errorHandler'
import { LoginResponse, UserStats } from '../types'
import { Work } from '../models/work.model'
import { Like } from '../models/like.model'

/**
 * 微信登录
 * 1. 用 code 向微信服务器换取 openid
 * 2. 根据 openid 查找/创建用户
 * 3. 如有微信昵称/头像则更新用户信息
 * 4. 生成 JWT token
 * 5. 返回登录结果
 */
export async function loginWithWechat(
  code: string,
  nickName?: string,
  avatarUrl?: string,
): Promise<LoginResponse> {
  if (!code) {
    throw new AppError('登录 code 不能为空', 400, 40001)
  }

  // 1. 微信登录换取 openid
  const wxResult = await wxLogin(code)

  if (!wxResult.openid) {
    throw new AppError('微信登录失败，未获取到用户标识', 401, 40110)
  }

  // 2. 查找或创建用户
  let user = await User.findOne({ openid: wxResult.openid })

  if (!user) {
    // 新用户：创建记录（优先使用微信授权获取的昵称/头像，否则用默认值）
    user = await User.create({
      openid: wxResult.openid,
      nickName: nickName || generateDefaultNickName(wxResult.openid),
      avatarUrl: avatarUrl || '',
      lastLoginAt: new Date(),
    })
  } else {
    // 老用户：更新最后登录时间，如有新的微信信息也同步更新
    user.lastLoginAt = new Date()
    if (nickName) user.nickName = nickName
    if (avatarUrl) user.avatarUrl = avatarUrl
    await user.save()
  }

  // 3. 生成 JWT
  const token = generateToken({
    id: user._id.toString(),
    openid: user.openid,
    role: user.role,
  })

  // 4. 返回结果
  return {
    token,
    openid: user.openid,
    user: {
      id: user._id.toString(),
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
    },
  }
}

/**
 * 获取用户统计数据
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [publishCount, likeCount, viewResult] = await Promise.all([
    Work.countDocuments({ userId, status: 'published' }),
    Like.countDocuments({ userId }),
    Work.aggregate([
      { $match: { userId: userId.toString() } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]),
  ])

  return {
    publishCount,
    likeCount,
    viewCount: viewResult[0]?.total || 0,
  }
}
