"use strict";
/**
 * utils/api.ts — 健雄书院 API 请求封装
 *
 * 功能：
 *  - 自动注入 JWT token（从 storage 获取）
 *  - 统一错误处理
 *  - 请求/响应拦截
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = getToken;
exports.setToken = setToken;
exports.removeToken = removeToken;
exports.requireAuth = requireAuth;
exports.request = request;
exports.loginWithCode = loginWithCode;
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.getUserStats = getUserStats;
exports.getWorks = getWorks;
exports.getBannerWorks = getBannerWorks;
exports.getWorkDetail = getWorkDetail;
exports.toggleLike = toggleLike;
exports.getMyWorks = getMyWorks;
exports.getLikedWorks = getLikedWorks;
exports.recordView = recordView;
exports.getHistory = getHistory;
exports.uploadFile = uploadFile;
exports.createWork = createWork;
exports.updateWork = updateWork;
exports.deleteWork = deleteWork;
exports.getWorkComments = getWorkComments;
exports.addWorkComment = addWorkComment;
const TOKEN_KEY = 'jianxiong_token';
/** 后端 API 基础地址 — 按需修改 */
/** @note 真机调试/预览时改为电脑局域网 IP */
const BASE_URL = 'https://jx-plform.site/api';
/** 获取缓存的 token */
function getToken() {
    return wx.getStorageSync(TOKEN_KEY) || '';
}
/** 保存 token */
function setToken(token) {
    wx.setStorageSync(TOKEN_KEY, token);
}
/** 清除 token */
function removeToken() {
    wx.removeStorageSync(TOKEN_KEY);
}

/**
 * 统一登录校验：未登录时跳转到登录页
 * @param {string} tip 可选提示文案，默认'请先登录'
 * @returns {boolean} true=已登录, false=未登录
 */
function requireAuth(tip) {
    if (getToken()) {
        return true;
    }

    // 避免在登录页循环跳转
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/login/login') {
        return false;
    }

    wx.showToast({ title: tip || '请先登录', icon: 'none' });
    setTimeout(function () {
        wx.navigateTo({ url: '/pages/login/login' });
    }, 500);
    return false;
}
/** 请求超时重试次数 */
const MAX_RETRIES = 2;
/**
 * 前端请求缓存（内存缓存，避免短时间重复请求）
 * 仅用于公开的 GET 请求
 */
const requestCache = new Map();
/** 缓存有效期（毫秒）— 公开列表缓存 30 秒，详情缓存 60 秒 */
const CACHE_TTL = {
    '/works': 30 * 1000,
    '/works/banner': 60 * 1000,
};
function getCacheKey(url, data) {
    return data ? `${url}?${JSON.stringify(data)}` : url;
}
function getFromCache(url, data) {
    // 只在缓存配置中存在 TTL 的接口启用缓存
    const baseUrl = Object.keys(CACHE_TTL).find((k) => url.startsWith(k));
    if (!baseUrl)
        return null;
    const key = getCacheKey(url, data);
    const cached = requestCache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return cached.data;
    }
    return null;
}
function setCache(url, data, dataParam) {
    const baseUrl = Object.keys(CACHE_TTL).find((k) => url.startsWith(k));
    if (!baseUrl)
        return;
    const key = getCacheKey(url, dataParam);
    requestCache.set(key, {
        data,
        expiry: Date.now() + CACHE_TTL[baseUrl],
    });
}
/**
 * 通用请求函数
 * 自动拼接 baseUrl、注入 token、处理错误
 */
function request(options) {
    const { url, method = 'GET', data, needAuth = true, showLoading = false, } = options;
    // ========== 对公开 GET 请求启用缓存 ==========
    if (method === 'GET' && !needAuth) {
        const cached = getFromCache(url, data);
        if (cached) {
            return Promise.resolve(cached);
        }
    }
    let retries = 0;
    const doRequest = () => {
        return new Promise((resolve, reject) => {
            // ========== 检查登录态 ==========
            if (needAuth && !getToken()) {
                requireAuth();
                reject(new Error('未登录'));
                return;
            }
            // ========== 加载提示 ==========
            if (showLoading) {
                wx.showLoading({ title: '加载中...', mask: true });
            }
            // ========== 发起请求 ==========
            const header = {
                'Content-Type': 'application/json',
            };
            if (needAuth && getToken()) {
                header['Authorization'] = `Bearer ${getToken()}`;
            }
            wx.request({
                url: `${BASE_URL}${url}`,
                method,
                data,
                header,
                timeout: 20000,
                success: (res) => {
                    if (showLoading)
                        wx.hideLoading();
                    const body = res.data;
                    // 后端返回了数据（即使 HTTP 200，业务 code 可能非 0）
                    if (body && typeof body.code === 'number') {
                        if (body.code === 0) {
                            // —— 成功 ——
                            // 对公开 GET 请求写入缓存
                            if (method === 'GET' && !needAuth) {
                                setCache(url, body.data, data);
                            }
                            resolve(body.data);
                        }
                        else if (body.code === 40101 || body.code === 40102) {
                            // —— token 过期/无效，跳登录 ——
                            removeToken();
                            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
                            wx.navigateTo({ url: '/pages/login/login' });
                            reject(new Error(body.message));
                        }
                        else if (body.code >= 40400 && body.code < 40500) {
                            // —— 资源不存在类错误（404xx），静默处理 ——
                            // 调用方已在各自 catch 中做降级处理，不必弹 Toast 干扰用户
                            reject(new Error(body.message));
                        }
                        else {
                            // —— 其它业务错误 ——
                            wx.showToast({ title: body.message || '请求失败', icon: 'none' });
                            reject(new Error(body.message));
                        }
                    }
                    else {
                        // 响应格式异常
                        wx.showToast({ title: '服务器响应异常', icon: 'none' });
                        reject(new Error('服务器响应异常'));
                    }
                },
                fail: (err) => {
                    if (showLoading)
                        wx.hideLoading();
                    // 超时等网络错误时自动重试
                    if (retries < MAX_RETRIES) {
                        retries++;
                        console.log(`[API] 请求失败，第 ${retries} 次重试: ${url}`);
                        setTimeout(() => {
                            doRequest().then(resolve).catch(reject);
                        }, 1000);
                    }
                    else {
                        const msg = err.errMsg || '网络异常，请检查网络连接';
                        wx.showToast({ title: msg, icon: 'none' });
                        reject(new Error(msg));
                    }
                },
            });
        });
    };
    return doRequest();
}
// ========== 业务 API 封装 ==========
/**
 * 微信登录 — POST /api/auth/login
 * 发送 code + 微信用户信息 到后端，返回 token + openid + 用户信息
 * @param nickName 可选，微信授权获取的昵称
 * @param avatarUrl 可选，微信授权获取的头像 URL
 */
function loginWithCode(code, nickName, avatarUrl) {
    return request({
        url: '/auth/login',
        method: 'POST',
        data: {
            code,
            ...(nickName ? { nickName } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
        },
        needAuth: false,
    });
}
/**
 * 获取用户信息 — GET /api/user/profile
 */
function getUserProfile() {
    return request({
        url: '/user/profile',
        method: 'GET',
    });
}
/**
 * 更新用户信息 — PUT /api/user/profile
 */
function updateUserProfile(data) {
    return request({
        url: '/user/profile',
        method: 'PUT',
        data,
    });
}
/**
 * 获取用户统计 — GET /api/user/stats
 */
function getUserStats() {
    return request({
        url: '/user/stats',
        method: 'GET',
    });
}
/**
 * 获取作品列表 — GET /api/works
 */
function getWorks(params) {
    // 清理 undefined 值，避免 wx.request 序列化为字符串 "undefined"
    const cleanParams = {};
    if (params) {
        for (const key of Object.keys(params)) {
            const val = params[key];
            if (val !== undefined && val !== null) {
                cleanParams[key] = val;
            }
        }
    }
    return request({
        url: '/works',
        method: 'GET',
        data: cleanParams,
        needAuth: false,
    });
}
/**
 * 获取 Banner 作品 — GET /api/works/banner
 */
function getBannerWorks() {
    return request({
        url: '/works/banner',
        method: 'GET',
        needAuth: false,
    });
}
/**
 * 获取作品详情 — GET /api/works/:id
 */
function getWorkDetail(id) {
    return request({
        url: `/works/${id}`,
        method: 'GET',
        needAuth: false,
    });
}
/**
 * 点赞/取消点赞 — POST /api/works/:id/like
 */
function toggleLike(id) {
    return request({
        url: `/works/${id}/like`,
        method: 'POST',
    });
}
/**
 * 获取我的作品列表 — GET /api/works/my/list
 * 返回分页数据 { list, total, page, pageSize }
 */
function getMyWorks(params) {
    return request({
        url: '/works/my/list',
        method: 'GET',
        data: params,
    });
}
/**
 * 获取我点赞的作品列表 — GET /api/works/liked/list
 * 返回分页数据 { list, total, page, pageSize }
 */
function getLikedWorks(params) {
    return request({
        url: '/works/liked/list',
        method: 'GET',
        data: params,
    });
}
/**
 * 记录浏览量 — POST /api/works/:id/view
 * 用户已登录时会同步记录浏览历史
 */
function recordView(id) {
    return request({
        url: `/works/${id}/view`,
        method: 'POST',
        needAuth: false,
    });
}
/**
 * 获取浏览记录 — GET /api/user/history
 * 返回分页数据 { list, total, page, pageSize }
 */
function getHistory(params) {
    return request({
        url: '/user/history',
        method: 'GET',
        data: params,
    });
}
/**
 * 上传文件 — POST /api/upload
 * 使用 wx.uploadFile（multipart/form-data）
 * @returns { url, filename }
 */
function uploadFile(tempFilePath, type, name) {
    return new Promise((resolve, reject) => {
        const token = getToken();
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
                    const body = JSON.parse(res.data);
                    if (body.code === 0 && body.data) {
                        resolve(body.data);
                    }
                    else {
                        reject(new Error(body.message || '上传失败'));
                    }
                }
                catch {
                    reject(new Error('上传响应异常'));
                }
            },
            fail: (err) => {
                reject(new Error(err.errMsg || '网络异常'));
            },
        });
    });
}
/**
 * 创建作品 — POST /api/works
 */
function createWork(data) {
    return request({
        url: '/works',
        method: 'POST',
        data,
    });
}
/**
 * 更新作品 — PUT /api/works/:id
 */
function updateWork(id, data) {
    return request({
        url: `/works/${id}`,
        method: 'PUT',
        data,
    });
}
/**
 * 删除作品 — DELETE /api/works/:id
 */
function deleteWork(id) {
    return request({
        url: `/works/${id}`,
        method: 'DELETE',
    });
}
// ========== 评论 API ==========
/**
 * 获取作品评论列表 — GET /api/works/:id/comments
 */
function getWorkComments(workId) {
    return request({
        url: `/works/${workId}/comments`,
        method: 'GET',
        needAuth: false,
    });
}
/**
 * 添加评论 — POST /api/works/:id/comments
 */
function addWorkComment(workId, content) {
    return request({
        url: `/works/${workId}/comments`,
        method: 'POST',
        data: { content },
    });
}
