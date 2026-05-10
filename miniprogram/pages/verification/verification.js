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
// pages/verification/verification.ts — NJU 实名认证
const api_1 = require("../../utils/api");
const app = getApp();
Page({
    data: {
        /** 认证状态：none | pending | verified | rejected */
        status: 'none',
        /** 表单数据 */
        form: {
            realName: '',
            studentId: '',
            idCard: '',
            email: '',
        },
        /** 错误信息 */
        error: '',
        submitting: false,
    },
    onLoad() {
        this._loadStatus();
    },
    /** 加载当前认证状态 */
    _loadStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({ url: '/user/verification', method: 'GET' });
                this.setData({
                    status: (data.status || 'none'),
                    'form.realName': data.realName || '',
                    'form.studentId': data.studentId || '',
                });
            }
            catch (_a) {
                // 后端未实现时，使用缓存状态
                const verified = wx.getStorageSync('nju_verified') === true;
                if (verified) {
                    this.setData({
                        status: 'verified',
                        'form.realName': wx.getStorageSync('nju_realname') || '',
                        'form.studentId': wx.getStorageSync('nju_student_id') || '',
                    });
                }
            }
        });
    },
    /** 表单输入 */
    onInput(e) {
        const field = e.currentTarget.dataset.field;
        const value = e.detail.value;
        this.setData({
            [`form.${field}`]: value,
            error: '',
        });
    },
    /** 提交认证 */
    onSubmit() {
        return __awaiter(this, void 0, void 0, function* () {
            const { realName, studentId, idCard, email } = this.data.form;
            if (!realName.trim()) {
                this.setData({ error: '请输入真实姓名' });
                return;
            }
            if (!studentId.trim()) {
                this.setData({ error: '请输入学号' });
                return;
            }
            if (!idCard.trim()) {
                this.setData({ error: '请输入身份证号' });
                return;
            }
            if (idCard.length < 15) {
                this.setData({ error: '请输入有效的身份证号' });
                return;
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.setData({ error: '请输入有效的邮箱地址' });
                return;
            }
            this.setData({ submitting: true, error: '' });
            try {
                yield (0, api_1.request)({
                    url: '/user/verification',
                    method: 'POST',
                    data: {
                        realName: realName.trim(),
                        studentId: studentId.trim(),
                        idCard: idCard.trim(),
                        email: email.trim(),
                    },
                });
                this.setData({ status: 'pending' });
                wx.showModal({
                    title: '提交成功',
                    content: '认证信息已提交，管理员审核通过后，你的昵称将显示为紫色认证标识。',
                    showCancel: false,
                    confirmText: '知道了',
                });
            }
            catch (err) {
                this.setData({ error: err.message || '提交失败，请重试' });
            }
            finally {
                this.setData({ submitting: false });
            }
        });
    },
    /** 认证说明 */
    getStatusText() {
        const map = {
            none: '未认证',
            pending: '审核中',
            verified: '已认证',
            rejected: '未通过',
        };
        return map[this.data.status] || '未认证';
    },
});
