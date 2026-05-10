/**
 * 创建管理员账号脚本
 * 运行: npx ts-node src/scripts/create-admin.ts
 * 
 * 功能：
 *   1. 在 MongoDB 中创建一个管理员用户
 *   2. 生成有效的 JWT Token
 *   3. 输出可直接用于 API 测试的信息
 */

import mongoose from 'mongoose'
import config from '../config'
import { User } from '../models/user.model'
import { generateToken } from '../utils/jwt'

async function createAdmin() {
  try {
    console.log('🔗 连接数据库...')
    await mongoose.connect(config.mongodbUri)
    console.log('✅ 数据库连接成功\n')

    // 检查是否已存在管理员
    let admin = await User.findOne({ role: 'admin' })

    if (admin) {
      console.log(`👤 已有管理员账号:`)
      console.log(`   ID:       ${admin._id}`)
      console.log(`   昵称:     ${admin.nickName}`)
      console.log(`   openid:   ${admin.openid}`)
      console.log(`   角色:     ${admin.role}`)
    } else {
      // 创建新的管理员
      admin = await User.create({
        openid: `admin_${Date.now()}`,
        nickName: '系统管理员',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
        role: 'admin',
        lastLoginAt: new Date(),
      })
      console.log(`✅ 管理员账号创建成功:`)
      console.log(`   ID:       ${admin._id}`)
      console.log(`   昵称:     ${admin.nickName}`)
      console.log(`   openid:   ${admin.openid}`)
      console.log(`   角色:     ${admin.role}`)
    }

    // 生成 JWT Token
    const token = generateToken({
      id: admin._id.toString(),
      openid: admin.openid,
      role: admin.role,
    })

    console.log(`\n=================================`)
    console.log(`🔑  JWT Token`)
    console.log(`=================================`)
    console.log(`\n${token}\n`)
    console.log(`=================================`)
    console.log(`📋  API 测试方式`)
    console.log(`=================================`)
    console.log(`\n请求头:`)
    console.log(`   Authorization: Bearer ${token.slice(0, 40)}...`)
    console.log(`\n示例 (curl):`)
    console.log(`   curl -H "Authorization: Bearer ${token.slice(0, 50)}..." http://localhost:3000/api/auth/verify`)
    console.log(`\n📱 小程序登录 openid（开发用）:`)
    console.log(`   ${admin.openid}`)
    console.log(`\n=================================\n`)

    process.exit(0)
  } catch (error) {
    console.error('❌ 创建管理员失败:', error)
    process.exit(1)
  }
}

createAdmin()
