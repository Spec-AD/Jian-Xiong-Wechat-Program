import mongoose, { Schema, Document, Types } from 'mongoose'

/**
 * 浏览历史文档接口
 */
export interface IViewHistoryDocument extends Document {
  userId: Types.ObjectId
  workId: Types.ObjectId
  viewedAt: Date
}

/**
 * 浏览历史集合 Schema
 * 记录用户对作品的浏览记录，用于「浏览记录」功能
 */
const viewHistorySchema = new Schema<IViewHistoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workId: {
      type: Schema.Types.ObjectId,
      ref: 'Work',
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
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

// 按用户查询浏览记录（按浏览时间倒序）
viewHistorySchema.index({ userId: 1, viewedAt: -1 })

// 复合唯一索引：同一用户对同一作品只保留一条浏览记录
viewHistorySchema.index({ userId: 1, workId: 1 }, { unique: true })

// 按作品查询哪些用户浏览过
viewHistorySchema.index({ workId: 1 })

export const ViewHistory = mongoose.model<IViewHistoryDocument>('ViewHistory', viewHistorySchema)
