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
