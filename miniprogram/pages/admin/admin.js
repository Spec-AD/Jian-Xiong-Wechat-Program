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
// pages/admin/admin.ts — 管理员后台
const util_1 = require("../../utils/util");
const api_1 = require("../../utils/api");
const app = getApp();
const PAGE_SIZE = 20;
Page({
    data: {
        // 鉴权
        isAdmin: false,
        loading: true,
        // 仪表盘
        stats: {
            totalWorks: 0,
            totalUsers: 0,
            todayViews: 0,
            totalLikes: 0,
        },
        // 作品管理
        works: [],
        page: 1,
        hasMore: true,
        refreshing: false,
        // 筛选
        filterType: 'all',
        keyword: '',
        // 活跃 tab
        activeTab: 'works',
    },
    onLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            // 检查管理员权限
            const userInfo = app.globalData.userInfo;
            if (!userInfo) {
                (0, util_1.toast)('请先登录');
                wx.navigateBack();
                return;
            }
            yield this._checkAdmin();
        });
    },
    _checkAdmin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const profile = yield (0, api_1.request)({
                    url: '/user/profile',
                    method: 'GET',
                });
                if (profile.role !== 'admin') {
                    wx.showModal({
                        title: '权限不足',
                        content: '只有管理员才能访问此页面',
                        showCancel: false,
                        confirmText: '返回',
                        success: () => wx.navigateBack(),
                    });
                    return;
                }
                this.setData({ isAdmin: true, loading: false });
                this._loadDashboard();
                this._loadWorks(true);
            }
            catch (err) {
                (0, util_1.toast)('权限验证失败');
                wx.navigateBack();
            }
        });
    },
    _loadDashboard() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({
                    url: '/admin/stats',
                    method: 'GET',
                });
                this.setData({ stats: data });
            }
            catch (_a) {
                // 静默降级
            }
        });
    },
    _loadWorks(reset) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.data.isAdmin || this.data.refreshing)
                return;
            this.setData({ refreshing: true });
            try {
                if (reset) {
                    this.setData({ page: 1, hasMore: true });
                }
                const { filterType, keyword, page } = this.data;
                // 只传有值的参数，避免 undefined 被序列化为字符串 "undefined"
                const params = {
                    page: reset ? 1 : page,
                    pageSize: PAGE_SIZE,
                };
                if (filterType !== 'all' && filterType) {
                    params.categoryId = filterType;
                }
                if (keyword) {
                    params.keyword = keyword;
                }
                const result = yield (0, api_1.getWorks)(params);
                const list = result.list || [];
                const currentPage = (result.pagination && result.pagination.page) || 1;
                const totalPages = (result.pagination && result.pagination.totalPages) || 1;
                this.setData({
                    works: reset ? list : [...this.data.works, ...list],
                    hasMore: currentPage < totalPages,
                    page: reset ? 2 : page + 1,
                });
            }
            catch (err) {
                (0, util_1.toast)('加载失败');
            }
            finally {
                this.setData({ refreshing: false });
            }
        });
    },
    /** 切换tab */
    onTabChange(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab });
        if (tab === 'works') {
            this._loadWorks(true);
        }
    },
    /** 筛选类型 */
    onFilterType(e) {
        const type = e.currentTarget.dataset.type;
        if (type === this.data.filterType)
            return;
        this.setData({ filterType: type });
        this._loadWorks(true);
    },
    /** 搜索 */
    onSearch(e) {
        this.setData({ keyword: e.detail.value });
        this._loadWorks(true);
    },
    /** 编辑作品 */
    onEditWork(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/edit-work/edit-work?id=${id}` });
    },
    /** 查看作品 */
    onViewWork(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/pages/viewer/viewer?id=${id}` });
    },
    /** 刷新 */
    onRefresh() {
        this._loadDashboard();
        this._loadWorks(true);
        (0, util_1.toast)('已刷新', 'success');
    },
});
