/**
 * scripts/import-external-works.ts — 导入外链作品数据
 *
 * 使用方式：
 *   cd server
 *   CONFIRM_IMPORT=true npx ts-node src/scripts/import-external-works.ts
 *
 * 前置条件：
 *   - .env 中已配置 MONGODB_URI
 *   - 确保 userId 对应的用户存在于数据库中
 */

import mongoose from 'mongoose'
import { connectDatabase } from '../config/db'
import { Work } from '../models/work.model'
import '../models/user.model'

// 使用现有用户 ID（管理员账号）
const USER_ID = new mongoose.Types.ObjectId('6a02a193a5b99527246454ca')

const externalWorks = [
  {
    userId: USER_ID,
    title: '黄闵宇团队 · Canva设计作品',
    description: 'Canva（可画）平台设计作品',
    type: 'link' as const,
    categoryId: 'external',
    externalLink: 'https://www.canva.cn/design/DAHCIyYFRQU/MU4pH1yfhIrlYzPVhuB--Q/edit?utm_content=DAHCIyYFRQU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton',
    platform: 'Canva',
    fileUrl: '',
    cover: '',
    imageList: [],
    tags: ['Canva', '设计'],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '黄闵宇团队',
  },
  {
    userId: USER_ID,
    title: '周生瑞团队 · Bilibili视频',
    description: 'Bilibili（哔哩哔哩）平台视频作品',
    type: 'link' as const,
    categoryId: 'external',
    externalLink: 'https://b23.tv/xwCQyhk',
    platform: 'Bilibili',
    fileUrl: '',
    cover: '',
    imageList: [],
    tags: ['Bilibili', '视频'],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '周生瑞团队',
  },
  {
    userId: USER_ID,
    title: '陈曦团队 · 易企秀H5',
    description: '易企秀平台H5作品',
    type: 'link' as const,
    categoryId: 'external',
    externalLink: 'https://d.eqxiu.com/s/piPaIBKy?eip=true',
    platform: '易企秀',
    fileUrl: '',
    cover: '',
    imageList: [],
    tags: ['易企秀', 'H5'],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '陈曦团队',
  },
  {
    userId: USER_ID,
    title: '林思辰团队 · Bilibili视频',
    description: 'Bilibili（哔哩哔哩）平台视频作品',
    type: 'link' as const,
    categoryId: 'external',
    externalLink: 'https://www.bilibili.com/video/BV1mu6nBMEGx/?share_source=copy_web&vd_source=0395f44825145dbc6401ac28ac00bc73',
    platform: 'Bilibili',
    fileUrl: '',
    cover: '',
    imageList: [],
    tags: ['Bilibili', '视频'],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '林思辰团队',
  },
  {
    userId: USER_ID,
    title: '王永琳团队 · Bilibili视频',
    description: 'Bilibili（哔哩哔哩）平台视频作品',
    type: 'link' as const,
    categoryId: 'external',
    externalLink: 'https://www.bilibili.com/video/BV1rLfFBEEPE/?spm_id_from=333.1387.homepage.video_card.click&vd_source=14254fb70aed91f4954b8589c5f6e9cd',
    platform: 'Bilibili',
    fileUrl: '',
    cover: '',
    imageList: [],
    tags: ['Bilibili', '视频'],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '王永琳团队',
  },
  {
    userId: USER_ID,
    title: '吕竹青团队 · 个人页面',
    description: '腾讯云开发个人页面作品',
    type: 'link' as const,
    categoryId: 'external',
    externalLink: 'https://shiroku-h5-2026-9gg2omkbe1c6993f-1419976808.tcloudbaseapp.com/jianxiong_h5_project/',
    platform: '腾讯云开发个人页面',
    fileUrl: '',
    cover: '',
    imageList: [],
    tags: ['腾讯云', '个人页面'],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '吕竹青团队',
  },
]

async function main() {
  console.log('============================================')
  console.log('  导入外链作品数据')
  console.log('============================================\n')

  // ── 1. 连接数据库 ──
  console.log('📡 连接数据库...')
  await connectDatabase()
  console.log('✅ 数据库已连接\n')

  // ── 2. 确认用户存在 ──
  const user = await mongoose.model('User').findById(USER_ID)
  if (!user) {
    console.error(`❌ 用户 ${USER_ID} 不存在！请先创建用户或使用正确的 userId。`)
    process.exit(1)
  }
  console.log(`✅ 用户验证通过: ${(user as any).nickName || USER_ID}\n`)

  // ── 3. 预览待插入数据 ──
  console.log('📋 待导入外链作品：')
  for (const work of externalWorks) {
    console.log(`   ├─ ${work.title}`)
    console.log(`   │  作者: ${work.actualAuthor}`)
    console.log(`   │  平台: ${work.platform}`)
    console.log(`   │  链接: ${work.externalLink.slice(0, 60)}...`)
    console.log(`   └─`)
  }

  const CONFIRM = process.env.CONFIRM_IMPORT === 'true'

  if (!CONFIRM) {
    console.log('\n⚠️  预览模式，未实际执行。')
    console.log('   设置环境变量 CONFIRM_IMPORT=true 以执行导入:')
    console.log('   CONFIRM_IMPORT=true npx ts-node src/scripts/import-external-works.ts\n')
    process.exit(0)
  }

  // ── 4. 先检查是否已存在，避免重复导入 ──
  const existingCount = await Work.countDocuments({ type: 'link', categoryId: 'external' })
  if (existingCount > 0) {
    console.log(`\n⚠️  数据库中已存在 ${existingCount} 个外链作品（type=link, categoryId=external）`)
    console.log('   如需重新导入，请先清除已有数据。')
    // 询问是否继续
    console.log('   继续执行将追加导入...\n')
  }

  // ── 5. 执行插入 ──
  console.log('🚀 开始导入...')

  for (const workData of externalWorks) {
    try {
      const work = await Work.create(workData)
      console.log(`   ✅ 导入成功: ${work.title} (ID: ${work._id})`)
    } catch (err: any) {
      console.error(`   ❌ 导入失败: ${workData.title}`, err.message || err)
    }
  }

  // ── 6. 验证 ──
  const total = await Work.countDocuments()
  const externalTotal = await Work.countDocuments({ type: 'link', categoryId: 'external' })
  console.log(`\n📊 当前作品总数: ${total}`)
  console.log(`   其中外链作品: ${externalTotal} 个`)

  const inserted = await Work.find({ type: 'link', categoryId: 'external' })
    .sort({ createdAt: -1 })
    .lean()

  console.log(`\n📋 已导入的外链作品列表：`)
  for (const w of inserted) {
    console.log(`   ├─ ${w.title}`)
    console.log(`   │  作者: ${w.actualAuthor} | 平台: ${w.platform}`)
    console.log(`   └─`)
  }

  console.log('\n✅ 导入完成！')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
