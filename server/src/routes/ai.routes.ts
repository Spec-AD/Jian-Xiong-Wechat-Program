/**
 * routes/ai.routes.ts — AI 对话路由
 */

import { Router } from 'express'
import * as aiController from '../controllers/ai.controller'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// — 公开接口（无需登录）—

/**
 * POST /api/ai/config/key — 设置 API Key（开发/演示用）
 * Body: { apiKey: string }
 */
router.post('/config/key', aiController.setApiKey)

/**
 * GET /api/ai/config/status — 获取 AI 配置状态
 */
router.get('/config/status', aiController.getConfigStatus)

// — 需登录的接口 —

/**
 * POST /api/ai/chat — 流式对话
 * Body: { messages: { role, content }[], thinkingMode?: boolean }
 * 响应：SSE 流
 */
router.post('/chat', authMiddleware, aiController.chat)

export default router
