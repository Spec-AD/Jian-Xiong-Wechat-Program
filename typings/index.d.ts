/// <reference path="./types/index.d.ts" />

/**
 * 应用内统一使用的用户信息类型。
 * 只保留微信新规实际可获取的字段（头像 + 昵称），
 * 避免与完整 WechatMiniprogram.UserInfo 的字段冲突。
 */
interface AppUserInfo {
  avatarUrl: string
  nickName: string
}

/** 全局 App 选项类型 */
interface IAppOption {
  globalData: {
    userInfo: AppUserInfo | null
    openid: string
    loginCode: string
    baseUrl: string
  }
  saveUserInfo(info: AppUserInfo): void
  clearUserInfo(): void
}

