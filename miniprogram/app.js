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
        baseUrl: 'http://localhost:3000/api',
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
        // ── 微信登录流程 ──
        this.doLogin();
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
    /** 登录：wx.login → 后端换取 token → 获取用户信息
   *  @returns 登录成功返回 true，失败返回 false
   */
    doLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            // 如果已有 token，直接获取用户信息
            if ((0, api_1.getToken)()) {
                console.log('[App] 已有 token，直接获取用户信息');
                yield this.fetchAndSaveUser();
                return true;
            }
            try {
                // 1. wx.login 获取临时 code
                const loginRes = yield wx.login();
                if (!loginRes.code) {
                    console.error('[App] wx.login 失败：未获取到 code');
                    return false;
                }
                this.globalData.loginCode = loginRes.code;
                // 2. 发送 code 到后端换取 token + openid + 用户信息
                const authRes = yield (0, api_1.loginWithCode)(loginRes.code);
                // 3. 保存 token 和 openid
                (0, api_1.setToken)(authRes.token);
                this.globalData.openid = authRes.openid;
                // 4. 直接从登录响应中保存用户信息（避免额外 API 调用）
                if (authRes.user) {
                    this.saveUserInfo({
                        nickName: authRes.user.nickName,
                        avatarUrl: authRes.user.avatarUrl,
                    });
                    console.log('[App] 登录成功，用户:', authRes.user.nickName);
                }
                else {
                    // 降级：通过 getUserProfile 获取
                    yield this.fetchAndSaveUser();
                }
                return true;
            }
            catch (err) {
                console.error('[App] 登录流程失败:', err.message || err);
                return false;
            }
        });
    },
    /** 从后端获取用户信息并保存到 globalData 和缓存 */
    fetchAndSaveUser() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
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
                if (((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('401')) || ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('未登录'))) {
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
