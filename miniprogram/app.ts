"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts
const api_1 = require("./utils/api");
App({
    globalData: {
        userInfo: null,
        openid: '',
        loginCode: '',

        baseUrl: 'https://jx-plform.site/api',
        /** hall 页面的展示模式：hall | my | liked */
        hallMode: 'hall',
    },
    onLaunch() {
        // ── 加载全局自定义字体 ──
        this.loadCustomFont();
        // ── 恢复本地缓存用户信息 ──
        const cached = wx.getStorageSync('userInfo');
        if (cached) {
            this.globalData.userInfo = cached;
        }
        // ── 恢复登录态（仅当有缓存 token 时） ──
        // 不自动调用 wx.login()，避免在用户无操作时创建随机账号
        // 由登录页面的「一键登录」按钮手动触发完整登录流程
        if ((0, api_1.getToken)()) {
            this.doLogin();
        }
        // ── 小程序更新检测 ──
        if (wx.canIUse('getUpdateManager')) {
            const mgr = wx.getUpdateManager();
            mgr.onUpdateReady(() => {
                wx.showModal({
                    title: '更新提示',
                    content: '新版本已就绪，是否立即重启？',
                    success: res => { if (res.confirm)
                        mgr.applyUpdate(); },
                });
            });
            mgr.onUpdateFailed(() => {
                console.warn('[App] Update failed');
            });
        }
    },
    /** 加载全局自定义字体（Torus-Semi-Bold） */
    loadCustomFont() {
        try {
            wx.loadFontFace({
                family: 'Torus-Semi-Bold',
                source: 'url("https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/Torus-Semi-Bold.otf")',
                global: true,
                fail: () => console.warn('[App] Torus-Semi-Bold 加载失败'),
            });
        }
        catch (err) {
            // 低版本基础库不支持 loadFontFace，静默忽略
        }
    },
    /** 恢复登录态：从已有 token 获取用户信息
     *  由 pages/login/login.ts 的 handleQuickLogin 在用户点击「一键登录」后触发完整登录流程
     *  @returns 恢复成功返回 true，失败（无 token）返回 false
     */
    doLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            // 如果已有 token，尝试恢复用户信息
            if ((0, api_1.getToken)()) {
                console.log('[App] 已有 token，尝试恢复用户信息');
                yield this.fetchAndSaveUser();
                return true;
            }
            console.log('[App] 无 token，等待用户手动登录');
            return false;
        });
    },
    /** 从后端获取用户信息并保存到 globalData 和缓存 */
    fetchAndSaveUser() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profile = yield (0, api_1.getUserProfile)();
                const userInfo = {
                    nickName: profile.nickName,
                    avatarUrl: profile.avatarUrl,
                };
                this.saveUserInfo(userInfo);
                console.log('[App] 用户信息已加载:', userInfo.nickName);
            }
            catch (err) {
                // token 失效则清除
                if (err.message && (err.message.includes('401') || err.message.includes('未登录'))) {
                    (0, api_1.removeToken)();
                }
                console.warn('[App] 获取用户信息失败:', err.message || err);
            }
        });
    },
    /** 保存并持久化用户信息 */
    saveUserInfo(info) {
        this.globalData.userInfo = info;
        wx.setStorageSync('userInfo', info);
    },
    /** 清除用户信息（退出登录） */
    clearUserInfo() {
        this.globalData.userInfo = null;
        this.globalData.openid = '';
        (0, api_1.removeToken)();
        wx.removeStorageSync('userInfo');
    },
});
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
 * 发送 code + 微信用户信息 到后端，返回 token + openid + 用户信息
 * @param nickName 可选，微信授权获取的昵称
 * @param avatarUrl 可选，微信授权获取的头像 URL
 */
function loginWithCode(code, nickName, avatarUrl) {
    return request({
        url: '/auth/login',
        method: 'POST',
        data: Object.assign(Object.assign({ code }, (nickName ? { nickName } : {})), (avatarUrl ? { avatarUrl } : {})),
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