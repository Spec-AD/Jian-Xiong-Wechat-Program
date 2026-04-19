/// <reference path="./types/index.d.ts" />

/** 全局 App 选项类型 */
interface IAppOption {
  globalData: {
    userInfo: WechatMiniprogram.UserInfo | null
    openid: string
    loginCode: string
    baseUrl: string
  }
  saveUserInfo(info: WechatMiniprogram.UserInfo): void
  clearUserInfo(): void
}

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}