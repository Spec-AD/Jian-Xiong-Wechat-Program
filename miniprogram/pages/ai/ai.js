"use strict";
/**
 * pages/ai/ai.ts — AI 对话助手（DeepSeek 流式输出 + 思考模式）
 *
 * 功能：
 *  - 通过后端代理调用 DeepSeek API（避免前端暴露密钥）
 *  - 流式输出：逐 token 渲染到页面
 *  - 思考模式：使用 deepseek-reasoner，展示推理过程
 */
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
const util_1 = require("../../utils/util");
const api_1 = require("../../utils/api");
const app = getApp();
/** 后端 API 基础地址 */
const API_BASE = app.globalData.baseUrl;
Page({
    data: {
        /** 对话消息列表 */
        messages: [],
        /** 输入框内容 */
        inputText: '',
        /** 是否正在等待 AI 回复 */
        waiting: false,
        /** 是否已有对话 */
        hasChat: false,
        /** 思考模式开关 */
        thinkingMode: false,
        /** 快捷问题列表 */
        quickQuestions: [
            '健雄书院的院训是什么？',
            '介绍一下南京大学健雄书院',
            '书院有哪些特色活动？',
            '如何申请加入健雄书院？',
        ],
        /** 用户头像 URL */
        userAvatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    },
    onLoad() {
        // 同步用户头像
        this._syncUserAvatar();
        // 从缓存恢复对话历史
        this._loadHistory();
        // 从缓存恢复思考模式状态
        const savedThinking = wx.getStorageSync('ai_thinking_mode');
        if (savedThinking === true) {
            this.setData({ thinkingMode: true });
        }
    },
    onShow() {
        this._syncUserAvatar();
    },
    onUnload() {
        this._saveHistory();
    },
    /** ===== 头像同步 ===== */
    _syncUserAvatar() {
        var _a;
        const avatarUrl = (_a = app.globalData.userInfo) === null || _a === void 0 ? void 0 : _a.avatarUrl;
        if (avatarUrl) {
            this.setData({ userAvatar: avatarUrl });
        }
    },
    /** ===== 历史记录 ===== */
    _loadHistory() {
        try {
            const saved = wx.getStorageSync('ai_chat_history');
            if (saved && Array.isArray(saved) && saved.length > 0) {
                this.setData({ messages: saved, hasChat: true });
            }
        }
        catch (_a) {
            // 忽略缓存读取错误
        }
    },
    _saveHistory() {
        const { messages } = this.data;
        if (messages.length > 0) {
            const toSave = messages.slice(-50).map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                reasoning: m.reasoning,
                showReasoning: m.showReasoning,
                timestamp: m.timestamp,
                thinkingMode: m.thinkingMode,
            }));
            wx.setStorageSync('ai_chat_history', toSave);
        }
    },
    /** ===== 思考模式切换 ===== */
    onToggleThinking() {
        const newMode = !this.data.thinkingMode;
        this.setData({ thinkingMode: newMode });
        wx.setStorageSync('ai_thinking_mode', newMode);
        (0, util_1.toast)(newMode ? '深度思考模式已开启' : '快速问答模式');
    },
    /** ===== 展开/收起推理过程 ===== */
    onToggleReasoning(e) {
        const id = e.currentTarget.dataset.id;
        const { messages } = this.data;
        const updated = messages.map(m => {
            if (m.id === id) {
                return Object.assign(Object.assign({}, m), { showReasoning: !m.showReasoning });
            }
            return m;
        });
        this.setData({ messages: updated });
    },
    /** ===== 输入框 ===== */
    onInput(e) {
        this.setData({ inputText: e.detail.value });
    },
    /** ===== 发送消息 ===== */
    onSend() {
        const { inputText, waiting } = this.data;
        if (!inputText.trim() || waiting)
            return;
        this._sendMessage(inputText.trim());
        this.setData({ inputText: '' });
    },
    /** ===== 点击快捷问题 ===== */
    onQuickTap(e) {
        const text = e.currentTarget.dataset.text;
        if (this.data.waiting)
            return;
        this._sendMessage(text);
    },
    /** ===== 核心方法：发送消息并流式获取 AI 回复 ===== */
    _sendMessage(text) {
        return __awaiter(this, void 0, void 0, function* () {
            const { thinkingMode } = this.data;
            // 1. 添加用户消息
            const userMsg = {
                id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                role: 'user',
                content: text,
                timestamp: Date.now(),
            };
            // 2. 添加 assistant 占位（流式写入）
            const assistantId = `assist_${Date.now()}`;
            const assistantMsg = {
                id: assistantId,
                role: 'assistant',
                content: '',
                reasoning: '',
                showReasoning: false,
                timestamp: Date.now(),
                streaming: true,
                loading: true,
                thinkingMode,
            };
            const messages = [...this.data.messages, userMsg, assistantMsg];
            this.setData({ messages, waiting: true, hasChat: true });
            // 滚动到底部显示 loading
            this._scrollToBottom();
            try {
                // 3. 构造对话历史（取最近 20 条）
                const historyForApi = this.data.messages
                    .concat(userMsg)
                    .filter(m => m.role !== 'system' && !m.streaming)
                    .slice(-20)
                    .map(m => ({
                    role: m.role,
                    content: m.content,
                }));
                // 添加系统提示词
                const systemPrompt = thinkingMode
                    ? '你是健雄书院智能助手，由 DeepSeek R1 驱动。请先展示你的推理思考过程，然后给出最终回答。回答应当简洁、准确、友好。如果遇到不确定的问题，请如实告知用户你不清楚。'
                    : '你是健雄书院智能助手，由 DeepSeek 驱动。你的职责是帮助用户了解南京大学健雄书院的相关信息，包括书院介绍、招生政策、校园生活、学术活动等。回答应当简洁、准确、友好。如果遇到不确定的问题，请如实告知用户你不清楚。';
                historyForApi.unshift({ role: 'system', content: systemPrompt });
                // 4. 发起流式请求
                yield this._streamChat(assistantId, historyForApi, thinkingMode);
            }
            catch (err) {
                // 5. 出错时更新消息
                const updated = this.data.messages.map(m => {
                    if (m.id === assistantId) {
                        return Object.assign(Object.assign({}, m), { loading: false, streaming: false, content: m.content || `抱歉，AI 暂时无法回复。${err.message || '请稍后再试'}` });
                    }
                    return m;
                });
                this.setData({ messages: updated, waiting: false });
            }
            this._scrollToBottom();
        });
    },
    /**
     * 流式聊天 — 使用 enableChunked 接收 SSE 流
     */
    _streamChat(assistantId, messages, thinkingMode) {
        return new Promise((resolve, reject) => {
            const token = (0, api_1.getToken)();
            if (!token) {
                reject(new Error('请先登录'));
                return;
            }
            const requestTask = wx.request({
                url: `${API_BASE}/ai/chat`,
                method: 'POST',
                header: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                data: {
                    messages,
                    thinkingMode,
                },
                // @ts-ignore: enableChunked is supported since base library 2.18.0
                enableChunked: true,
                timeout: 60000,
                success: () => {
                    // 流式响应结束时，标记完成
                    const updated = this.data.messages.map(m => {
                        if (m.id === assistantId) {
                            return Object.assign(Object.assign({}, m), { streaming: false, loading: false });
                        }
                        return m;
                    });
                    this.setData({ messages: updated, waiting: false });
                    resolve();
                },
                fail: (err) => {
                    reject(new Error(err.errMsg || '网络请求失败'));
                },
            });
            // 缓冲区：用于累积不完整的 SSE 行
            let buffer = '';
            // 监听分块数据
            // @ts-ignore: onChunkReceived is supported since base library 2.18.0
            requestTask.onChunkReceived((response) => {
                try {
                    // 将 ArrayBuffer 转为字符串
                    const uint8Array = new Uint8Array(response.data);
                    let chunkText = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        chunkText += String.fromCharCode(uint8Array[i]);
                    }
                    buffer += chunkText;
                    // 按行解析 SSE 事件
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // 保留不完整的行
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: '))
                            continue;
                        const jsonStr = trimmed.slice(6);
                        if (jsonStr === '[DONE]')
                            continue;
                        try {
                            const event = JSON.parse(jsonStr);
                            this._handleSSEEvent(assistantId, event);
                        }
                        catch (_a) {
                            // 忽略解析错误
                        }
                    }
                }
                catch (_b) {
                    // 忽略解码错误
                }
            });
        });
    },
    /**
     * 处理 SSE 事件
     */
    _handleSSEEvent(assistantId, event) {
        const { messages } = this.data;
        if (event.type === 'reasoning') {
            // 思考模式：追加推理内容
            const updated = messages.map(m => {
                if (m.id === assistantId) {
                    const newReasoning = (m.reasoning || '') + (event.content || '');
                    return Object.assign(Object.assign({}, m), { reasoning: newReasoning, loading: false, 
                        // 自动展开推理过程（仅首次）
                        showReasoning: m.showReasoning !== false });
                }
                return m;
            });
            this.setData({ messages: updated });
            this._scrollToBottom();
        }
        else if (event.type === 'chunk') {
            // 常规内容：逐 token 追加
            const updated = messages.map(m => {
                if (m.id === assistantId) {
                    return Object.assign(Object.assign({}, m), { content: (m.content || '') + (event.content || ''), loading: false });
                }
                return m;
            });
            this.setData({ messages: updated });
            this._scrollToBottom();
        }
        else if (event.type === 'error') {
            // 错误事件
            const updated = messages.map(m => {
                if (m.id === assistantId) {
                    return Object.assign(Object.assign({}, m), { content: (m.content || '') + `\n\n⚠️ ${event.message || '发生错误'}`, loading: false });
                }
                return m;
            });
            this.setData({ messages: updated });
        }
        // 'done' 类型由 success 回调处理
    },
    /** ===== 清除对话 ===== */
    onClear() {
        wx.showModal({
            title: '清除对话',
            content: '确定要清除所有对话记录吗？',
            success: (res) => {
                if (res.confirm) {
                    this.setData({ messages: [], hasChat: false });
                    wx.removeStorageSync('ai_chat_history');
                    (0, util_1.toast)('已清除');
                }
            },
        });
    },
    /** ===== 滚动到底部 ===== */
    _scrollToBottom() {
        setTimeout(() => {
            wx.createSelectorQuery()
                .select('#chat-bottom')
                .scrollOffset((res) => {
                wx.pageScrollTo({
                    scrollTop: res.scrollTop || 99999,
                    duration: 100,
                });
            })
                .exec();
        }, 50);
    },
});
