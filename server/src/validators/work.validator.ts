import { body } from 'express-validator'

/**
 * 创建/更新作品校验
 */
export const createWorkValidator = [
  body('title')
    .notEmpty()
    .withMessage('作品标题不能为空')
    .isString()
    .withMessage('标题必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('标题长度 1-100 个字符')
    .trim(),
  body('type')
    .notEmpty()
    .withMessage('作品类型不能为空')
    .isIn(['video', 'audio', 'image', 'doc', 'unknown'])
    .withMessage('无效的作品类型'),
  body('categoryId')
    .notEmpty()
    .withMessage('分类不能为空')
    .isString()
    .withMessage('分类 ID 必须是字符串'),
  body('description')
    .optional()
    .isString()
    .withMessage('描述必须是字符串')
    .isLength({ max: 2000 })
    .withMessage('描述最长 2000 个字符'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('imageList')
    .optional()
    .isArray()
    .withMessage('图片列表必须是数组'),
]

export const updateWorkValidator = [
  body('title')
    .optional()
    .isString()
    .withMessage('标题必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('标题长度 1-100 个字符')
    .trim(),
  body('type')
    .optional()
    .isIn(['video', 'audio', 'image', 'doc', 'unknown'])
    .withMessage('无效的作品类型'),
  body('categoryId')
    .optional()
    .isString()
    .withMessage('分类 ID 必须是字符串'),
  body('description')
    .optional()
    .isString()
    .withMessage('描述必须是字符串')
    .isLength({ max: 2000 })
    .withMessage('描述最长 2000 个字符'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('imageList')
    .optional()
    .isArray()
    .withMessage('图片列表必须是数组'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'hidden'])
    .withMessage('无效的状态值'),
]
