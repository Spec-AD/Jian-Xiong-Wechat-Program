/**
 * controllers/ai.controller.ts — DeepSeek AI 流式对话
 *
 * 功能：
 *  - 代理 DeepSeek API，支持流式 SSE 输出
 *  - 支持常规模式（deepseek-chat）和思考模式（deepseek-reasoner）
 *  - 将 DeepSeek 返回的 SSE 事件解析后，以简化 JSON 行格式推送到前端
 */

import { Response } from 'express'
import { AuthRequest } from '../types'
import { AppError } from '../middleware/errorHandler'
import { fail } from '../utils/response'
import config from '../config'
import axios from 'axios'

/**
 * POST /api/ai/chat — 流式对话
 *
 * Body:
 *   messages: { role: string; content: string }[]
 *   thinkingMode: boolean (可选，默认 false)
 *
 * 响应：SSE (text/event-stream)
 *   每行一个 JSON：{"type":"chunk","content":"..."}
 *   结束时：{"type":"done"}
 *   错误时：{"type":"error","message":"..."}
 *   思考模式时，会先发送 reasoning 片段再发送 content
 */
export async function chat(req: AuthRequest, res: Response): Promise<void> {
  const { messages, thinkingMode } = req.body

  // === 参数校验 ===
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    fail(res, 40001, '请提供有效的消息列表')
    return
  }

  const apiKey = config.deepseek.apiKey
  if (!apiKey) {
    fail(res, 40002, 'DeepSeek API 密钥未配置，请在 .env 中设置 DEEPSEEK_API_KEY')
    return
  }

  const model = thinkingMode
    ? config.deepseek.reasonerModel   // deepseek-reasoner（含推理过程）
    : config.deepseek.chatModel       // deepseek-chat（快速对话）

  // === 设置 SSE 响应头 ===
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

  // === 构建请求到 DeepSeek ===
  try {
    // 如果是思考模式，添加 system prompt 鼓励展示推理过程
    const apiMessages = [...messages]
    if (thinkingMode) {
      // 确保第一条是 system prompt
      const hasSystem = apiMessages.some(m => m.role === 'system')
      if (!hasSystem) {
        apiMessages.unshift({
          role: 'system',
          content: '你是健雄书院智能助手，由 DeepSeek R1 驱动。请先展示你的推理思考过程（用 思考 标签包裹），然后给出最终回答。回答应当简洁、准确、友好。',
        })
      }
    }

    // 调用 DeepSeek API（流式）
    const response = await axios.post(
      config.deepseek.apiUrl,
      {
        model,
        messages: apiMessages,
        stream: true,
        max_tokens: 4096,
        temperature: thinkingMode ? 0.6 : 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        responseType: 'stream',
        timeout: 60000,
      },
    )

    // === 解析 SSE 流 ===
    let buffer = ''
    let reasoningContent = ''
    let contentContent = ''
    let isFinished = false

    response.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')

      // 按行分割
      const lines = buffer.split('\n')
      // 最后一个可能是未完成的行，保留
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()

        // 跳过空行
        if (!trimmed) continue

        // SSE 数据行：data: {...}
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6)

          // 结束标记
          if (jsonStr === '[DONE]') {
            isFinished = true
            res.write(`data: {"type":"done"}\n\n`)
            return
          }

          try {
            const parsed = JSON.parse(jsonStr)
            const delta = parsed.choices?.[0]?.delta

            if (!delta) continue

            // DeepSeek-reasoner 返回的推理内容
            if (delta.reasoning_content) {
              reasoningContent += delta.reasoning_content
              res.write(`data: ${JSON.stringify({ type: 'reasoning', content: delta.reasoning_content })}\n\n`)
            }

            // 常规内容
            if (delta.content) {
              contentContent += delta.content
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta.content })}\n\n`)
            }
          } catch {
            // 忽略解析错误（可能是不完整的行）
          }
        }
      }
    })

    // 流结束
    response.data.on('end', () => {
      if (!isFinished) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      }
      res.end()
    })

    // 流错误
    response.data.on('error', (err: Error) => {
      console.error('[AI] DeepSeek 流错误:', err.message)
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI 响应中断' })}\n\n`)
      res.end()
    })

    // 客户端断开连接时，终止请求
    req.on('close', () => {
      response.data.destroy()
    })
  } catch (err: any) {
    console.error('[AI] DeepSeek API 调用失败:', err.message)
    // 如果已经发送了 SSE 头，用 SSE 格式返回错误
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'AI 服务调用失败' })}\n\n`)
      res.end()
    } else {
      fail(res, 50000, `AI 服务调用失败: ${err.message}`)
    }
  }
}

/**
 * POST /api/ai/config/key — 设置 DeepSeek API Key（临时运行态）
 * 仅开发/演示用，生产环境请使用 .env
 */
export async function setApiKey(req: AuthRequest, res: Response): Promise<void> {
  const { apiKey } = req.body
  if (!apiKey || typeof apiKey !== 'string') {
    fail(res, 40001, '请提供有效的 API Key')
    return
  }

  // 写入内存（仅当前进程有效，重启后失效）
  // @ts-ignore 运行时修改 config
  config.deepseek.apiKey = apiKey

  res.json({
    code: 0,
    message: 'API Key 设置成功（当前会话有效）',
    data: null,
  })
}

/**
 * GET /api/ai/config/status — 获取 AI 配置状态
 */
export async function getConfigStatus(_req: AuthRequest, res: Response): Promise<void> {
  res.json({
    code: 0,
    message: 'ok',
    data: {
      hasApiKey: !!config.deepseek.apiKey && config.deepseek.apiKey !== 'your_deepseek_api_key_here',
      chatModel: config.deepseek.chatModel,
      reasonerModel: config.deepseek.reasonerModel,
    },
  })
}
