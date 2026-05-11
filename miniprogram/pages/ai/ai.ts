/**
 * pages/ai/ai.ts — AI 对话助手（DeepSeek 流式输出 + 思考模式）
 *
 * 功能：
 *  - 通过后端代理调用 DeepSeek API（避免前端暴露密钥）
 *  - 流式输出：逐 token 渲染到页面
 *  - 思考模式：使用 deepseek-reasoner，展示推理过程
 */

import { toast } from '../../utils/util'
import { getToken } from '../../utils/api'
import { markdownToHtml } from '../../utils/markdown'

const app = getApp<IAppOption>()

/** 后端 API 基础地址 */
const API_BASE = app.globalData.baseUrl

/** 通用语录（随时可能触发） */
const GENERAL_QUOTES: string[] = [
  '世人的眼光或许分男女，微小的原子和核子却不会。',
  '不要害怕做新的尝试，即使失败了，也是向成功迈进的一步。',
  '真正的智慧不在于知识的多少，而在于运用知识的能力。',
  '实验物理是以事实为依据的学问。',
  '一个成功的实验需要的是眼光、勇气和毅力。',
  '父亲教我做人要做\'大我\'而非\'小我\'。',
]

/** 夜深了时段（22:00-次日06:00）触发的语录 */
const NIGHT_QUOTES: string[] = [
  '只有一件事比从实验室回到家里看到满池的脏碗更糟糕，那就是不能去实验室。',
]

/** 单条对话消息 */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Markdown 渲染后的 HTML（供 <rich-text> 使用） */
  contentHtml?: string
  reasoning?: string
  /** 推理内容渲染后的 HTML */
  reasoningHtml?: string
  showReasoning?: boolean
  timestamp: number
  streaming?: boolean
  loading?: boolean
  thinkingMode?: boolean
}

Page({
  data: {
    /** 对话消息列表 */
    messages: [] as ChatMessage[],

    /** 输入框内容 */
    inputText: '',

    /** 是否正在等待 AI 回复 */
    waiting: false,

    /** 发送按钮是否可用（由 inputText 计算） */
    canSend: false,

    /** 是否已有对话 */
    hasChat: false,

    /** 思考模式开关 */
    thinkingMode: false,

    /** 快捷问题列表 */
    quickQuestions: [
      '为我介绍一下吴健雄',
      '吴健雄大先生具有怎样的精神',
      '帮我总结吴健雄取得了哪些成就',
      '吴健雄在追求男女平等关系的道路上做出了怎样的贡献',
    ] as string[],

    /** 用户头像 URL */
    userAvatar: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',

    /** 时段问候语 */
    greeting: '',

    /** 吴健雄语录 */
    quote: '',
  },

  onLoad() {
    // 同步用户头像
    this._syncUserAvatar()

    // 从缓存恢复对话历史
    this._loadHistory()

    // 从缓存恢复思考模式状态
    const savedThinking = wx.getStorageSync('ai_thinking_mode')
    if (savedThinking === true) {
      this.setData({ thinkingMode: true })
    }

    // 生成问候语和语录
    this._generateGreeting()
  },

  onShow() {
    this._syncUserAvatar()
    // 重新生成问候语（应对跨时段场景）
    this._generateGreeting()
  },

  onUnload() {
    this._saveHistory()
  },

  /** ===== 头像同步 ===== */
  _syncUserAvatar() {
    const avatarUrl = app.globalData.userInfo?.avatarUrl
    if (avatarUrl) {
      this.setData({ userAvatar: avatarUrl })
    }
  },

  /** ===== 历史记录 ===== */
  _loadHistory() {
    try {
      const saved = wx.getStorageSync('ai_chat_history')
      if (saved && Array.isArray(saved) && saved.length > 0) {
        // 从缓存恢复时，重新生成 HTML（兼容旧缓存没有 contentHtml 的情况）
        const restored = saved.map(m => ({
          ...m,
          contentHtml: m.contentHtml || markdownToHtml(m.content || ''),
          reasoningHtml: m.reasoningHtml || markdownToHtml(m.reasoning || ''),
        }))
        this.setData({ messages: restored, hasChat: true })
      }
    } catch {
      // 忽略缓存读取错误
    }
  },

  _saveHistory() {
    const { messages } = this.data
    if (messages.length > 0) {
      const toSave = messages.slice(-50).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        contentHtml: m.contentHtml,
        reasoning: m.reasoning,
        reasoningHtml: m.reasoningHtml,
        showReasoning: m.showReasoning,
        timestamp: m.timestamp,
        thinkingMode: m.thinkingMode,
      }))
      wx.setStorageSync('ai_chat_history', toSave)
    }
  },

  /** ===== 问候语 & 吴健雄语录 ===== */

  /** 获取 UTC+8 当前时段问候语 */
  _getPeriodGreeting(): string {
    const now = new Date()
    const utcHours = now.getUTCHours()
    const beijingHours = (utcHours + 8) % 24

    if (beijingHours >= 6 && beijingHours < 9) {
      return '早上好'
    } else if (beijingHours >= 9 && beijingHours < 11) {
      return '上午好'
    } else if (beijingHours >= 11 && beijingHours < 14) {
      return '中午好'
    } else if (beijingHours >= 14 && beijingHours < 17) {
      return '下午好'
    } else if (beijingHours >= 17 && beijingHours < 19) {
      return '日落了'
    } else if (beijingHours >= 19 && beijingHours < 22) {
      return '晚上好'
    } else {
      return '夜深了'
    }
  },

  /** 获取用户昵称 */
  _getUserNickName(): string {
    const nickName = app.globalData.userInfo?.nickName
    return (nickName && typeof nickName === 'string' && nickName.trim()) ? nickName : '书院同学'
  },

  /** 获取随机语录（通用 + 夜深时段触发） */
  _getRandomQuote(): string {
    const now = new Date()
    const utcHours = now.getUTCHours()
    const beijingHours = (utcHours + 8) % 24

    // 夜深了时段（22:00-次日06:00）：合并通用语录和深夜语录
    if (beijingHours >= 22 || beijingHours < 6) {
      const allQuotes = [...GENERAL_QUOTES, ...NIGHT_QUOTES]
      const index = Math.floor(Math.random() * allQuotes.length)
      return allQuotes[index]
    }

    // 其他时段：仅通用语录
    const index = Math.floor(Math.random() * GENERAL_QUOTES.length)
    return GENERAL_QUOTES[index]
  },

  /** 生成问候语和语录并更新页面 */
  _generateGreeting() {
    const periodText = this._getPeriodGreeting()
    const nickName = this._getUserNickName()
    const quote = this._getRandomQuote()
    this.setData({
      greeting: periodText + '，' + nickName,
      quote: '\u201C' + quote + '\u201D \u2014\u2014\u2014\u2014\u5434\u5065\u96c4',
    })
  },

  /** ===== 思考模式切换 ===== */
  onToggleThinking() {
    const newMode = !this.data.thinkingMode
    this.setData({ thinkingMode: newMode })
    wx.setStorageSync('ai_thinking_mode', newMode)
    // 不显示 toast，仅通过开关样式变化反馈状态
  },

  /** ===== 展开/收起推理过程 ===== */
  onToggleReasoning(e: any) {
    const id = e.currentTarget.dataset.id as string
    const { messages } = this.data
    const updated = messages.map(m => {
      if (m.id === id) {
        return { ...m, showReasoning: !m.showReasoning }
      }
      return m
    })
    this.setData({ messages: updated })
  },

  /** ===== 输入框 ===== */
  onInput(e: any) {
    const val = e.detail.value || ''
    this.setData({ inputText: val, canSend: !!val.trim() })
  },

  /** ===== 发送消息 ===== */
  onSend() {
    const { inputText, waiting } = this.data
    if (!inputText.trim() || waiting) return

    this._sendMessage(inputText.trim())
    this.setData({ inputText: '', canSend: false })
  },

  /** ===== 点击快捷问题 ===== */
  onQuickTap(e: any) {
    const text = e.currentTarget.dataset.text as string
    if (this.data.waiting) return

    this._sendMessage(text)
  },

  /** ===== 核心方法：发送消息并流式获取 AI 回复 ===== */
  async _sendMessage(text: string) {
    const { thinkingMode } = this.data

    // 1. 添加用户消息（同时生成 HTML 用于 rich-text 渲染）
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: text,
      contentHtml: markdownToHtml(text),
      timestamp: Date.now(),
    }

    // 2. 添加 assistant 占位（流式写入）
    const assistantId = `assist_${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      contentHtml: '',
      reasoning: '',
      reasoningHtml: '',
      showReasoning: false,
      timestamp: Date.now(),
      streaming: true,
      loading: true,
      thinkingMode,
    }

    const messages = [...this.data.messages, userMsg, assistantMsg]
    this.setData({ messages, waiting: true, hasChat: true })

    // 滚动到底部显示 loading
    this._scrollToBottom()

    try {
      // 3. 构造对话历史（取最近 20 条）
      const historyForApi = this.data.messages
        .concat(userMsg)
        .filter(m => m.role !== 'system' && !m.streaming)
        .slice(-20)
        .map(m => ({
          role: m.role,
          content: m.content,
        }))

      // 添加系统提示词
      const systemPrompt = thinkingMode
        ? '你是健雄书院智能助手，由 DeepSeek R1 驱动。请展示推理过程后给出回答。简洁、准确、友好。'
        : '你是健雄书院智能助手，由 DeepSeek 驱动。回答简洁、准确、友好。'

      historyForApi.unshift({ role: 'system', content: systemPrompt })

      // 4. 发起流式请求
      await this._streamChat(assistantId, historyForApi, thinkingMode)
    } catch (err: any) {
      // 5. 出错时更新消息
      const updated = this.data.messages.map(m => {
        if (m.id === assistantId) {
          const finalContent = m.content || `抱歉，AI 暂时无法回复。${err.message || '请稍后再试'}`
          return {
            ...m,
            loading: false,
            streaming: false,
            content: finalContent,
            contentHtml: markdownToHtml(finalContent),
          }
        }
        return m
      })
      this.setData({ messages: updated, waiting: false })
    }

    this._scrollToBottom()
  },

  /**
   * 流式聊天 — 使用 enableChunked 接收 SSE 流
   */
  _streamChat(
    assistantId: string,
    messages: any[],
    thinkingMode: boolean,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const token = getToken()
      if (!token) {
        reject(new Error('请先登录'))
        return
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
          // 流式响应结束时，标记完成并做最终渲染
          const updated = this.data.messages.map(m => {
            if (m.id === assistantId) {
              // 最终的 Markdown 渲染（确保所有标记完整闭合）
              const finalHtml = markdownToHtml(m.content || '')
              const finalReasoningHtml = markdownToHtml(m.reasoning || '')
              return {
                ...m,
                streaming: false,
                loading: false,
                contentHtml: finalHtml,
                reasoningHtml: finalReasoningHtml,
              }
            }
            return m
          })
          this.setData({ messages: updated, waiting: false })
          resolve()
        },
        fail: (err: any) => {
          reject(new Error(err.errMsg || '网络请求失败'))
        },
      })

      // 缓冲区：用于累积不完整的 SSE 行
      let buffer = ''

      // 监听分块数据
      // @ts-ignore: onChunkReceived is supported since base library 2.18.0
      requestTask.onChunkReceived((response: any) => {
        try {
          // UTF-8 解码 ArrayBuffer
          let chunkText = ''
          try {
            // 优先使用 TextDecoder API
            chunkText = new TextDecoder('utf-8').decode(response.data)
          } catch {
            // 降级：手动 UTF-8 解码
            const uint8Array = new Uint8Array(response.data)
            for (let i = 0; i < uint8Array.length;) {
              const b1 = uint8Array[i++]
              if (b1 < 0x80) {
                chunkText += String.fromCharCode(b1)
              } else if (b1 >= 0xC0 && b1 < 0xE0) {
                const b2 = uint8Array[i++]
                chunkText += String.fromCharCode(((b1 & 0x1F) << 6) | (b2 & 0x3F))
              } else if (b1 >= 0xE0 && b1 < 0xF0) {
                const b2 = uint8Array[i++]
                const b3 = uint8Array[i++]
                chunkText += String.fromCharCode(((b1 & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F))
              } else if (b1 >= 0xF0 && b1 < 0xF8) {
                const b2 = uint8Array[i++]
                const b3 = uint8Array[i++]
                const b4 = uint8Array[i++]
                chunkText += String.fromCodePoint(((b1 & 0x07) << 18) | ((b2 & 0x3F) << 12) | ((b3 & 0x3F) << 6) | (b4 & 0x3F))
              }
            }
          }

          buffer += chunkText

          // 按行解析 SSE 事件
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留不完整的行

          for (const line of lines) {
            if (typeof line !== 'string') continue
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const jsonStr = trimmed.slice(6)
            if (jsonStr === '[DONE]') continue

            try {
              const event = JSON.parse(jsonStr)
              this._handleSSEEvent(assistantId, event)
            } catch {
              // 忽略解析错误
            }
          }
        } catch {
          // 忽略解码错误
        }
      })
    })
  },

  /**
   * 处理 SSE 事件
   */
  _handleSSEEvent(assistantId: string, event: any) {
    const { messages } = this.data

    if (event.type === 'reasoning') {
      // 思考模式：追加推理内容
      const updated = messages.map(m => {
        if (m.id === assistantId) {
          const newReasoning = (m.reasoning || '') + (event.content || '')
          return {
            ...m,
            reasoning: newReasoning,
            reasoningHtml: markdownToHtml(newReasoning),
            loading: false,
            // 自动展开推理过程（仅首次）
            showReasoning: m.showReasoning !== false,
          }
        }
        return m
      })
      this.setData({ messages: updated })
      this._scrollToBottom()
    } else if (event.type === 'chunk') {
      // 常规内容：逐 token 追加
      const updated = messages.map(m => {
        if (m.id === assistantId) {
          const newContent = (m.content || '') + (event.content || '')
          return {
            ...m,
            content: newContent,
            contentHtml: markdownToHtml(newContent),
            loading: false,
          }
        }
        return m
      })
      this.setData({ messages: updated })
      this._scrollToBottom()
    } else if (event.type === 'error') {
      // 错误事件
      const updated = messages.map(m => {
        if (m.id === assistantId) {
          const newContent = (m.content || '') + `\n\n⚠️ ${event.message || '发生错误'}`
          return {
            ...m,
            content: newContent,
            contentHtml: markdownToHtml(newContent),
            loading: false,
          }
        }
        return m
      })
      this.setData({ messages: updated })
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
          this.setData({ messages: [], hasChat: false })
          wx.removeStorageSync('ai_chat_history')
          toast('已清除')
        }
      },
    })
  },

  /** ===== 滚动到底部 ===== */
  _scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('#chat-bottom')
        .scrollOffset((res: any) => {
          wx.pageScrollTo({
            scrollTop: res.scrollTop || 99999,
            duration: 100,
          })
        })
        .exec()
    }, 50)
  },
})
