/**
 * 种子数据脚本
 * 用于初始化开发环境的基础数据
 * 运行: npm run seed
 */

import mongoose from 'mongoose'
import config from '../config'
import logger from '../middleware/logger'
import { User } from '../models/user.model'
import { Work } from '../models/work.model'
import { Like } from '../models/like.model'

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
    console.log('📄 创建测试作品...')

    const works = await Work.create([
      {
        userId: testUser._id,
        title: '苏北支教社会实践纪录片',
        description: '暑期赴苏北农村支教的社会实践记录，包含课堂教学、家访调研、乡村文化活动等内容。通过镜头记录大学生与乡村孩子的温暖互动，展现当代青年的社会责任感。',
        type: 'video',
        categoryId: 'video',
        fileUrl: 'https://example.com/videos/teaching-doc.mp4',
        cover: 'https://picsum.photos/seed/work1/400/300',
        tags: ['志愿', '支教', '社会实践'],
        isBanner: true,
        views: 201,
        likesCount: 37,
        status: 'published',
      },
      {
        userId: testUser._id,
        title: '量子计算入门学习笔记',
        description: '系统梳理量子计算核心概念，包括量子比特、量子门、量子纠缠、量子算法等。适合计算机专业学生入门参考。',
        type: 'doc',
        categoryId: 'doc',
        fileUrl: 'https://example.com/docs/quantum-computing.pdf',
        cover: 'https://picsum.photos/seed/work2/400/300',
        imageList: [
          'https://picsum.photos/seed/qc1/800/600',
          'https://picsum.photos/seed/qc2/800/600',
        ],
        tags: ['学术', '计算机', '量子计算'],
        isBanner: true,
        views: 156,
        likesCount: 28,
        status: 'published',
      },
      {
        userId: testUser._id,
        title: '校园春景摄影集',
        description: '用镜头捕捉校园春日的美好瞬间，包含花开、绿叶、晨光、黄昏等多个主题。',
        type: 'image',
        categoryId: 'image',
        cover: 'https://picsum.photos/seed/work3/400/300',
        imageList: [
          'https://picsum.photos/seed/spring1/800/600',
          'https://picsum.photos/seed/spring2/800/600',
          'https://picsum.photos/seed/spring3/800/600',
          'https://picsum.photos/seed/spring4/800/600',
        ],
        tags: ['摄影', '校园', '春日'],
        views: 89,
        likesCount: 15,
        status: 'published',
      },
      {
        userId: testUser._id,
        title: '《活着》读书分享',
        description: '余华《活着》的深度阅读分享，探讨生命的意义与韧性。包含个人感悟、关键情节分析和现实启示。',
        type: 'doc',
        categoryId: 'doc',
        cover: 'https://picsum.photos/seed/work4/400/300',
        tags: ['阅读', '文学', '感悟'],
        views: 67,
        likesCount: 12,
        status: 'published',
      },
      {
        userId: testUser._id,
        title: '校园民谣弹唱《南山南》',
        description: '在校园草坪上弹唱马頔的《南山南》，记录大学时光的美好回忆。',
        type: 'audio',
        categoryId: 'audio',
        fileUrl: 'https://example.com/audio/nanshannan.mp3',
        cover: 'https://picsum.photos/seed/work5/400/300',
        tags: ['音乐', '弹唱', '校园'],
        views: 312,
        likesCount: 45,
        status: 'published',
      },
      {
        userId: adminUser._id,
        title: '2024年书院迎新晚会精彩回顾',
        description: '2024年健雄书院迎新晚会全程记录，包含节目表演、互动游戏、校长致辞等精彩环节。',
        type: 'video',
        categoryId: 'video',
        fileUrl: 'https://example.com/videos/welcome-party.mp4',
        cover: 'https://picsum.photos/seed/work6/400/300',
        tags: ['活动', '迎新', '晚会'],
        isBanner: true,
        views: 523,
        likesCount: 78,
        status: 'published',
      },
    ])
    console.log(`   ✅ 创建了 ${works.length} 个测试作品`)

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
    console.log(`   📄 作品数: ${works.length}`)
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
