"use strict";
/**
 * utils/downloadManager.ts — 健雄书院下载管理器
 *
 * 功能：
 *  - 管理下载任务（添加、移除、查询）
 *  - 追踪下载进度、速度、预计剩余时间
 *  - 持久化存储下载记录
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDownloads = getDownloads;
exports.getDownloadById = getDownloadById;
exports.addDownloadRecord = addDownloadRecord;
exports.updateDownloadRecord = updateDownloadRecord;
exports.removeDownloadRecord = removeDownloadRecord;
exports.clearDownloads = clearDownloads;
exports.getActiveDownloadCount = getActiveDownloadCount;
exports.formatFileSize = formatFileSize;
exports.formatSpeed = formatSpeed;
exports.formatETA = formatETA;
exports.getStatusLabel = getStatusLabel;
exports.getDownloadStats = getDownloadStats;
const DOWNLOADS_KEY = 'jianxiong_downloads';
/**
 * 获取所有下载记录
 */
function getDownloads() {
    try {
        const raw = wx.getStorageSync(DOWNLOADS_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
/**
 * 保存下载记录列表
 */
function saveDownloads(list) {
    wx.setStorageSync(DOWNLOADS_KEY, JSON.stringify(list));
}
/**
 * 根据 ID 获取下载记录
 */
function getDownloadById(id) {
    return getDownloads().find((d) => d.id === id);
}
/**
 * 添加下载记录
 */
function addDownloadRecord(record) {
    const list = getDownloads();
    const newRecord = {
        ...record,
        id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
    };
    list.unshift(newRecord);
    saveDownloads(list);
    return newRecord;
}
/**
 * 更新下载记录
 */
function updateDownloadRecord(id, updates) {
    const list = getDownloads();
    const index = list.findIndex((d) => d.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        saveDownloads(list);
    }
}
/**
 * 删除一条下载记录
 */
function removeDownloadRecord(id) {
    const list = getDownloads();
    const filtered = list.filter((d) => d.id !== id);
    saveDownloads(filtered);
}
/**
 * 清空所有下载记录
 */
function clearDownloads() {
    wx.removeStorageSync(DOWNLOADS_KEY);
}
/**
 * 获取活跃下载数
 */
function getActiveDownloadCount() {
    return getDownloads().filter((d) => d.status === 'downloading').length;
}
/**
 * 格式化文件大小（友好显示）
 */
function formatFileSize(bytes) {
    if (!bytes || bytes <= 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * 格式化速度
 */
function formatSpeed(bytesPerSec) {
    if (bytesPerSec <= 0)
        return '--';
    return formatFileSize(bytesPerSec) + '/s';
}
/**
 * 格式化预计剩余时间
 */
function formatETA(seconds) {
    if (seconds <= 0 || !isFinite(seconds))
        return '--';
    if (seconds < 60)
        return Math.ceil(seconds) + '秒';
    if (seconds < 3600)
        return Math.ceil(seconds / 60) + '分钟';
    return (seconds / 3600).toFixed(1) + '小时';
}
/**
 * 下载状态中文标签
 */
function getStatusLabel(status) {
    const map = {
        downloading: '下载中',
        completed: '已完成',
        paused: '已暂停',
        failed: '失败',
    };
    return map[status] || '未知';
}
/**
 * 获取下载统计
 */
function getDownloadStats() {
    const list = getDownloads();
    return {
        total: list.length,
        completed: list.filter((d) => d.status === 'completed').length,
        downloading: list.filter((d) => d.status === 'downloading').length,
        failed: list.filter((d) => d.status === 'failed').length,
        totalSize: list.reduce((sum, d) => sum + d.totalBytes, 0),
    };
}
