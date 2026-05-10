import dotenv from 'dotenv'
import path from 'path'

// 加载 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const config = {
  // 服务端口
  port: parseInt(process.env.PORT || '3000', 10),

  // 运行环境
  env: process.env.NODE_ENV || 'development',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jianxiong',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // 微信小程序
  wxAppId: process.env.WX_APPID || '',
  wxSecret: process.env.WX_SECRET || '',
  wxLoginUrl: 'https://api.weixin.qq.com/sns/jscode2session',

  // 腾讯云 COS
  cos: {
    secretId: process.env.COS_SECRET_ID || '',
    secretKey: process.env.COS_SECRET_KEY || '',
    bucket: process.env.COS_BUCKET || '',
    region: process.env.COS_REGION || 'ap-nanjing',
  },

  // DeepSeek AI
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    apiUrl: 'https://api.deepseek.com/chat/completions',
    // 常规对话模型（快速响应）
    chatModel: 'deepseek-chat',
    // 思考模式模型（展示推理过程）
    reasonerModel: 'deepseek-reasoner',
  },

  // 是否开发模式
  get isDev(): boolean {
    return this.env === 'development'
  },

  // 是否生产模式
  get isProd(): boolean {
    return this.env === 'production'
  },
}

export default config
