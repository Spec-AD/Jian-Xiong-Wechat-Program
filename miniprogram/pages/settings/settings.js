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
// pages/settings/settings.ts — 设置中心
const util_1 = require("../../utils/util");
const api_1 = require("../../utils/api");
const app = getApp();
Page({
    data: {
        /** 当前版本号 */
        version: 'v1.0.0',
        /** 用户是否已认证 */
        isVerified: false,
        /** 用户头像 URL（不含可选链，兼容 WXML） */
        userAvatar: '',
        /** 用户昵称（不含可选链，兼容 WXML） */
        userName: '未登录',
        /** 是否管理员 */
        isAdmin: false,
    },
    onShow() {
        this._syncUserInfo();
        this._checkAdmin();
    },
    /** 同步用户信息到 data（避免 WXML 中使用可选链） */
    _syncUserInfo() {
        const userInfo = app.globalData.userInfo;
        if (userInfo) {
            const update = {};
            if (userInfo.avatarUrl)
                update.userAvatar = userInfo.avatarUrl;
            if (userInfo.nickName)
                update.userName = userInfo.nickName;
            this.setData(update);
        }
        const verified = wx.getStorageSync('nju_verified') === true;
        this.setData({ isVerified: verified });
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
    /** 菜单点击分发 */
    onMenuTap(e) {
        const key = e.currentTarget.dataset.key;
        switch (key) {
            case 'editProfile':
                wx.navigateTo({ url: '/pages/edit-profile/edit-profile' });
                break;
            case 'privacy':
                wx.navigateTo({ url: '/pages/privacy-settings/privacy-settings' });
                break;
            case 'verification':
                wx.navigateTo({ url: '/pages/verification/verification' });
                break;
            case 'about':
                wx.showModal({
                    title: '关于健雄书院',
                    content: '健雄书院是南京大学于2021年成立的住宿制学院，以「砺学修身·致知力行」为院训。\n\n本平台 v1.0.0 展示书院学生在学业、科研、文艺、体育、志愿服务等方面的优秀成果。',
                    showCancel: false,
                    confirmText: '了解',
                });
                break;
            case 'github':
                wx.setClipboardData({
                    data: 'https://github.com/jianxiong-academy',
                    success: () => (0, util_1.toast)('GitHub 链接已复制', 'success'),
                });
                break;
            case 'afdian':
                wx.setClipboardData({
                    data: 'https://afdian.com/@jianxiong',
                    success: () => (0, util_1.toast)('爱发电链接已复制', 'success'),
                });
                break;
            case 'admin':
                wx.navigateTo({ url: '/pages/admin/admin' });
                break;
        }
    },
    /** 清除缓存 */
    onClearCache() {
        wx.showModal({
            title: '清除缓存',
            content: '确定要清除本地缓存数据吗？（不会影响账号数据）',
            success: (res) => {
                if (res.confirm) {
                    wx.clearStorageSync();
                    (0, util_1.toast)('缓存已清除', 'success');
                }
            },
        });
    },
    /** 退出登录 */
    onLogout() {
        wx.showModal({
            title: '退出登录',
            content: '退出后需要重新登录，确定继续吗？',
            confirmColor: '#e57373',
            success: (res) => {
                if (res.confirm) {
                    app.clearUserInfo();
                    wx.reLaunch({ url: '/pages/index/index' });
                }
            },
        });
    },
});
