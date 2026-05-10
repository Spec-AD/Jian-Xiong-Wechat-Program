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
exports.uploadFile = uploadFile;
exports.createWork = createWork;
exports.updateWork = updateWork;
exports.deleteWork = deleteWork;
exports.getWorkComments = getWorkComments;
exports.addWorkComment = addWorkComment;
const TOKEN_KEY = 'jianxiong_token';
/** 后端 API 基础地址 — 按需修改 */
const BASE_URL = 'http://localhost:3000/api';
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
 * 通用请求函数
 * 自动拼接 baseUrl、注入 token、处理错误
 */
function request(options) {
    const { url, method = 'GET', data, needAuth = true, showLoading = false, } = options;
    return new Promise((resolve, reject) => {
        // ========== 检查登录态 ==========
        if (needAuth && !getToken()) {
            wx.showToast({ title: '请先登录', icon: 'none' });
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
            timeout: 15000,
            success: (res) => {
                if (showLoading)
                    wx.hideLoading();
                const body = res.data;
                // 后端返回了数据（即使 HTTP 200，业务 code 可能非 0）
                if (body && typeof body.code === 'number') {
                    if (body.code === 0) {
                        // —— 成功 ——
                        resolve(body.data);
                    }
                    else if (body.code === 40101 || body.code === 40102) {
                        // —— token 过期/无效，跳登录 ——
                        removeToken();
                        wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
                        wx.navigateTo({ url: '/pages/login/login' });
                        reject(new Error(body.message));
                    }
                    else {
                        // —— 业务错误 ——
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
                const msg = err.errMsg || '网络异常，请检查网络连接';
                wx.showToast({ title: msg, icon: 'none' });
                reject(new Error(msg));
            },
        });
    });
}
// ========== 业务 API 封装 ==========
/**
 * 微信登录 — POST /api/auth/login
 * 发送 code 到后端，返回 token + openid + 用户信息
 */
function loginWithCode(code) {
    return request({
        url: '/auth/login',
        method: 'POST',
        data: { code },
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
    return request({
        url: '/works',
        method: 'GET',
        data: params,
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
 */
function recordView(id) {
    return request({
        url: `/works/${id}/view`,
        method: 'POST',
        needAuth: false,
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
            formData: Object.assign(Object.assign({}, (type ? { type } : {})), (name ? { name } : {})),
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
                catch (_a) {
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
