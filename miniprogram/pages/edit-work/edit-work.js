"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// pages/edit-work/edit-work.ts — 编辑作品
const util_1 = require("../../utils/util");
const api_1 = require("../../utils/api");
const app = getApp();
const TYPE_OPTIONS = [
    { id: 'video', name: '视频', icon: '', desc: 'mp4/mov/avi 等' },
    { id: 'audio', name: '音频', icon: '', desc: 'mp3/wav/flac 等' },
    { id: 'image', name: '图片', icon: '', desc: 'jpg/png/gif 等，支持多图' },
    { id: 'doc', name: '文档', icon: '', desc: 'pdf/doc/ppt 等' },
    { id: 'research', name: '科研', icon: '', desc: '论文/报告/专利' },
    { id: 'volunteer', name: '志愿', icon: '', desc: '社会实践/志愿服务' },
];
Page({
    data: {
        workId: '',
        typeOptions: TYPE_OPTIONS,
        selectedType: '',
        title: '',
        description: '',
        tagInput: '',
        tags: [],
        // 文件相关
        uploadedUrl: '',
        uploadedName: '',
        uploadedCover: '',
        uploading: false,
        // 提交状态
        submitting: false,
        // 多图支持
        imageList: [],
        showImageUpload: false,
        // 数据加载
        loading: true,
        // 状态管理
        status: 'published',
        // 实际作者
        actualAuthor: '',
        // 是否为管理员/作者
        isAdmin: false,
        isOwner: false,
    },
    async onLoad(options) {
        const workId = options.id || '';
        if (!workId) {
            (0, util_1.toast)('作品ID无效');
            wx.navigateBack();
            return;
        }
        this.setData({ workId, loading: true });
        try {
            // 加载作品详情
            const detail = await (0, api_1.getWorkDetail)(workId);
            const isImageType = detail.type === 'image';
            this.setData({
                selectedType: detail.type || '',
                title: detail.title || '',
                description: detail.description || '',
                tags: detail.tags || [],
                uploadedUrl: detail.fileUrl || '',
                uploadedCover: detail.cover || '',
                imageList: detail.imageList || [],
                showImageUpload: isImageType,
                status: detail.status || 'published',
                actualAuthor: detail.actualAuthor || '',
                loading: false,
            });
            wx.setNavigationBarTitle({ title: `编辑：${detail.title || '作品'}` });
        }
        catch (err) {
            console.error('[EditWork] 加载失败:', err);
            (0, util_1.toast)('加载作品失败');
            wx.navigateBack();
        }
    },
    /** 选择作品类型 */
    onTypeSelect(e) {
        const typeId = e.currentTarget.dataset.id;
        this.setData({
            selectedType: typeId,
            showImageUpload: typeId === 'image',
        });
    },
    /** 标题输入 */
    onTitleInput(e) {
        this.setData({ title: e.detail.value });
    },
    /** 描述输入 */
    onDescInput(e) {
        this.setData({ description: e.detail.value });
    },
    /** 标签输入 */
    onTagInput(e) {
        this.setData({ tagInput: e.detail.value });
    },
    /** 添加标签 */
    onTagConfirm() {
        const tag = this.data.tagInput.trim();
        if (!tag)
            return;
        if (this.data.tags.length >= 5) {
            (0, util_1.toast)('最多添加5个标签');
            return;
        }
        if (this.data.tags.includes(tag)) {
            (0, util_1.toast)('标签已存在');
            return;
        }
        this.setData({
            tags: [...this.data.tags, tag],
            tagInput: '',
        });
    },
    /** 删除标签 */
    onTagRemove(e) {
        const index = e.currentTarget.dataset.index;
        const tags = [...this.data.tags];
        tags.splice(index, 1);
        this.setData({ tags });
    },
    /** 选择并上传新文件 */
    async onChooseFile() {
        const { selectedType } = this.data;
        if (!selectedType) {
            (0, util_1.toast)('请先选择作品类型');
            return;
        }
        if (this.data.uploading)
            return;
        try {
            let res;
            if (selectedType === 'image') {
                res = await wx.chooseMedia({
                    count: this.data.imageList.length > 0 ? 9 - this.data.imageList.length : 9,
                    mediaType: ['image'],
                    sourceType: ['album', 'camera'],
                });
                for (const item of res.tempFiles) {
                    await this._doUpload(item.tempFilePath);
                }
            }
            else if (selectedType === 'video') {
                res = await wx.chooseMedia({
                    count: 1,
                    mediaType: ['video'],
                    sourceType: ['album', 'camera'],
                });
                await this._doUpload(res.tempFiles[0].tempFilePath);
            }
            else if (selectedType === 'audio') {
                res = await wx.chooseMessageFile({
                    count: 1,
                    type: 'file',
                });
                await this._doUpload(res.tempFiles[0].path);
            }
            else {
                res = await wx.chooseMessageFile({
                    count: 1,
                    type: 'file',
                });
                await this._doUpload(res.tempFiles[0].path, res.tempFiles[0].name);
            }
        }
        catch (err) {
            if (err.errMsg && err.errMsg.includes('cancel'))
                return;
            console.error('[EditWork] chooseFile error:', err);
            (0, util_1.toast)('选择文件失败');
        }
    },
    /** 执行上传 */
    async _doUpload(tempPath, originalName) {
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中…', mask: true });
        try {
            const result = await (0, api_1.uploadFile)(tempPath, this.data.selectedType, originalName);
            if (this.data.selectedType === 'image') {
                const list = [...this.data.imageList, result.url];
                this.setData({ imageList: list });
                if (list.length === 1) {
                    this.setData({ uploadedCover: result.url });
                }
            }
            else {
                this.setData({
                    uploadedUrl: result.url,
                    uploadedName: originalName || result.filename,
                });
            }
            wx.hideLoading();
            (0, util_1.toast)('上传成功', 'success');
        }
        catch (err) {
            wx.hideLoading();
            (0, util_1.toast)(err.message || '上传失败');
        }
        finally {
            this.setData({ uploading: false });
        }
    },
    /** 删除已上传的图片 */
    onRemoveImage(e) {
        const index = e.currentTarget.dataset.index;
        const list = [...this.data.imageList];
        list.splice(index, 1);
        this.setData({
            imageList: list,
            uploadedCover: list.length > 0 ? list[0] : '',
        });
    },
    /** 状态变更 */
    onStatusChange(e) {
        this.setData({ status: e.detail.value });
    },
    /** 保存作品 */
    async onSave() {
        const { workId, selectedType, title, description, tags, uploadedUrl, imageList, uploadedCover, status, actualAuthor } = this.data;
        // === 校验 ===
        if (!title.trim()) {
            (0, util_1.toast)('请输入作品标题');
            return;
        }
        this.setData({ submitting: true });
        wx.showLoading({ title: '保存中…', mask: true });
        try {
            const workData = {
                title: title.trim(),
                description: description.trim(),
                tags,
                status,
                actualAuthor: actualAuthor.trim(),
            };
            // 只传有变化的字段
            if (selectedType)
                workData.type = selectedType;
            if (selectedType === 'image') {
                workData.imageList = imageList;
                if (imageList.length > 0) {
                    workData.fileUrl = imageList[0];
                    workData.cover = uploadedCover || imageList[0];
                }
            }
            else {
                if (uploadedUrl)
                    workData.fileUrl = uploadedUrl;
                if (uploadedCover)
                    workData.cover = uploadedCover;
            }
            await (0, api_1.updateWork)(workId, workData);
            wx.hideLoading();
            wx.showModal({
                title: '保存成功',
                content: '作品已更新！',
                showCancel: false,
                confirmText: '返回',
                success: () => {
                    wx.navigateBack();
                },
            });
        }
        catch (err) {
            wx.hideLoading();
            (0, util_1.toast)(err.message || '保存失败，请重试');
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    /** 删除作品（管理员/作者可用） */
    onDelete() {
        const { workId, title } = this.data;
        wx.showModal({
            title: '确认删除',
            content: `确定要删除「${title || '作品'}」吗？此操作不可恢复。`,
            confirmColor: '#e57373',
            confirmText: '删除',
            success: async (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '删除中…', mask: true });
                    try {
                        await (0, api_1.deleteWork)(workId);
                        wx.hideLoading();
                        (0, util_1.toast)('已删除', 'success');
                        // 返回到上一页（如果是 viewer 进来的，回退两次到 hall）
                        wx.navigateBack({ delta: 2 });
                    }
                    catch (err) {
                        wx.hideLoading();
                        (0, util_1.toast)(err.message || '删除失败');
                    }
                }
            },
        });
    },
});
