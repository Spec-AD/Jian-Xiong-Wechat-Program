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
// pages/login/login.ts — 登录页（重构版：南大紫主题）
const api_1 = require("../../utils/api");
const app = getApp();
Page({
    data: {
        loading: false,
        errorMsg: '',
    },
    onShow() {
        // 如果已经有用户信息，直接跳转（使用 reLaunch 避免闪白）
        if (app.globalData.userInfo && (0, api_1.getToken)()) {
            wx.reLaunch({ url: '/pages/profile/profile' });
            return;
        }
    },
    /**
     * 一键登录（简化流程）
     * 不再使用废弃的 open-type="getUserInfo" 弹窗获取微信信息。
     * 头像/昵称可在登录后进入「编辑资料」页自定义。
     *
     * 流程：
     * 1. wx.login() 获取临时 code
     * 2. 发送 code 到后端 /api/auth/login 换取 token
     * 3. 保存 token 和用户信息到 globalData 和缓存
     * 4. 跳转到「我的」页面
     */
    handleQuickLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            // 防止重复点击
            if (this.data.loading)
                return;
            this.setData({ loading: true, errorMsg: '' });
            try {
                // ===== 1. wx.login 获取临时 code =====
                const loginRes = yield wx.login();
                if (!loginRes.code) {
                    throw new Error('获取登录凭证失败，请重试');
                }
                // ===== 2. 发送 code 到后端（不再传微信昵称/头像，由后端生成默认值） =====
                const authRes = yield (0, api_1.loginWithCode)(loginRes.code);
                // ===== 3. 保存 token =====
                (0, api_1.setToken)(authRes.token);
                // ===== 4. 保存 openid（用于生成 UID） =====
                if (authRes.openid) {
                    app.globalData.openid = authRes.openid;
                }
                // ===== 5. 保存用户信息（使用后端返回的用户信息） =====
                const displayName = authRes.user && authRes.user.nickName
                    ? authRes.user.nickName.trim()
                    : '书院同学';
                const displayAvatar = (authRes.user && authRes.user.avatarUrl) || '';
                app.saveUserInfo({
                    nickName: displayName,
                    avatarUrl: displayAvatar,
                });
                // ===== 6. 跳转到「我的」 =====
                wx.reLaunch({ url: '/pages/profile/profile' });
            }
            catch (err) {
                const msg = err.message || '登录失败，请检查网络后重试';
                this.setData({ errorMsg: msg });
                console.error('[Login] 登录失败:', msg);
            }
            finally {
                this.setData({ loading: false });
            }
        });
    },
    /** 清除错误信息 */
    onClearError() {
        this.setData({ errorMsg: '' });
    },
    /** 查看用户协议 */
    onViewAgreement() {
        wx.showModal({
            title: '用户协议',
            content: '欢迎使用健雄书院成果展示平台。\n\n本平台为南京大学健雄书院官方学生成果展示平台。\n\n用户需遵守相关法律法规，不得发布违法违规内容。',
            showCancel: false,
            confirmText: '了解',
        });
    },
    /** 查看隐私政策 */
    onViewPrivacy() {
        wx.showModal({
            title: '隐私政策',
            content: '我们重视您的隐私。\n\n我们仅收集必要的用户信息用于平台功能。\n您的个人信息将受到严格保护，不会泄露给第三方。',
            showCancel: false,
            confirmText: '了解',
        });
    },
});
