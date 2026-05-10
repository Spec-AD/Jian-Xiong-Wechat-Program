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
// pages/hall/hall.ts — 作品大厅（真实 API 版）
const util_1 = require("../../utils/util");
const api_1 = require("../../utils/api");
const app = getApp();
const PAGE_SIZE = 20;
Page({
    data: {
        categories: util_1.WORK_CATEGORIES,
        activeCategory: 'all',
        keyword: '',
        works: [], // 作品列表
        bannerList: [], // Banner 推荐
        total: 0, // 总作品数
        loading: false, // 加载中
        refreshing: false, // 下拉刷新中
        hasMore: true, // 是否还有更多
        page: 1, // 当前页码
        mode: 'hall', // 当前模式
    },
    onLoad(options) {
        // 支持从 profile 页跳转：通过 globalData.hallMode 传入 'my' 或 'liked'
        const mode = options.mode || app.globalData.hallMode || 'hall';
        app.globalData.hallMode = 'hall'; // 消费后重置
        this.setData({ mode });
        this._loadData(true);
    },
    /** 下拉刷新 */
    onPullDownRefresh() {
        this._loadData(true);
    },
    /** 触底加载更多 */
    onReachBottom() {
        if (!this.data.hasMore || this.data.loading)
            return;
        this._loadData(false);
    },
    onShareAppMessage() {
        return {
            title: '健雄书院 · 学生成果展示平台',
            path: '/pages/hall/hall',
        };
    },
    /** 核心加载函数 */
    _loadData(reset) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (this.data.loading)
                return;
            this.setData(Object.assign({ loading: true }, (reset ? { refreshing: true } : {})));
            try {
                if (reset) {
                    this.setData({ page: 1, hasMore: true });
                }
                const { mode, activeCategory, keyword, page } = this.data;
                // 仅在 hall 模式下加载 Banner
                if (reset && mode === 'hall') {
                    const bannerData = yield (0, api_1.getBannerWorks)();
                    this.setData({
                        bannerList: (bannerData || []).map((item) => (Object.assign(Object.assign({}, item), { typeName: (0, util_1.getFileTypeLabel)(item.type), typeIcon: (0, util_1.getFileTypeIcon)(item.type) }))),
                    });
                }
                // 根据模式调用不同 API
                let result;
                if (mode === 'my') {
                    result = yield (0, api_1.getMyWorks)();
                }
                else if (mode === 'liked') {
                    result = yield (0, api_1.getLikedWorks)();
                }
                else {
                    result = yield (0, api_1.getWorks)({
                        page: reset ? 1 : page,
                        pageSize: PAGE_SIZE,
                        categoryId: activeCategory === 'all' ? undefined : activeCategory,
                        keyword: keyword || undefined,
                    });
                }
                // 兼容返回格式：可能是数组 {list: [...]} 或 {list: [...], pagination: {...}}
                const list = result.list || result || [];
                const total = result.total || ((_a = result.pagination) === null || _a === void 0 ? void 0 : _a.total) || list.length;
                // 丰富前端展示字段
                const enriched = list.map((item) => (Object.assign(Object.assign({}, item), { typeName: (0, util_1.getFileTypeLabel)(item.type), typeIcon: (0, util_1.getFileTypeIcon)(item.type), date: item.date ? (0, util_1.formatDate)(item.date) : (item.createdAt ? (0, util_1.formatDate)(item.createdAt) : '') })));
                // 分页信息
                const currentPage = ((_b = result.pagination) === null || _b === void 0 ? void 0 : _b.page) || result.page || 1;
                const totalPages = ((_c = result.pagination) === null || _c === void 0 ? void 0 : _c.totalPages) ||
                    Math.ceil((((_d = result.pagination) === null || _d === void 0 ? void 0 : _d.total) || result.total || 0) / PAGE_SIZE) ||
                    1;
                this.setData({
                    works: reset ? enriched : [...this.data.works, ...enriched],
                    total,
                    hasMore: currentPage < totalPages,
                    page: reset ? 2 : page + 1,
                });
            }
            catch (err) {
                console.error('[Hall] 加载失败:', err.message || err);
                (0, util_1.toast)('加载失败，请下拉刷新重试');
            }
            finally {
                this.setData({ loading: false, refreshing: false });
                wx.stopPullDownRefresh();
            }
        });
    },
    /** 分类切换 */
    onTabTap(e) {
        const id = e.currentTarget.dataset.id;
        if (id === this.data.activeCategory)
            return;
        this.setData({ activeCategory: id });
        this._loadData(true);
    },
    /** 搜索输入 */
    onSearch(e) {
        this.setData({ keyword: e.detail.value });
        this._loadData(true);
    },
    /** 清除搜索 */
    onSearchClear() {
        this.setData({ keyword: '' });
        this._loadData(true);
    },
    /** Banner 点击 */
    onBannerTap(e) {
        this._goViewer(e.currentTarget.dataset.item.id);
    },
    /** 作品点击 */
    onWorkTap(e) {
        this._goViewer(e.currentTarget.dataset.item.id);
    },
    /** 跳转详情页（仅传 id，viewer 页自己调 API 加载） */
    _goViewer(id) {
        wx.navigateTo({ url: `/pages/viewer/viewer?id=${id}` });
    },
});
