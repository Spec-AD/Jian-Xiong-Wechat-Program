"use strict";
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
        // COS 资源导入
        cosObjects: [],
        cosLoading: false,
        cosTotalFiles: 0,
        cosStats: null,
        cosSelectedKeys: [],
        cosImporting: false,
        cosImportResult: null,
        cosFilterType: 'all',
        cosSearchText: '',
        cosSelectAll: false,
        filteredCosObjects: [],
    },
    async onLoad() {
        // 检查管理员权限
        const userInfo = app.globalData.userInfo;
        if (!userInfo) {
            (0, util_1.toast)('请先登录');
            wx.navigateBack();
            return;
        }
        await this._checkAdmin();
    },
    async _checkAdmin() {
        try {
            const profile = await (0, api_1.request)({
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
    },
    async _loadDashboard() {
        try {
            const data = await (0, api_1.request)({
                url: '/admin/stats',
                method: 'GET',
            });
            this.setData({ stats: data });
        }
        catch {
            // 静默降级
        }
    },
    async _loadWorks(reset) {
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
            const result = await (0, api_1.getWorks)(params);
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
    },
    /** 切换tab */
    onTabChange(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab });
        if (tab === 'works') {
            this._loadWorks(true);
        }
        else if (tab === 'cos-import' && this.data.cosObjects.length === 0) {
            this.onLoadCosResources();
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
    // ════════════════════════════════════════════════════
    //  COS 资源导入
    // ════════════════════════════════════════════════════
    /** 加载 COS 资源列表 */
    async onLoadCosResources() {
        this.setData({ cosLoading: true, cosSelectedKeys: [], cosSelectAll: false, cosImportResult: null });
        try {
            // 1. 先获取统计信息
            const stats = await (0, api_1.request)({ url: '/cos/stats', method: 'GET' });
            // 2. 获取资源列表（最多 1000 个）
            let allObjects = [];
            let marker = undefined;
            do {
                const result = await (0, api_1.request)({
                    url: `/cos/resources?prefix=resources/&maxKeys=200${marker ? `&marker=${marker}` : ''}`,
                    method: 'GET',
                });
                allObjects = allObjects.concat(result.objects);
                marker = result.nextMarker;
            } while (marker);
            this.setData({
                cosObjects: allObjects,
                cosTotalFiles: allObjects.length,
                cosStats: stats,
                cosLoading: false,
                filteredCosObjects: allObjects, // 初始时全部显示
            });
        }
        catch (err) {
            this.setData({ cosLoading: false });
            (0, util_1.toast)(err.message || '加载 COS 资源失败');
        }
    },
    /** 切换 COS 资源选择 */
    onCosSelect(e) {
        const key = e.currentTarget.dataset.key;
        const selected = [...this.data.cosSelectedKeys];
        const index = selected.indexOf(key);
        if (index > -1) {
            selected.splice(index, 1);
        }
        else {
            selected.push(key);
        }
        this.setData({
            cosSelectedKeys: selected,
            cosSelectAll: selected.length === this.data.filteredCosObjects.length && this.data.filteredCosObjects.length > 0,
        });
    },
    /** 全选/取消全选 */
    onCosSelectAll() {
        const allKeys = this.data.filteredCosObjects.map(o => o.key);
        if (this.data.cosSelectAll) {
            this.setData({ cosSelectedKeys: [], cosSelectAll: false });
        }
        else {
            this.setData({ cosSelectedKeys: allKeys, cosSelectAll: true });
        }
    },
    /** 获取过滤后的对象列表 */
    _getFilteredObjects() {
        let list = this.data.cosObjects;
        // 按类型过滤
        if (this.data.cosFilterType !== 'all') {
            list = list.filter(o => o.ext.replace('.', '') === this.data.cosFilterType);
        }
        // 按搜索文本过滤
        if (this.data.cosSearchText) {
            const kw = this.data.cosSearchText.toLowerCase();
            list = list.filter(o => o.fileName.toLowerCase().includes(kw));
        }
        return list;
    },
    /** COS 列表过滤（按类型 + 搜索）— 更新过滤结果并同步到 data */
    _applyCosFilter() {
        const filtered = this._getFilteredObjects();
        this.setData({
            filteredCosObjects: filtered,
            cosSelectAll: this.data.cosSelectedKeys.length === filtered.length && filtered.length > 0,
        });
    },
    /** COS 列表过滤（按类型） */
    onCosFilterType(e) {
        const type = e.currentTarget.dataset.type;
        this.setData({
            cosFilterType: type,
            cosSelectedKeys: [],
            cosSelectAll: false,
        }, () => this._applyCosFilter());
    },
    /** COS 搜索输入 */
    onCosSearch(e) {
        this.setData({
            cosSearchText: e.detail.value,
            cosSelectedKeys: [],
            cosSelectAll: false,
        }, () => this._applyCosFilter());
    },
    /** 执行批量导入 */
    async onCosImport() {
        const keys = this.data.cosSelectedKeys;
        if (keys.length === 0) {
            (0, util_1.toast)('请先选择要导入的资源');
            return;
        }
        this.setData({ cosImporting: true });
        wx.showLoading({ title: `正在导入 ${keys.length} 个资源…`, mask: true });
        try {
            const result = await (0, api_1.request)({
                url: '/cos/import',
                method: 'POST',
                data: { objectKeys: keys },
            });
            wx.hideLoading();
            this.setData({
                cosImportResult: result,
                cosImporting: false,
                cosSelectedKeys: [],
                cosSelectAll: false,
            });
            (0, util_1.toast)(`成功导入 ${result.imported} 个资源`, 'success');
        }
        catch (err) {
            wx.hideLoading();
            this.setData({ cosImporting: false });
            (0, util_1.toast)(err.message || '导入失败');
        }
    },
    /** 格式化文件大小 */
    _formatSize(bytes) {
        if (!bytes || bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    },
    /** 获取文件类型对应的显示名 */
    _getExtLabel(ext) {
        const map = {
            'mp4': '视频', 'mov': '视频', 'avi': '视频', 'mkv': '视频',
            'mp3': '音频', 'wav': '音频',
            'jpg': '图片', 'jpeg': '图片', 'png': '图片', 'gif': '图片', 'webp': '图片',
            'pdf': '文档', 'doc': '文档', 'docx': '文档', 'ppt': '文档', 'pptx': '文档', 'xls': '文档', 'xlsx': '文档',
        };
        return map[ext.toLowerCase()] || ext;
    },
});
