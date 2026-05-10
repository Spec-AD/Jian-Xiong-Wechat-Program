"use strict";
// utils/util.ts — 健雄书院工具函数库
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttle = exports.WORK_CATEGORIES = exports.formatRelativeTime = exports.toast = exports.formatFileSize = exports.formatDuration = exports.getFileTypeIcon = exports.getFileTypeLabel = exports.getFileType = exports.formatDate = exports.formatTime = exports.formatNumber = void 0;
/** 补零 */
const formatNumber = (n) => {
    const s = n.toString();
    return s[1] ? s : '0' + s;
};
exports.formatNumber = formatNumber;
/** 格式化为 YYYY/MM/DD HH:mm:ss */
const formatTime = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    return ([year, month, day].map(exports.formatNumber).join('/') +
        ' ' +
        [hour, minute, second].map(exports.formatNumber).join(':'));
};
exports.formatTime = formatTime;
/** 格式化为 YYYY-MM-DD */
const formatDate = (val) => {
    const d = val instanceof Date ? val : new Date(val);
    return `${d.getFullYear()}-${(0, exports.formatNumber)(d.getMonth() + 1)}-${(0, exports.formatNumber)(d.getDate())}`;
};
exports.formatDate = formatDate;
const getFileType = (filename) => {
    var _a, _b;
    if (!filename)
        return 'unknown';
    const ext = (_b = (_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
    if (['mp4', 'mov', 'avi', 'mkv', 'flv', 'm4v'].includes(ext))
        return 'video';
    if (['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].includes(ext))
        return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(ext))
        return 'image';
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext))
        return 'doc';
    return 'unknown';
};
exports.getFileType = getFileType;
/** 文件类型 → 中文标签 */
const getFileTypeLabel = (type) => {
    var _a;
    const map = {
        video: '视频', audio: '音频', image: '图片', doc: '文档', unknown: '其他',
    };
    return (_a = map[type]) !== null && _a !== void 0 ? _a : '其他';
};
exports.getFileTypeLabel = getFileTypeLabel;
/** 文件类型 → Emoji 图标 */
const getFileTypeIcon = (type) => {
    var _a;
    const map = {
        video: '', audio: '', image: '', doc: '', unknown: '',
    };
    return (_a = map[type]) !== null && _a !== void 0 ? _a : '';
};
exports.getFileTypeIcon = getFileTypeIcon;
/**
 * 格式化秒数为 mm:ss
 * @example formatDuration(75) → '01:15'
 */
const formatDuration = (sec) => {
    const s = Math.floor(sec || 0);
    return `${(0, exports.formatNumber)(Math.floor(s / 60))}:${(0, exports.formatNumber)(s % 60)}`;
};
exports.formatDuration = formatDuration;
/** 格式化文件大小 */
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
exports.formatFileSize = formatFileSize;
/** 简易 Toast */
const toast = (title, icon = 'none') => {
    wx.showToast({ title, icon, duration: 2000 });
};
exports.toast = toast;
/**
 * 格式化相对时间（刚刚 / N分钟前 / N小时前 / N天前）
 */
const formatRelativeTime = (val) => {
    const now = Date.now();
    const ts = val instanceof Date ? val.getTime() : new Date(val).getTime();
    if (isNaN(ts))
        return '未知';
    const diff = now - ts;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60)
        return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30)
        return `${days}天前`;
    return (0, exports.formatDate)(val);
};
exports.formatRelativeTime = formatRelativeTime;
exports.WORK_CATEGORIES = [
    { id: 'all', name: '全部', icon: '' },
    { id: 'video', name: '视频', icon: '' },
    { id: 'audio', name: '音频', icon: '' },
    { id: 'image', name: '图片', icon: '' },
    { id: 'doc', name: '文档', icon: '' },
    { id: 'research', name: '科研', icon: '' },
    { id: 'volunteer', name: '志愿', icon: '' },
];
/**
 * 节流（300ms 默认）
 */
const throttle = (fn, delay = 300) => {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last >= delay) {
            last = now;
            fn(...args);
        }
    };
};
exports.throttle = throttle;
