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
// pages/login/login.ts — 登录页（生产级）
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
     * 一键登录（生产流程）
     * 使用 open-type="getUserInfo" 按钮触发微信授权弹窗
     * 1. 从按钮事件 e.detail.userInfo 获取微信头像和昵称（用户确认弹窗）
     * 2. wx.login() 获取临时 code
     * 3. 发送 code + 微信信息 到后端 /api/auth/login 换取 token + openid
     * 4. 保存 token 和用户信息到 globalData 和缓存
     * 5. 跳转到「我的」页面
     */
    handleQuickLogin(e) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // 防止重复点击
            if (this.data.loading)
                return;
            this.setData({ loading: true, errorMsg: '' });
            try {
                // ===== 1. 从按钮事件获取微信头像和昵称（open-type="getUserInfo" 弹出授权） =====
                let wechatNickName = '';
                let wechatAvatarUrl = '';
                if (e.detail && e.detail.userInfo) {
                    // 用户同意授权
                    wechatNickName = e.detail.userInfo.nickName;
                    wechatAvatarUrl = e.detail.userInfo.avatarUrl;
                    console.log('[Login] 微信授权成功:', wechatNickName);
                }
                else {
                    // 用户拒绝授权——使用后端生成的默认昵称，仍可登录
                    console.warn('[Login] 用户拒绝授权微信信息');
                }
                // ===== 2. wx.login 获取临时 code =====
                const loginRes = yield wx.login();
                if (!loginRes.code) {
                    throw new Error('获取登录凭证失败，请重试');
                }
                // ===== 3. 发送 code + 微信信息 到后端 =====
                const authRes = yield (0, api_1.loginWithCode)(loginRes.code, wechatNickName, wechatAvatarUrl);
                // ===== 4. 保存 token =====
                (0, api_1.setToken)(authRes.token);
                app.globalData.openid = authRes.openid;
                // ===== 5. 保存用户信息（优先用微信授权获取的） =====
                const displayName = wechatNickName || ((_a = authRes.user) === null || _a === void 0 ? void 0 : _a.nickName) || '书院同学';
                const displayAvatar = wechatAvatarUrl || ((_b = authRes.user) === null || _b === void 0 ? void 0 : _b.avatarUrl) || '';
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
});
