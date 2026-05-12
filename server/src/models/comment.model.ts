import mongoose, { Schema, Document, Types } from 'mongoose'

/**
 * 评论文档接口
 */
export interface ICommentDocument extends Document {
  workId: Types.ObjectId
  userId: Types.ObjectId
  content: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 评论集合 Schema
 */
const commentSchema = new Schema<ICommentDocument>(
  {
    workId: {
      type: Schema.Types.ObjectId,
      ref: 'Work',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
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

// 按作品查询评论（按时间排序）
commentSchema.index({ workId: 1, createdAt: -1 })

export const Comment = mongoose.model<ICommentDocument>('Comment', commentSchema)
