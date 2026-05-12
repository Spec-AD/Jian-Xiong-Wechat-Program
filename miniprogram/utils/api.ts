/**
 * utils/api.ts — 健雄书院 API 请求封装
 *
 * 功能：
 *  - 自动注入 JWT token（从 storage 获取）
 *  - 统一错误处理
 *  - 请求/响应拦截
 */

const TOKEN_KEY = 'jianxiong_token'

/** 后端 API 基础地址 — 按需修改 */


/** @note 真机调试/预览时改为电脑局域网 IP */
const BASE_URL = 'https://jx-plform.site/api'

/** 获取缓存的 token */
export function getToken(): string {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

/** 保存 token */
export function setToken(token: string): void {
  wx.setStorageSync(TOKEN_KEY, token)
}

/** 清除 token */
export function removeToken(): void {
  wx.removeStorageSync(TOKEN_KEY)
}

/** 通用请求选项 */
interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  /** 是否需要 token（默认 true） */
  needAuth?: boolean
  /** 是否显示加载中（默认 false） */
  showLoading?: boolean
}

/** 请求超时重试次数 */
const MAX_RETRIES = 2

/**
 * 前端请求缓存（内存缓存，避免短时间重复请求）
 * 仅用于公开的 GET 请求
 */
const requestCache = new Map<string, { data: any; expiry: number }>()

/** 缓存有效期（毫秒）— 公开列表缓存 30 秒，详情缓存 60 秒 */
const CACHE_TTL: Record<string, number> = {
  '/works': 30 * 1000,
  '/works/banner': 60 * 1000,
}

function getCacheKey(url: string, data?: Record<string, any>): string {
  return data ? `${url}?${JSON.stringify(data)}` : url
}

function getFromCache(url: string, data?: Record<string, any>): any | null {
  // 只在缓存配置中存在 TTL 的接口启用缓存
  const baseUrl = Object.keys(CACHE_TTL).find((k) => url.startsWith(k))
  if (!baseUrl) return null

  const key = getCacheKey(url, data)
  const cached = requestCache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }
  return null
}

function setCache(url: string, data: any, dataParam?: Record<string, any>) {
  const baseUrl = Object.keys(CACHE_TTL).find((k) => url.startsWith(k))
  if (!baseUrl) return

  const key = getCacheKey(url, dataParam)
  requestCache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL[baseUrl],
  })
}

/** 后端统一响应格式 */
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T | null
}

/** 分页数据格式 */
export interface PaginatedData<T> {
  list: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 通用请求函数
 * 自动拼接 baseUrl、注入 token、处理错误
 */
export function request<T = any>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    needAuth = true,
    showLoading = false,
  } = options

  // ========== 对公开 GET 请求启用缓存 ==========
  if (method === 'GET' && !needAuth) {
    const cached = getFromCache(url, data)
    if (cached) {
      return Promise.resolve(cached as T)
    }
  }

  let retries = 0

  const doRequest = (): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      // ========== 检查登录态 ==========
      if (needAuth && !getToken()) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        reject(new Error('未登录'))
        return
      }

      // ========== 加载提示 ==========
      if (showLoading) {
        wx.showLoading({ title: '加载中...', mask: true })
      }

      // ========== 发起请求 ==========
      const header: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (needAuth && getToken()) {
        header['Authorization'] = `Bearer ${getToken()}`
      }

      wx.request({
        url: `${BASE_URL}${url}`,
        method,
        data,
        header,
        timeout: 20000,

        success: (res) => {
          if (showLoading) wx.hideLoading()

          const body = res.data as ApiResponse<T>

          // 后端返回了数据（即使 HTTP 200，业务 code 可能非 0）
          if (body && typeof body.code === 'number') {
            if (body.code === 0) {
              // —— 成功 ——
              // 对公开 GET 请求写入缓存
              if (method === 'GET' && !needAuth) {
                setCache(url, body.data, data)
              }
              resolve(body.data as T)
            } else if (body.code === 40101 || body.code === 40102) {
              // —— token 过期/无效，跳登录 ——
              removeToken()
              wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
              wx.navigateTo({ url: '/pages/login/login' })
              reject(new Error(body.message))
            } else if (body.code >= 40400 && body.code < 40500) {
              // —— 资源不存在类错误（404xx），静默处理 ——
              // 调用方已在各自 catch 中做降级处理，不必弹 Toast 干扰用户
              reject(new Error(body.message))
            } else {
              // —— 其它业务错误 ——
              wx.showToast({ title: body.message || '请求失败', icon: 'none' })
              reject(new Error(body.message))
            }
          } else {
            // 响应格式异常
            wx.showToast({ title: '服务器响应异常', icon: 'none' })
            reject(new Error('服务器响应异常'))
          }
      },

        fail: (err) => {
          if (showLoading) wx.hideLoading()
          // 超时等网络错误时自动重试
          if (retries < MAX_RETRIES) {
            retries++
            console.log(`[API] 请求失败，第 ${retries} 次重试: ${url}`)
            setTimeout(() => {
              doRequest().then(resolve).catch(reject)
            }, 1000)
          } else {
            const msg = err.errMsg || '网络异常，请检查网络连接'
            wx.showToast({ title: msg, icon: 'none' })
            reject(new Error(msg))
          }
        },
      })
    })
  }

  return doRequest()
}

// ========== 业务 API 封装 ==========

/**
 * 微信登录 — POST /api/auth/login
 * 发送 code + 微信用户信息 到后端，返回 token + openid + 用户信息
 * @param nickName 可选，微信授权获取的昵称
 * @param avatarUrl 可选，微信授权获取的头像 URL
 */
export function loginWithCode(
  code: string,
  nickName?: string,
  avatarUrl?: string,
): Promise<{
  token: string
  openid: string
  user: { id: string; nickName: string; avatarUrl: string }
}> {
  return request<{
    token: string
    openid: string
    user: { id: string; nickName: string; avatarUrl: string }
  }>({
    url: '/auth/login',
    method: 'POST',
    data: {
      code,
      ...(nickName ? { nickName } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    needAuth: false,
  })
}

/**
 * 获取用户信息 — GET /api/user/profile
 */
export function getUserProfile(): Promise<{
  id: string
  nickName: string
  avatarUrl: string
  role: string
  createdAt: string
}> {
  return request({
    url: '/user/profile',
    method: 'GET',
  })
}

/**
 * 更新用户信息 — PUT /api/user/profile
 */
export function updateUserProfile(data: {
  nickName?: string
  avatarUrl?: string
  signature?: string
  birthday?: string
  region?: string[]
  interests?: string[]
}): Promise<{
  id: string
  nickName: string
  avatarUrl: string
  role: string
}> {
  return request({
    url: '/user/profile',
    method: 'PUT',
    data,
  })
}

/**
 * 获取用户统计 — GET /api/user/stats
 */
export function getUserStats(): Promise<{
  publishCount: number
  likeCount: number
  viewCount: number
}> {
  return request({
    url: '/user/stats',
    method: 'GET',
  })
}

/**
 * 获取作品列表 — GET /api/works
 */
export function getWorks(params?: {
  page?: number
  pageSize?: number
  categoryId?: string
  keyword?: string
}): Promise<PaginatedData<any>> {
  // 清理 undefined 值，避免 wx.request 序列化为字符串 "undefined"
  const cleanParams: Record<string, any> = {}
  if (params) {
    for (const key of Object.keys(params)) {
      const val = (params as any)[key]
      if (val !== undefined && val !== null) {
        cleanParams[key] = val
      }
    }
  }
  return request({
    url: '/works',
    method: 'GET',
    data: cleanParams,
    needAuth: false,
  })
}

/**
 * 获取 Banner 作品 — GET /api/works/banner
 */
export function getBannerWorks(): Promise<any[]> {
  return request({
    url: '/works/banner',
    method: 'GET',
    needAuth: false,
  })
}

/**
 * 获取作品详情 — GET /api/works/:id
 */
export function getWorkDetail(id: string): Promise<any> {
  return request({
    url: `/works/${id}`,
    method: 'GET',
    needAuth: false,
  })
}

/**
 * 点赞/取消点赞 — POST /api/works/:id/like
 */
export function toggleLike(id: string): Promise<{ liked: boolean; likesCount: number }> {
  return request({
    url: `/works/${id}/like`,
    method: 'POST',
  })
}

/**
 * 获取我的作品列表 — GET /api/works/my/list
 * 返回分页数据 { list, total, page, pageSize }
 */
export function getMyWorks(params?: {
  page?: number
  pageSize?: number
}): Promise<PaginatedData<any>> {
  return request({
    url: '/works/my/list',
    method: 'GET',
    data: params as Record<string, any>,
  })
}

/**
 * 获取我点赞的作品列表 — GET /api/works/liked/list
 * 返回分页数据 { list, total, page, pageSize }
 */
export function getLikedWorks(params?: {
  page?: number
  pageSize?: number
}): Promise<PaginatedData<any>> {
  return request({
    url: '/works/liked/list',
    method: 'GET',
    data: params as Record<string, any>,
  })
}

/**
 * 记录浏览量 — POST /api/works/:id/view
 * 用户已登录时会同步记录浏览历史
 */
export function recordView(id: string): Promise<void> {
  return request({
    url: `/works/${id}/view`,
    method: 'POST',
    needAuth: false,
  })
}

/**
 * 获取浏览记录 — GET /api/user/history
 * 返回分页数据 { list, total, page, pageSize }
 */
export function getHistory(params?: {
  page?: number
  pageSize?: number
}): Promise<PaginatedData<any>> {
  return request({
    url: '/user/history',
    method: 'GET',
    data: params as Record<string, any>,
  })
}

/**
 * 上传文件 — POST /api/upload
 * 使用 wx.uploadFile（multipart/form-data）
 * @returns { url, filename }
 */
export function uploadFile(tempFilePath: string, type?: string, name?: string): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    wx.uploadFile({
      url: `${BASE_URL}/upload`,
      filePath: tempFilePath,
      name: 'file',
      formData: {
        ...(type ? { type } : {}),
        ...(name ? { name } : {}),
      },
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: (res) => {
        try {
          const body = JSON.parse(res.data)
          if (body.code === 0 && body.data) {
            resolve(body.data)
          } else {
            reject(new Error(body.message || '上传失败'))
          }
        } catch {
          reject(new Error('上传响应异常'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络异常'))
      },
    })
  })
}

/**
 * 创建作品 — POST /api/works
 */
export function createWork(data: {
  title: string
  description?: string
  type: string
  categoryId: string
  fileUrl: string
  cover?: string
  imageList?: string[]
  tags?: string[]
}): Promise<any> {
  return request({
    url: '/works',
    method: 'POST',
    data,
  })
}

/**
 * 更新作品 — PUT /api/works/:id
 */
export function updateWork(id: string, data: {
  title?: string
  description?: string
  type?: string
  categoryId?: string
  fileUrl?: string
  cover?: string
  imageList?: string[]
  tags?: string[]
  status?: string
}): Promise<any> {
  return request({
    url: `/works/${id}`,
    method: 'PUT',
    data,
  })
}

/**
 * 删除作品 — DELETE /api/works/:id
 */
export function deleteWork(id: string): Promise<any> {
  return request({
    url: `/works/${id}`,
    method: 'DELETE',
  })
}

// ========== 评论 API ==========

/**
 * 获取作品评论列表 — GET /api/works/:id/comments
 */
export function getWorkComments(workId: string): Promise<{
  list: Array<{
    id: string
    author: string
    authorAvatar: string
    content: string
    createdAt: string
  }>
}> {
  return request({
    url: `/works/${workId}/comments`,
    method: 'GET',
    needAuth: false,
  })
}

/**
 * 添加评论 — POST /api/works/:id/comments
 */
export function addWorkComment(workId: string, content: string): Promise<{
  comment: {
    id: string
    author: string
    authorAvatar: string
    content: string
    createdAt: string
  }
}> {
  return request({
    url: `/works/${workId}/comments`,
    method: 'POST',
    data: { content },
  })
}
