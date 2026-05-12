import { User, IUserDocument } from '../models/user.model'
import { WxUserInfo } from '../types'
import { AppError } from '../middleware/errorHandler'

/**
 * 获取用户信息（不返回 openid）
 */
export async function getUserById(userId: string) {
  const user = await User.findById(userId)

  if (!user) {
    throw new AppError('用户不存在', 404, 40401)
  }

  return user
}

/**
 * 更新用户资料（昵称、头像）
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<WxUserInfo>,
): Promise<IUserDocument> {
  const updateData: Partial<Pick<IUserDocument, 'nickName' | 'avatarUrl' | 'signature' | 'birthday' | 'region' | 'interests'>> = {}

  if (data.nickName !== undefined) {
    updateData.nickName = data.nickName
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl
  }
  if (data.signature !== undefined) {
    updateData.signature = data.signature
  }
  if (data.birthday !== undefined) {
    updateData.birthday = data.birthday
  }
  if (data.region !== undefined) {
    updateData.region = data.region
  }
  if (data.interests !== undefined) {
    updateData.interests = data.interests
  }

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true, // 返回更新后的文档
    runValidators: true, // 运行 Schema 验证
  })

  if (!user) {
    throw new AppError('用户不存在', 404, 40401)
  }

  return user
}
