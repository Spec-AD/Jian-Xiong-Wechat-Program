import winston from 'winston'
import config from '../config'

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`
  }),
)

// 创建 logger 实例
const logger = winston.createLogger({
  level: config.isDev ? 'debug' : 'info',
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat,
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // 综合日志文件
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
})

export default logger

/**
 * Express 请求日志中间件
 */
export function requestLogger(req: any, _res: any, next: any) {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    body: config.isDev ? req.body : undefined,
  })
  next()
}
