/**
 * 种子数据脚本
 * 用于初始化开发环境的基础数据
 * 运行: npm run seed
 */

import mongoose from 'mongoose'
import path from 'path'
import config from '../config'
import logger from '../middleware/logger'
import { User } from '../models/user.model'
import { Work } from '../models/work.model'
import { Like } from '../models/like.model'
import resourceMap from './resource-map.json'

// ============ 资源映射辅助函数 ============

/** 扩展名 → Work type 映射 */
const extToWorkType: Record<string, 'video' | 'image' | 'doc'> = {
  '.mp4': 'video',
  '.mov': 'video',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.pdf': 'doc',
  '.xlsx': 'doc',
  '.md': 'doc',
}

/** 从文件名中提取学生姓名 */
function extractStudentName(filename: string): string {
  // 格式: 251510001-汪子扬.mp4 或 251880023-陈奕涵-1.jpg
  const match = filename.match(/^\d+-(.+?)(?:-\d+)?\.\w+$/)
  return match ? match[1].trim() : filename.replace(/\.[^.]+$/, '')
}

/** 根据文件名判断作品类型 */
function getWorkType(filename: string): 'video' | 'image' | 'doc' {
  const ext = path.extname(filename).toLowerCase()
  return extToWorkType[ext] || 'doc'
}

interface ResourceEntry {
  cosUrl: string
  type: string
  size: number
}

/** 从 resourceMap 生成所有 Work 文档 */
function buildWorkEntries(userId: mongoose.Types.ObjectId): Array<Record<string, unknown>> {
  const entries = resourceMap as Record<string, ResourceEntry>
  return Object.entries(entries).map(([filename, info]) => {
    const workType = getWorkType(filename)
    const studentName = extractStudentName(filename)
    return {
      userId,
      title: `${studentName}的成果作品`,
      description: '',
      type: workType,
      categoryId: workType,
      fileUrl: info.cosUrl,
      tags: [],
      status: 'published',
    }
  })
}

async function seed() {
  try {
    console.log('📦 开始初始化种子数据...')
    console.log(`🔗 连接数据库: ${config.mongodbUri.replace(/\/\/.*@/, '//***@')}`)

    await mongoose.connect(config.mongodbUri)
    console.log('✅ 数据库连接成功')

    // 清空现有数据（开发环境用）
    console.log('🗑️  清空现有数据...')
    await Promise.all([
      User.deleteMany({}),
      Work.deleteMany({}),
      Like.deleteMany({}),
    ])
    console.log('✅ 数据已清空')

    // ============ 创建测试用户 ============
    console.log('👤 创建测试用户...')

    const adminUser = await User.create({
      openid: 'test_admin_openid_001',
      nickName: '管理员',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
      role: 'admin',
      lastLoginAt: new Date(),
    })
    console.log(`   ✅ 管理员: ${adminUser.nickName}`)

    const testUser = await User.create({
      openid: 'test_student_openid_002',
      nickName: '张明远',
      avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4',
      role: 'student',
      lastLoginAt: new Date(),
    })
    console.log(`   ✅ 学生用户: ${testUser.nickName}`)

    // ============ 创建测试作品 ============
    console.log('📄 创建学生实践作品（从 COS 资源导入）...')

    const workEntries = buildWorkEntries(testUser._id)
    const works = await Work.create(workEntries)
    console.log(`   ✅ 创建了 ${works.length} 个学生作品`)

    // ============ 创建测试点赞 ============
    console.log('❤️  创建测试点赞数据...')

    const likes = []
    for (const work of works) {
      likes.push({
        userId: adminUser._id,
        workId: work._id,
      })
    }
    // testUser 为自己前3个作品点赞
    for (let i = 0; i < Math.min(3, works.length); i++) {
      likes.push({
        userId: testUser._id,
        workId: works[i]._id,
      })
    }

    await Like.create(likes)
    console.log(`   ✅ 创建了 ${likes.length} 条点赞记录`)

    // ============ 打印结果 ============
    console.log('\n=================================')
    console.log('📊  种子数据初始化完成！')
    console.log('=================================')
    console.log(`   👤 用户数: 2`)
    console.log(`   📄 作品数: ${works.length}（全部为真实 COS 资源）`)
    console.log(`   ❤️  点赞数: ${likes.length}`)
    console.log('=================================')
    console.log('\n🔑 测试登录 code（开发环境有效）:')
    console.log('   管理员: test_admin_openid_001')
    console.log('   学生:   test_student_openid_002')
    console.log('=================================\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error)
    process.exit(1)
  }
}

seed()
