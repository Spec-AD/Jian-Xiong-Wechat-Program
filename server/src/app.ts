import express from 'express'
import cors from 'cors'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import config from './config'
import { connectDatabase } from './config/db'
import { swaggerSpec } from './config/swagger'
import { requestLogger } from './middleware/logger'
import { errorHandler } from './middleware/errorHandler'
import routes from './routes'

const app = express()

// ============ 中间件注册 ============

// CORS 跨域
app.use(cors({
  origin: config.isDev ? '*' : ['https://your-domain.com'],
  credentials: true,
}))

// 请求体解析
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 请求日志
app.use(requestLogger)

// 静态文件（上传的文件）
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// Swagger 接口文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: '健雄书院 API 文档',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
  },
}))

// Swagger JSON 原始定义
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json(swaggerSpec)
})

// ============ 路由 ============

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
app.use('/api', routes)

// 404 处理
app.use((_req, res) => {
  res.status(404).json({
    code: 40400,
    message: '请求的资源不存在',
    data: null,
  })
})

// 统一错误处理
app.use(errorHandler)

// ============ 启动服务器 ============

async function start() {
  try {
    // 连接数据库
    await connectDatabase()

    // 启动 HTTP 服务
    app.listen(config.port, () => {
      console.log(`🚀 健雄书院 API 服务已启动`)
      console.log(`📡 地址: http://localhost:${config.port}`)
      console.log(`🔧 环境: ${config.env}`)
      console.log(`📚 API 基础路径: http://localhost:${config.port}/api`)
      console.log(`📖 API 文档:   http://localhost:${config.port}/api-docs`)    
    })
  } catch (error) {
    console.error('❌ 服务启动失败:', error)
    process.exit(1)
  }
}

start()

export default app
