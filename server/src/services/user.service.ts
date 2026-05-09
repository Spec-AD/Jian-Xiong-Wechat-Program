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
  const updateData: Partial<Pick<IUserDocument, 'nickName' | 'avatarUrl'>> = {}

  if (data.nickName !== undefined) {
    updateData.nickName = data.nickName
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl
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
