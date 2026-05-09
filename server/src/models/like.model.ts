import mongoose, { Schema, Document, Types } from 'mongoose'

/**
 * 点赞文档接口
 */
export interface ILikeDocument extends Document {
  userId: Types.ObjectId
  workId: Types.ObjectId
  createdAt: Date
}

/**
 * 点赞关系集合 Schema
 * 记录用户对作品的点赞关系，通过复合唯一索引确保一用户对一作品只能点赞一次
 */
const likeSchema = new Schema<ILikeDocument>(
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

// 复合唯一索引：确保一用户对一作品只能点赞一次
likeSchema.index({ userId: 1, workId: 1 }, { unique: true })

// 按作品查询点赞列表
likeSchema.index({ workId: 1 })

// 按用户查询点赞列表
likeSchema.index({ userId: 1 })

export const Like = mongoose.model<ILikeDocument>('Like', likeSchema)
