import { Request } from 'express'

// ============ 用户相关 ============
export type UserRole = 'student' | 'admin'

export interface IUser {
  _id: string
  openid: string
  nickName: string
  avatarUrl: string
  role: UserRole
  lastLoginAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

// ============ 作品相关 ============
export type WorkType = 'video' | 'audio' | 'image' | 'doc' | 'unknown'
export type WorkStatus = 'draft' | 'published' | 'hidden'

export interface IWork {
  _id: string
  userId: string | IUser
  title: string
  description?: string
  type: WorkType
  categoryId: string
  fileUrl?: string
  cover?: string
  imageList: string[]
  tags: string[]
  isBanner: boolean
  views: number
  likesCount: number
  status: WorkStatus
  createdAt?: Date
  updatedAt?: Date
}

// ============ 点赞相关 ============
export interface ILike {
  _id: string
  userId: string
  workId: string
  createdAt?: Date
}

// ============ API 响应格式 ============
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T | null
}

export interface PaginatedData<T> {
  list: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ============ 带用户信息的请求 ============
export interface AuthRequest extends Request {
  user?: {
    id: string
    openid: string
    role: UserRole
  }
}

// ============ 登录相关 ============
export interface LoginResponse {
  token: string
  openid: string
  user: {
    id: string
    nickName: string
    avatarUrl: string
  }
}

// ============ 统计数据 ============
export interface UserStats {
  publishCount: number
  likeCount: number
  viewCount: number
}

// ============ 微信相关 ============
export interface WxLoginResult {
  session_key: string
  openid: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export interface WxUserInfo {
  nickName: string
  avatarUrl: string
}
