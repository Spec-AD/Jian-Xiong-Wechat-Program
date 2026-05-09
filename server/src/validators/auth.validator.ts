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
]
