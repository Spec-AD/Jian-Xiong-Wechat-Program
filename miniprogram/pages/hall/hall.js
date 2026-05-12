"use strict";
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
        this._applyHallMode(options);
    },
    /** 每次页面显示时检查是否有模式切换（switchTab 不会触发 onLoad） */
    onShow() {
        if (app.globalData.hallMode && app.globalData.hallMode !== this.data.mode) {
            this._applyHallMode({});
        }
    },
    /** 应用大厅模式并刷新数据 */
    _applyHallMode(options) {
        const mode = options.mode || app.globalData.hallMode || 'hall';
        if (mode === this.data.mode && this.data.works.length > 0) {
            app.globalData.hallMode = 'hall'; // 无需切换，重置标记
            return;
        }
        app.globalData.hallMode = 'hall'; // 消费后重置
        this.setData({
            mode,
            works: [],
            page: 1,
            hasMore: true,
        });
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
    /** 返回真正的大厅（全部作品） */
    onBackToHall() {
        this.setData({
            mode: 'hall',
            activeCategory: 'all',
            keyword: '',
            page: 1,
            works: [],
            hasMore: true,
        });
        this._loadData(true);
    },
    /** 核心加载函数 */
    async _loadData(reset) {
        if (this.data.loading)
            return;
        this.setData({ loading: true, ...(reset ? { refreshing: true } : {}) });
        try {
            if (reset) {
                this.setData({ page: 1, hasMore: true });
            }
            const { mode, activeCategory, keyword, page } = this.data;
            // 仅在 hall 模式下加载沉浸式海报轮播（节选自作品的 cover，最多 5 张，仅当有 cover 值时才入选）
            const bannerPromise = reset && mode === 'hall'
                ? (0, api_1.getBannerWorks)().then(bannerData => {
                    const rawList = bannerData || [];
                    const posterList = rawList
                        .filter((item) => !!item.cover)        // 仅选有 cover 的作品
                        .slice(0, 5)                           // 最多 5 张
                        .map((item) => ({
                            ...item,
                            coverUrl: item.cover,              // cover → coverUrl 供轮播使用
                            typeName: (0, util_1.getFileTypeLabel)(item.type),
                            typeIcon: (0, util_1.getFileTypeIcon)(item.type),
                        }));
                    this.setData({ bannerList: posterList });
                }).catch(() => {
                    // 海报轮播加载失败不阻塞主列表
                    console.warn('[Hall] 海报轮播加载失败，跳过');
                })
                : Promise.resolve();
            // 根据模式调用不同 API
            let result;
            if (mode === 'my') {
                result = await (0, api_1.getMyWorks)({ page: reset ? 1 : page, pageSize: PAGE_SIZE });
            }
            else if (mode === 'liked') {
                result = await (0, api_1.getLikedWorks)({ page: reset ? 1 : page, pageSize: PAGE_SIZE });
            }
            else if (mode === 'history') {
                result = await (0, api_1.getHistory)({ page: reset ? 1 : page, pageSize: PAGE_SIZE });
            }
            else {
                // 只传有值的参数，避免 undefined 被序列化为字符串 "undefined"
                const params = {
                    page: reset ? 1 : page,
                    pageSize: PAGE_SIZE,
                };
                if (activeCategory !== 'all' && activeCategory) {
                    params.categoryId = activeCategory;
                }
                if (keyword) {
                    params.keyword = keyword;
                }
                result = await (0, api_1.getWorks)(params);
            }
            // 兼容返回格式：可能是数组 {list: [...]} 或 {list: [...], pagination: {...}}
            const list = result.list || result || [];
            const total = result.total || (result.pagination && result.pagination.total) || list.length;
            // 丰富前端展示字段
            const enriched = list.map((item) => ({
                ...item,
                typeName: (0, util_1.getFileTypeLabel)(item.type),
                typeIcon: (0, util_1.getFileTypeIcon)(item.type),
                date: item.date ? (0, util_1.formatDate)(item.date) : (item.createdAt ? (0, util_1.formatDate)(item.createdAt) : ''),
                actualAuthor: item.actualAuthor || '',
            }));
            // 分页信息
            const currentPage = (result.pagination && result.pagination.page) || result.page || 1;
            const pageTotal = result.pagination && result.pagination.total;
            const totalPages = (result.pagination && result.pagination.totalPages) ||
                Math.ceil((pageTotal || result.total || 0) / PAGE_SIZE) ||
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
    /** 右下角悬浮搜索按钮 — 跳转到搜索页面 */
    goToSearch() {
        wx.navigateTo({ url: '/pages/index/index?focus=search' });
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
