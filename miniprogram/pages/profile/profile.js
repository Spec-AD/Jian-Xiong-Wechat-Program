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
// pages/profile/profile.ts — 个人主页（大重构版：数据中心、编辑资料、隐私设置、认证、浏览记录）
const api_1 = require("../../utils/api");
const util_1 = require("../../utils/util");
const app = getApp();
/** UID 生成规则：基于 openid 取后6位 */
function generateUid(openid) {
    if (!openid)
        return '------';
    let hash = 0;
    for (let i = 0; i < openid.length; i++) {
        hash = ((hash << 5) - hash) + openid.charCodeAt(i);
        hash = hash & hash;
    }
    const uid = Math.abs(hash % 1000000).toString().padStart(6, '0');
    return 'JX' + uid;
}
Page({
    data: {
        userInfo: null,
        uid: '',
        isVerified: false,
        signature: '',
        stats: {
            publishCount: 0,
            likeCount: 0,
            viewCount: 0,
        },
        firstTime: false,
        canPublish: false,
        historyCount: 0,
        /** 是否管理员 */
        isAdmin: false,
    },
    onShow() {
        const userInfo = app.globalData.userInfo;
        if (!userInfo) {
            wx.navigateTo({ url: '/pages/login/login' });
            return;
        }
        this.setData({
            userInfo,
            uid: generateUid(app.globalData.openid),
            isVerified: wx.getStorageSync('nju_verified') === true,
        });
        this._loadProfile();
        this._loadStats();
        this._loadHistoryCount();
        this._checkFirstTime();
        this._checkAdmin();
    },
    /** 检查是否为管理员 */
    _checkAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profile = yield (0, api_1.request)({
                    url: '/user/profile',
                    method: 'GET',
                });
                this.setData({ isAdmin: profile.role === 'admin' });
            }
            catch (_a) {
                // 静默降级
            }
        });
    },
    _checkFirstTime() {
        const shown = wx.getStorageSync('profile_first_time_shown');
        if (!shown) {
            this.setData({ firstTime: true });
        }
    },
    onCloseGuide() {
        this.setData({ firstTime: false });
        wx.setStorageSync('profile_first_time_shown', true);
    },
    _loadProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profileData = yield (0, api_1.request)({ url: '/user/profile', method: 'GET' });
                this.setData({
                    signature: profileData.signature || '',
                    canPublish: profileData.canPublish !== null && profileData.canPublish !== void 0 ? profileData.canPublish : false,
                });
            }
            catch (_a) {
                // 静默降级
            }
        });
    },
    _loadStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield (0, api_1.getUserStats)();
                this.setData({ stats });
            }
            catch (err) {
                console.warn('[Profile] 获取统计数据失败:', err.message || err);
            }
        });
    },
    _loadHistoryCount() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({
                    url: '/user/history',
                    method: 'GET',
                });
                this.setData({ historyCount: data.count || 0 });
            }
            catch (_a) {
                this.setData({ historyCount: 0 });
            }
        });
    },
    // ── onSyncWechatInfo 已移除 ──
    // wx.getUserProfile() 在 2.32.3+ 基础库中已废弃
    // 微信信息在登录时已自动获取并保存，此处不再需要手动同步,
    onMenuTap(e) {
        const key = e.currentTarget.dataset.key;
        switch (key) {
            case 'dataCenter':
                wx.navigateTo({ url: '/pages/data-center/data-center' });
                break;
            case 'myPublish':
                app.globalData.hallMode = 'my';
                wx.switchTab({ url: '/pages/hall/hall' });
                break;
            case 'myLike':
                app.globalData.hallMode = 'liked';
                wx.switchTab({ url: '/pages/hall/hall' });
                break;
            case 'history':
                wx.switchTab({ url: '/pages/hall/hall' });
                (0, util_1.toast)('浏览记录功能即将上线');
                break;
            case 'downloads':
                (0, util_1.toast)('下载记录功能即将上线');
                break;
            case 'publish':
                if (!this.data.canPublish) {
                    wx.showModal({
                        title: '暂不可发布',
                        content: '新注册同学暂不能发布作品。请先完善个人资料并参与书院活动，获得发布权限。',
                        confirmText: '了解',
                        showCancel: false,
                    });
                    return;
                }
                wx.navigateTo({ url: '/pages/publish/publish' });
                break;
            case 'settings':
                wx.navigateTo({ url: '/pages/settings/settings' });
                break;
            case 'editProfile':
                wx.navigateTo({ url: '/pages/edit-profile/edit-profile' });
                break;
            case 'verification':
                wx.navigateTo({ url: '/pages/verification/verification' });
                break;
            case 'privacy':
                wx.navigateTo({ url: '/pages/privacy-settings/privacy-settings' });
                break;
            case 'github':
                wx.setClipboardData({
                    data: 'https://github.com/Spec-AD/Jian-Xiong-Wechat-Program',
                    success: () => (0, util_1.toast)('GitHub 链接已复制', 'success'),
                });
                break;
            case 'afdian':
                wx.setClipboardData({
                    data: 'https://afdian.com/a/purebeat',
                    success: () => (0, util_1.toast)('爱发电链接已复制', 'success'),
                });
                break;
            case 'about':
                wx.showModal({
                    title: '关于健雄书院',
                    content: '健雄书院是南京大学于2021年成立的住宿制学院，以「砺学修身·致知力行」为院训。\n\n本平台展示书院学生在学业、科研、文艺、体育、志愿服务等方面的优秀成果。',
                    showCancel: false,
                    confirmText: '了解',
                });
                break;
            case 'admin':
                wx.navigateTo({ url: '/pages/admin/admin' });
                break;
        }
    },
    onLogout() {
        wx.showModal({
            title: '确认退出',
            content: '退出后需要重新登录',
            confirmColor: '#e57373',
            success: (res) => {
                if (res.confirm) {
                    app.clearUserInfo();
                    wx.reLaunch({ url: '/pages/login/login' });
                }
            },
        });
    },
});
