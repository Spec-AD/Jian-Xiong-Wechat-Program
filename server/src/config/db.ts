import mongoose from 'mongoose'
import config from './index'
import logger from '../middleware/logger'

/**
 * 连接 MongoDB 数据库
 */
export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true)

    await mongoose.connect(config.mongodbUri, {
      // Mongoose 8.x 默认使用新的连接选项，无需额外配置
    })

    logger.info('✅ MongoDB 连接成功', {
      uri: config.mongodbUri.replace(/\/\/.*@/, '//***@'), // 隐藏密码
    })

    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB 连接错误', err)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB 断开连接')
    })

  } catch (error) {
    logger.error('❌ MongoDB 连接失败', error)
    process.exit(1)
  }
}

/**
 * 关闭数据库连接（用于优雅退出）
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
  logger.info('MongoDB 连接已关闭')
}
