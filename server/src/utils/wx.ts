import axios from 'axios'
import config from '../config'
import { WxLoginResult } from '../types'
import logger from '../middleware/logger'

/**
 * 微信登录
 * 使用前端传来的 code 换取 openid 和 session_key
 */
export async function wxLogin(code: string): Promise<WxLoginResult> {
  try {
    const response = await axios.get<WxLoginResult>(config.wxLoginUrl, {
      params: {
        appid: config.wxAppId,
        secret: config.wxSecret,
        js_code: code,
        grant_type: 'authorization_code',
      },
      timeout: 5000,
    })

    const result = response.data

    // 微信返回错误
    if (result.errcode) {
      logger.error('微信登录接口返回错误', {
        errcode: result.errcode,
        errmsg: result.errmsg,
      })
      throw new Error(`微信登录失败: ${result.errmsg || '未知错误'}`)
    }

    return result
  } catch (error: any) {
    if (error instanceof Error && error.message.startsWith('微信登录失败')) {
      throw error
    }
    logger.error('调用微信登录接口异常', {
      message: error.message,
      code,
    })
    throw new Error('微信登录服务异常，请稍后重试')
  }
}

/**
 * 生成默认昵称
 * 基于 openid 后四位生成唯一但无意义的昵称
 */
export function generateDefaultNickName(openid: string): string {
  const suffix = openid.slice(-4).toUpperCase()
  return `建雄用户_${suffix}`
}
