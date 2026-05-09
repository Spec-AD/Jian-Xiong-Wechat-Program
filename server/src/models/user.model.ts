import mongoose, { Schema, Document } from 'mongoose'
import { UserRole } from '../types'

/**
 * 用户文档接口
 */
export interface IUserDocument extends Document {
  openid: string
  nickName: string
  avatarUrl: string
  role: UserRole
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * 用户集合 Schema
 */
const userSchema = new Schema<IUserDocument>(
  {
    openid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    nickName: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        const { __v, openid, ...rest } = ret
        return rest
      },
    },
  },
)

export const User = mongoose.model<IUserDocument>('User', userSchema)
