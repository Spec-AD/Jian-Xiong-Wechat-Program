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
// pages/edit-profile/edit-profile.ts — 编辑个人资料
const api_1 = require("../../utils/api");
const util_1 = require("../../utils/util");
const app = getApp();
const INTEREST_OPTIONS = [
    '科研', '文艺', '体育', '志愿', '摄影', '音乐',
    '编程', '阅读', '旅行', '绘画', '舞蹈', '辩论',
];
Page({
    data: {
        profile: {},
        interestOptions: INTEREST_OPTIONS,
        regionIndex: 0,
        region: ['江苏省', '南京市'],
        birthdayDate: '2000-01-01',
        uploading: false,
        saving: false,
    },
    onLoad() {
        this._loadProfile();
    },
    /** 加载当前用户信息 */
    _loadProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profileData = yield (0, api_1.request)({
                    url: '/user/profile',
                    method: 'GET',
                });
                this.setData({
                    profile: {
                        avatarUrl: profileData.avatarUrl || '',
                        nickName: profileData.nickName || '',
                        signature: profileData.signature || '',
                        birthday: profileData.birthday || '',
                        region: profileData.region || ['江苏省', '南京市'],
                        interests: profileData.interests || [],
                    },
                    birthdayDate: profileData.birthday || '2000-01-01',
                });
            }
            catch (err) {
                console.error('[EditProfile] 加载失败:', err);
            }
        });
    },
    /** 更换头像 — 调用微信选头像 */
    onChooseAvatar(e) {
        const avatarUrl = e.detail.avatarUrl;
        if (!avatarUrl)
            return;
        this.setData({ 'profile.avatarUrl': avatarUrl });
        // 自动上传
        this._uploadAvatar(avatarUrl);
    },
    /** 上传头像到后端 */
    _uploadAvatar(tempPath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ uploading: true });
            try {
                const result = yield (0, api_1.uploadFile)(tempPath, 'image', 'avatar');
                this.setData({ 'profile.avatarUrl': result.url });
                // 同时更新后端用户信息
                yield (0, api_1.updateUserProfile)({ avatarUrl: result.url });
                // 更新全局
                app.saveUserInfo(Object.assign(Object.assign({}, app.globalData.userInfo), { avatarUrl: result.url }));
                (0, util_1.toast)('头像已更新', 'success');
            }
            catch (err) {
                (0, util_1.toast)('头像上传失败');
            }
            finally {
                this.setData({ uploading: false });
            }
        });
    },
    /** 昵称输入 */
    onNicknameInput(e) {
        this.setData({ 'profile.nickName': e.detail.value });
    },
    /** 签名输入 */
    onSignatureInput(e) {
        this.setData({ 'profile.signature': e.detail.value });
    },
    /** 生日选择 */
    onBirthdayChange(e) {
        this.setData({
            birthdayDate: e.detail.value,
            'profile.birthday': e.detail.value,
        });
    },
    /** 地域选择 */
    onRegionChange(e) {
        const values = e.detail.value;
        this.setData({
            region: values,
            'profile.region': values,
        });
    },
    /** 兴趣切换 */
    onInterestTap(e) {
        const interest = e.currentTarget.dataset.interest;
        const current = [...(this.data.profile.interests || [])];
        const idx = current.indexOf(interest);
        if (idx >= 0) {
            current.splice(idx, 1);
        }
        else {
            if (current.length >= 6) {
                (0, util_1.toast)('最多选择6个兴趣标签');
                return;
            }
            current.push(interest);
        }
        this.setData({ 'profile.interests': current });
    },
    /** 保存所有资料 */
    onSave() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { profile } = this.data;
            if (!((_a = profile.nickName) === null || _a === void 0 ? void 0 : _a.trim())) {
                (0, util_1.toast)('请输入昵称');
                return;
            }
            this.setData({ saving: true });
            wx.showLoading({ title: '保存中…', mask: true });
            try {
                yield (0, api_1.updateUserProfile)({
                    nickName: profile.nickName.trim(),
                    avatarUrl: profile.avatarUrl,
                    signature: profile.signature,
                    birthday: profile.birthday,
                    region: profile.region,
                    interests: profile.interests,
                });
                // 更新全局
                app.saveUserInfo({
                    nickName: profile.nickName.trim(),
                    avatarUrl: profile.avatarUrl,
                });
                wx.hideLoading();
                (0, util_1.toast)('资料已保存', 'success');
                setTimeout(() => wx.navigateBack(), 1000);
            }
            catch (err) {
                wx.hideLoading();
                (0, util_1.toast)(err.message || '保存失败');
            }
            finally {
                this.setData({ saving: false });
            }
        });
    },
});
