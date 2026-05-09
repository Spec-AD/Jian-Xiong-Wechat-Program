import mongoose, { Schema, Document, Types } from 'mongoose'
import { WorkType, WorkStatus } from '../types'

/**
 * 作品文档接口
 */
export interface IWorkDocument extends Document {
  userId: Types.ObjectId
  title: string
  description: string
  type: WorkType
  categoryId: string
  fileUrl: string
  cover: string
  imageList: string[]
  tags: string[]
  isBanner: boolean
  views: number
  likesCount: number
  status: WorkStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * 作品集合 Schema
 */
const workSchema = new Schema<IWorkDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['video', 'audio', 'image', 'doc', 'unknown'],
      default: 'unknown',
    },
    categoryId: {
      type: String,
      default: '',
      index: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    cover: {
      type: String,
      default: '',
    },
    imageList: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    isBanner: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'hidden'],
      default: 'published',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        const { __v, ...rest } = ret
        return rest
      },
    },
  },
)

// ============ 索引 ============

// 按时间排序查询已发布作品
workSchema.index({ status: 1, createdAt: -1 })

// 按分类 + 状态 + 时间筛选
workSchema.index({ categoryId: 1, status: 1, createdAt: -1 })

// 查询 Banner 作品
workSchema.index({ isBanner: 1, status: 1 })

// 文本索引 — 搜索功能
workSchema.index({ title: 'text', description: 'text', tags: 'text' })

export const Work = mongoose.model<IWorkDocument>('Work', workSchema)
