import { body, query, param } from 'express-validator'

/**
 * 通用分页参数校验
 */
export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每页条数必须在 1-50 之间'),
]

/**
 * 作品列表查询参数校验
 */
export const listWorksValidator = [
  ...paginationValidator,
  query('category')
    .optional()
    .isString()
    .withMessage('分类必须是字符串'),
  query('keyword')
    .optional()
    .isString()
    .withMessage('关键词必须是字符串')
    .isLength({ max: 100 })
    .withMessage('关键词最长 100 个字符')
    .trim(),
]

/**
 * MongoDB ObjectId 参数校验
 */
export const objectIdParamValidator = [
  param('id')
    .notEmpty()
    .withMessage('ID 不能为空')
    .isMongoId()
    .withMessage('无效的 ID 格式'),
]

/**
 * 创建作品校验
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
    .isIn(['video', 'audio', 'image', 'doc', 'markdown', 'link', 'unknown'])
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
  body('fileUrl')
    .optional()
    .isString()
    .withMessage('文件 URL 必须是字符串'),
  body('cover')
    .optional()
    .isString()
    .withMessage('封面 URL 必须是字符串'),
  body('isBanner')
    .optional()
    .isBoolean()
    .withMessage('Banner 标识必须是布尔值'),
  body('actualAuthor')
    .optional()
    .isString()
    .withMessage('实际作者必须是字符串')
    .isLength({ max: 50 })
    .withMessage('实际作者最长 50 个字符')
    .trim(),
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
    .isIn(['video', 'audio', 'image', 'doc', 'markdown', 'link', 'unknown'])
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
  body('actualAuthor')
    .optional()
    .isString()
    .withMessage('实际作者必须是字符串')
    .isLength({ max: 50 })
    .withMessage('实际作者最长 50 个字符')
    .trim(),
]

