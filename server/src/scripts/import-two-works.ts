/**
 * scripts/import-two-works.ts — 导入两份 PDF 作品数据
 *
 * 使用方式：
 *   cd server
 *   npx ts-node src/scripts/import-two-works.ts
 *
 * 前置条件：
 *   - .env 中已配置 MONGODB_URI
 *   - 确保 userId 对应的用户存在于数据库中
 */

import mongoose from 'mongoose'
import { connectDatabase } from '../config/db'
import { Work } from '../models/work.model'
import '../models/user.model'

// 参考现有数据的 userId（使用已有的用户 ID）
const USER_ID = new mongoose.Types.ObjectId('6a02a193a5b99527246454ca')

const worksToInsert = [
  {
    userId: USER_ID,
    title: '刘俊杰的成果作品',
    description: '',
    type: 'doc' as const,
    categoryId: 'doc',
    fileUrl: 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/251880057-%E5%88%98%E4%BF%8A%E6%9D%B0_20260512170458.pdf',
    cover: 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/Screenshot%202026-05-12%20171201.png',
    imageList: [],
    tags: [],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '刘俊杰',
  },
  {
    userId: USER_ID,
    title: '仲效慷的成果作品',
    description: '',
    type: 'doc' as const,
    categoryId: 'doc',
    fileUrl: 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/251880275-%E4%BB%B2%E6%95%88%E6%85%B7_20260512170848.pdf',
    cover: 'https://jianxiong-public-assets-1406049668.cos.ap-nanjing.myqcloud.com/resources/Screenshot%202026-05-12%20171229.png',
    imageList: [],
    tags: [],
    isBanner: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    status: 'published' as const,
    actualAuthor: '仲效慷',
  },
]

async function main() {
  console.log('============================================')
  console.log('  导入两份 PDF 作品数据')
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
  console.log('📋 待导入作品：')
  for (const work of worksToInsert) {
    console.log(`   ├─ ${work.title}`)
    console.log(`   │  作者: ${work.actualAuthor}`)
    console.log(`   │  类型: ${work.type}`)
    console.log(`   │  fileUrl: ${work.fileUrl.slice(0, 60)}...`)
    console.log(`   │  cover: ${work.cover.slice(0, 60)}...`)
    console.log(`   └─`)
  }

  const CONFIRM = process.env.CONFIRM_IMPORT === 'true'

  if (!CONFIRM) {
    console.log('\n⚠️  预览模式，未实际执行。')
    console.log('   设置环境变量 CONFIRM_IMPORT=true 以执行导入:')
    console.log('   CONFIRM_IMPORT=true npx ts-node src/scripts/import-two-works.ts\n')
    process.exit(0)
  }

  // ── 4. 执行插入 ──
  console.log('\n🚀 开始导入...')

  for (const workData of worksToInsert) {
    try {
      const work = await Work.create(workData)
      console.log(`   ✅ 导入成功: ${work.title} (ID: ${work._id})`)
    } catch (err: any) {
      console.error(`   ❌ 导入失败: ${workData.title}`, err.message || err)
    }
  }

  // ── 5. 验证 ──
  const total = await Work.countDocuments()
  console.log(`\n📊 当前作品总数: ${total}`)

  const inserted = await Work.find({
    actualAuthor: { $in: ['刘俊杰', '仲效慷'] },
  }).lean()

  console.log(`   本次导入成功: ${inserted.length} 个`)
  for (const w of inserted) {
    console.log(`   ├─ ${w.title} (${w.actualAuthor})`)
  }

  console.log('\n✅ 导入完成！')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
