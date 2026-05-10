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
// pages/viewer/viewer.ts — 素材详情页（信息卡片 + 评论区 + 统一模板）
const util_1 = require("../../utils/util");
const api_1 = require("../../utils/api");
Page({
    data: {
        id: '',
        type: '',
        fileUrl: '',
        title: '',
        author: '',
        authorAvatar: '',
        authorStudentId: '',
        description: '',
        date: '',
        tags: [],
        // 图片多图模式
        imageList: [],
        // 音频
        audioPlaying: false,
        audioProgress: 0,
        audioDuration: 100,
        audioCurrentTime: '00:00',
        audioDurationText: '00:00',
        // 操作
        liked: false,
        likesCount: 0,
        views: 0,
        commentsCount: 0,
        // 格式化后的显示值
        viewsDisplay: '0',
        likesCountDisplay: '0',
        commentsCountDisplay: '0',
        dateDisplay: '',
        docLoading: false,
        loading: true,
        // 评论
        comments: [],
        commentText: '',
        sendingComment: false,
        commentInputFocused: false,
    },
    _audio: null,
    _workId: '',
    onLoad(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const id = options.id || '';
            if (!id) {
                (0, util_1.toast)('作品ID无效');
                return;
            }
            this._workId = id;
            this.setData({ id, loading: true });
            try {
                // 1. 并发加载作品详情 + 评论
                const [detail, commentsData] = yield Promise.all([
                    (0, api_1.getWorkDetail)(id),
                    (0, api_1.getWorkComments)(id).catch(() => ({ list: [] })),
                ]);
                // 2. 组装作品数据
                const rawViews = detail.views || 0;
                const rawLikes = detail.likes || 0;
                const rawCommentsCount = ((_a = commentsData === null || commentsData === void 0 ? void 0 : commentsData.list) === null || _a === void 0 ? void 0 : _a.length) || detail.commentsCount || 0;
                this.setData({
                    type: detail.type || '',
                    fileUrl: detail.fileUrl || '',
                    title: detail.title || '作品预览',
                    author: detail.author || '',
                    authorAvatar: detail.authorAvatar || '',
                    authorStudentId: detail.authorStudentId || '',
                    description: detail.description || '',
                    date: detail.date || detail.createdAt || '',
                    tags: detail.tags || [],
                    imageList: detail.imageList || [],
                    liked: detail.liked || false,
                    likesCount: rawLikes,
                    views: rawViews,
                    commentsCount: rawCommentsCount,
                    // 预计算格式化显示值
                    viewsDisplay: this._formatCount(rawViews),
                    likesCountDisplay: this._formatCount(rawLikes),
                    commentsCountDisplay: this._formatCount(rawCommentsCount),
                    dateDisplay: this._formatDate(detail.date || detail.createdAt),
                    loading: false,
                });
                // 3. 处理评论列表（添加相对时间）
                const rawComments = (commentsData === null || commentsData === void 0 ? void 0 : commentsData.list) || [];
                this.setData({
                    comments: rawComments.map((c) => ({
                        id: c.id,
                        author: c.author,
                        authorAvatar: c.authorAvatar,
                        content: c.content,
                        createdAt: c.createdAt,
                        relativeTime: (0, util_1.formatRelativeTime)(c.createdAt),
                    })),
                });
                wx.setNavigationBarTitle({ title: detail.title || '作品预览' });
                // 4. 如果是音频则初始化播放器
                if (detail.type === 'audio' && detail.fileUrl) {
                    this._initAudio(detail.fileUrl);
                }
                // 5. 异步记录浏览量
                this._recordView(id);
            }
            catch (err) {
                console.error('[Viewer] 加载失败:', err);
                (0, util_1.toast)('作品加载失败');
                this.setData({ loading: false });
            }
        });
    },
    // ─── 工具函数：格式化大数字（1234 → 1.2k）─────
    _formatCount(val) {
        if (!val && val !== 0)
            return '0';
        if (val >= 10000)
            return (val / 10000).toFixed(1) + 'w';
        if (val >= 1000)
            return (val / 1000).toFixed(1) + 'k';
        return String(val);
    },
    /** 格式化时间为 YYYY-MM-DD HH:mm */
    _formatDate(val) {
        if (!val)
            return '';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime()))
                return val;
            const Y = d.getFullYear();
            const M = String(d.getMonth() + 1).padStart(2, '0');
            const D = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${Y}-${M}-${D} ${h}:${m}`;
        }
        catch (_a) {
            return val;
        }
    },
    /** 异步记录浏览量 */
    _recordView(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, api_1.request)({ url: `/works/${id}/view`, method: 'POST', needAuth: false });
                const newViews = this.data.views + 1;
                this.setData({
                    views: newViews,
                    viewsDisplay: this._formatCount(newViews),
                });
            }
            catch ( /* 静默 */_a) { /* 静默 */ }
        });
    },
    onUnload() {
        if (this._audio) {
            this._audio.stop();
            this._audio.destroy();
            this._audio = null;
        }
    },
    onShareAppMessage() {
        return {
            title: this.data.title,
            path: `/pages/viewer/viewer?id=${this._workId}`,
        };
    },
    // ─── 音频 ───────────────────────────────────────────────
    _initAudio(src) {
        if (!src)
            return;
        const audio = wx.createInnerAudioContext();
        audio.src = src;
        audio.obeyMuteSwitch = false;
        audio.onTimeUpdate(() => {
            const cur = audio.currentTime;
            const dur = audio.duration || 0;
            this.setData({
                audioProgress: Math.floor(cur),
                audioCurrentTime: (0, util_1.formatDuration)(cur),
                audioDuration: Math.max(Math.floor(dur), 1),
                audioDurationText: (0, util_1.formatDuration)(dur),
            });
        });
        audio.onPlay(() => this.setData({ audioPlaying: true }));
        audio.onPause(() => this.setData({ audioPlaying: false }));
        audio.onStop(() => this.setData({ audioPlaying: false, audioProgress: 0, audioCurrentTime: '00:00' }));
        audio.onEnded(() => this.setData({ audioPlaying: false }));
        audio.onError((e) => { console.error('[audio]', e); (0, util_1.toast)('音频加载失败'); });
        this._audio = audio;
    },
    onAudioPlay() {
        const audio = this._audio;
        if (!audio)
            return;
        this.data.audioPlaying ? audio.pause() : audio.play();
    },
    onSliderChange(e) {
        var _a;
        (_a = this._audio) === null || _a === void 0 ? void 0 : _a.seek(e.detail.value);
    },
    onSeekBack() {
        if (!this._audio)
            return;
        this._audio.seek(Math.max(0, this._audio.currentTime - 15));
    },
    onSeekForward() {
        if (!this._audio)
            return;
        const dur = this._audio.duration || 0;
        this._audio.seek(Math.min(dur, this._audio.currentTime + 15));
    },
    // ─── 图片 ───────────────────────────────────────────────
    onImageTap(e) {
        const src = e.currentTarget.dataset.src;
        const { imageList, fileUrl } = this.data;
        const urls = imageList.length > 0 ? imageList : [fileUrl];
        wx.previewImage({ urls, current: src || fileUrl, showmenu: true });
    },
    // ─── 文档预览 ───────────────────────────────────────────
    onOpenDoc() {
        const { fileUrl } = this.data;
        if (!fileUrl) {
            (0, util_1.toast)('暂无文件链接');
            return;
        }
        this.setData({ docLoading: true });
        wx.showLoading({ title: '正在加载…' });
        wx.downloadFile({
            url: fileUrl,
            success: res => {
                wx.hideLoading();
                this.setData({ docLoading: false });
                if (res.statusCode === 200) {
                    wx.openDocument({
                        filePath: res.tempFilePath,
                        showMenu: true,
                        fail: () => (0, util_1.toast)('无法打开文件'),
                    });
                }
                else {
                    (0, util_1.toast)('文件下载失败');
                }
            },
            fail: () => {
                wx.hideLoading();
                this.setData({ docLoading: false });
                (0, util_1.toast)('下载失败，请检查网络');
            },
        });
    },
    // ─── 点赞 ───────────────────────────────────────────────
    onLike() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, api_1.toggleLike)(this._workId);
                this.setData({
                    liked: result.liked,
                    likesCount: result.likesCount,
                    likesCountDisplay: this._formatCount(result.likesCount),
                });
                (0, util_1.toast)(result.liked ? '已点赞' : '已取消点赞');
            }
            catch (err) {
                (0, util_1.toast)('操作失败，请重试');
            }
        });
    },
    // ─── 分享 ───────────────────────────────────────────────
    onShare() {
        wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
    },
    // ─── 下载 ───────────────────────────────────────────────
    onDownload() {
        const { fileUrl, type } = this.data;
        if (!fileUrl) {
            (0, util_1.toast)('暂无可下载文件');
            return;
        }
        wx.showLoading({ title: '下载中…' });
        wx.downloadFile({
            url: fileUrl,
            success: res => {
                wx.hideLoading();
                if (res.statusCode !== 200) {
                    (0, util_1.toast)('下载失败');
                    return;
                }
                if (type === 'image') {
                    wx.saveImageToPhotosAlbum({
                        filePath: res.tempFilePath,
                        success: () => (0, util_1.toast)('图片已保存到相册', 'success'),
                        fail: () => (0, util_1.toast)('保存失败，请授权相册权限'),
                    });
                }
                else if (type === 'video') {
                    wx.saveVideoToPhotosAlbum({
                        filePath: res.tempFilePath,
                        success: () => (0, util_1.toast)('视频已保存到相册', 'success'),
                        fail: () => (0, util_1.toast)('保存失败，请授权相册权限'),
                    });
                }
                else {
                    wx.openDocument({ filePath: res.tempFilePath, showMenu: true,
                        success: () => (0, util_1.toast)('文件已打开，可从菜单另存') });
                }
            },
            fail: () => { wx.hideLoading(); (0, util_1.toast)('下载失败'); },
        });
    },
    // ─── 评论功能 ───────────────────────────────────────────
    /** 输入框聚焦 */
    onCommentFocus() {
        this.setData({ commentInputFocused: true });
    },
    /** 输入框失焦 */
    onCommentBlur(e) {
        this.setData({
            commentInputFocused: false,
            commentText: e.detail.value || '',
        });
    },
    /** 键盘发送（confirm-type="send"） */
    onCommentConfirm(e) {
        const text = (e.detail.value || '').trim();
        if (text) {
            this.setData({ commentText: text });
            this._submitComment(text);
        }
    },
    /** 点击发送按钮 */
    onSendComment() {
        const text = this.data.commentText.trim();
        if (text) {
            this._submitComment(text);
        }
    },
    /** 提交评论 */
    _submitComment(content) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.data.sendingComment)
                return;
            this.setData({ sendingComment: true });
            try {
                const result = yield (0, api_1.addWorkComment)(this._workId, content);
                // 将新评论插入列表顶部
                const newComment = {
                    id: result.comment.id,
                    author: result.comment.author,
                    authorAvatar: result.comment.authorAvatar,
                    content: result.comment.content,
                    createdAt: result.comment.createdAt,
                    relativeTime: '刚刚',
                };
                this.setData({
                    comments: [newComment, ...this.data.comments],
                    commentsCount: this.data.commentsCount + 1,
                    commentText: '',
                    sendingComment: false,
                });
                (0, util_1.toast)('评论成功', 'success');
            }
            catch (err) {
                (0, util_1.toast)('评论发送失败，请重试');
                this.setData({ sendingComment: false });
            }
        });
    },
});
