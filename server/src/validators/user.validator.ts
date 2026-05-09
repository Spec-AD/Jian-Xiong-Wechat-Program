import { body } from 'express-validator'

/**
 * 更新用户资料校验
 */
export const updateProfileValidator = [
  body('nickName')
    .optional()
    .isString()
    .withMessage('昵称必须是字符串')
    .isLength({ max: 50 })
    .withMessage('昵称最长 50 个字符')
    .trim()
    .escape(),
  body('avatarUrl')
    .optional()
    .isString()
    .withMessage('头像 URL 必须是字符串'),
]
