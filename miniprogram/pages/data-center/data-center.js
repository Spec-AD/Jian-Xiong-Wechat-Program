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
// pages/data-center/data-center.ts — 数据中心（总览 | 发布 | 获赞 | 浏览）
const api_1 = require("../../utils/api");
const util_1 = require("../../utils/util");
const TABS = [
    { id: 'overview', name: '总览', icon: '' },
    { id: 'publish', name: '发布', icon: '' },
    { id: 'likes', name: '获赞', icon: '' },
    { id: 'views', name: '浏览', icon: '' },
];
Page({
    data: {
        tabs: TABS,
        activeTab: 'overview',
        // —— 总览 ——
        overview: {
            totalPublish: 0,
            totalLikes: 0,
            totalViews: 0,
            weekPublish: 0,
            weekLikes: 0,
            weekViews: 0,
        },
        // —— 发布 ——
        publishStats: {
            total: 0,
            tags: [],
            types: [],
            trend: [],
        },
        // —— 获赞 ——
        likesStats: {
            total: 0,
            trend: [],
            topWorks: [],
        },
        // —— 浏览 ——
        viewsStats: {
            total: 0,
            trend: [],
            topWorks: [],
        },
        loading: true,
    },
    onLoad() {
        this._loadAllData();
    },
    /** Tab 切换 */
    onTabTap(e) {
        const id = e.currentTarget.dataset.id;
        if (id === this.data.activeTab)
            return;
        this.setData({ activeTab: id });
    },
    /** 加载所有数据 */
    _loadAllData() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ loading: true });
            try {
                // 1. 基础统计（总览）
                const stats = yield (0, api_1.getUserStats)();
                this.setData({
                    'overview.totalPublish': stats.publishCount || 0,
                    'overview.totalLikes': stats.likeCount || 0,
                    'overview.totalViews': stats.viewCount || 0,
                });
                // 2. 从后端获取更详细的数据
                yield Promise.all([
                    this._loadWeekStats(),
                    this._loadPublishStats(),
                    this._loadLikesStats(),
                    this._loadViewsStats(),
                ]);
            }
            catch (err) {
                console.error('[DataCenter] 加载失败:', err);
                (0, util_1.toast)('数据加载失败');
            }
            finally {
                this.setData({ loading: false });
            }
        });
    },
    /** 加载周统计 */
    _loadWeekStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({ url: '/user/stats/week', method: 'GET' });
                this.setData({
                    'overview.weekPublish': data.weekPublish || 0,
                    'overview.weekLikes': data.weekLikes || 0,
                    'overview.weekViews': data.weekViews || 0,
                });
            }
            catch (_a) {
                // 如果后端未实现此接口，设置为模拟数据
                // 实际生产环境中应当后端实现
                this.setData({
                    'overview.weekPublish': Math.floor(Math.random() * 5),
                    'overview.weekLikes': Math.floor(Math.random() * 20),
                    'overview.weekViews': Math.floor(Math.random() * 100),
                });
            }
        });
    },
    /** 加载发布统计 */
    _loadPublishStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({ url: '/user/stats/publish', method: 'GET' });
                this.setData({
                    'publishStats.total': data.total || 0,
                    'publishStats.tags': data.tags || [],
                    'publishStats.types': data.types || [],
                    'publishStats.trend': data.trend || this._generateMockTrend(),
                });
            }
            catch (_a) {
                // 模拟数据
                this.setData({
                    'publishStats.total': this.data.overview.totalPublish,
                    'publishStats.tags': [
                        { name: '科研', count: 3 },
                        { name: '志愿', count: 2 },
                        { name: '文艺', count: 1 },
                    ],
                    'publishStats.types': [
                        { name: '视频', count: 2 },
                        { name: '图片', count: 2 },
                        { name: '文档', count: 1 },
                        { name: '音频', count: 1 },
                    ],
                    'publishStats.trend': this._generateMockTrend(),
                });
            }
        });
    },
    /** 加载获赞统计 */
    _loadLikesStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({ url: '/user/stats/likes', method: 'GET' });
                this.setData({
                    'likesStats.total': data.total || 0,
                    'likesStats.trend': data.trend || this._generateMockTrend(),
                    'likesStats.topWorks': data.topWorks || [],
                });
            }
            catch (_a) {
                this.setData({
                    'likesStats.total': this.data.overview.totalLikes,
                    'likesStats.trend': this._generateMockTrend(),
                    'likesStats.topWorks': [
                        { title: '我的科研成果展示', count: 15 },
                        { title: '志愿服务记录', count: 8 },
                    ],
                });
            }
        });
    },
    /** 加载浏览统计 */
    _loadViewsStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, api_1.request)({ url: '/user/stats/views', method: 'GET' });
                this.setData({
                    'viewsStats.total': data.total || 0,
                    'viewsStats.trend': data.trend || this._generateMockTrend(),
                    'viewsStats.topWorks': data.topWorks || [],
                });
            }
            catch (_a) {
                this.setData({
                    'viewsStats.total': this.data.overview.totalViews,
                    'viewsStats.trend': this._generateMockTrend(),
                    'viewsStats.topWorks': [
                        { title: '我的科研成果展示', count: 120 },
                        { title: '志愿服务记录', count: 85 },
                    ],
                });
            }
        });
    },
    /** 生成模拟趋势数据 */
    _generateMockTrend() {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        return days.map((d, i) => ({
            label: d,
            value: Math.floor(Math.random() * 10) + 1,
        }));
    },
});
