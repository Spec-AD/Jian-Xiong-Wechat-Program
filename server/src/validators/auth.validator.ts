import { body } from 'express-validator'

/**
 * 登录参数校验
 */
export const loginValidator = [
  body('code')
    .notEmpty()
    .withMessage('登录 code 不能为空')
    .isString()
    .withMessage('登录 code 必须是字符串'),
  body('nickName')
    .optional()
    .isString()
    .withMessage('nickName 必须是字符串'),
  body('avatarUrl')
    .optional()
    .isString()
    .withMessage('avatarUrl 必须是字符串'),
]
