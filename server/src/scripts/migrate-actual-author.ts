/**
 * scripts/migrate-actual-author.ts — 为已有作品补充 actualAuthor 字段
 *
 * 功能：
 *   为 MongoDB 中所有缺少 `actualAuthor` 字段的作品文档补充该字段，
 *   使其与 model Schema 中的定义保持一致。
 *
 * 使用方式：
 *   cd server
 *   npx ts-node src/scripts/migrate-actual-author.ts
 *
 * 前置条件：
 *   - .env 中已配置 MONGODB_URI
 */

import { connectDatabase } from '../config/db'
import { Work } from '../models/work.model'

async function main() {
  console.log('============================================')
  console.log('  为已有作品补充 actualAuthor 字段')
  console.log('============================================\n')

  // ── 1. 连接数据库 ──
  console.log('📡 连接数据库...')
  await connectDatabase()
  console.log('✅ 数据库已连接\n')

  // ── 2. 查询缺失 actualAuthor 字段的作品 ──
  console.log('🔍 扫描缺少 actualAuthor 字段的作品...')

  // 方式一：通过 $exists 查询明确的字段缺失
  //        在 Mongoose 中，即使用 default 值存储了 ''，字段也可能存在
  //        所以需要检查字段不存在，或者字段值为 null
  const missingFieldWorks = await Work.find({
    $or: [
      { actualAuthor: { $exists: false } },
      { actualAuthor: null },
    ],
  }).lean()

  console.log(`   共找到 ${missingFieldWorks.length} 个作品缺少 actualAuthor 字段\n`)

  if (missingFieldWorks.length === 0) {
    console.log('✅ 所有作品已包含 actualAuthor 字段，无需迁移！')
    process.exit(0)
  }

  // ── 3. 预览 ──
  console.log('📋 待更新作品列表：')
  for (const work of missingFieldWorks.slice(0, 10)) {
    console.log(`   ├─ ${work._id}  「${work.title}」`)
  }
  if (missingFieldWorks.length > 10) {
    console.log(`   └─ ...还有 ${missingFieldWorks.length - 10} 个`)
  }

  const CONFIRM = process.env.CONFIRM_MIGRATE === 'true'

  if (!CONFIRM) {
    console.log('\n⚠️  预览模式，未实际执行。')
    console.log('   设置环境变量 CONFIRM_MIGRATE=true 以执行迁移:')
    console.log('   CONFIRM_MIGRATE=true npx ts-node src/scripts/migrate-actual-author.ts\n')
    process.exit(0)
  }

  // ── 4. 执行更新 ──
  console.log('\n🚀 开始补充 actualAuthor 字段...')

  const result = await Work.updateMany(
    {
      $or: [
        { actualAuthor: { $exists: false } },
        { actualAuthor: null },
      ],
    },
    {
      $set: { actualAuthor: '' },
    },
  )

  console.log(`   ✅ 成功更新 ${result.modifiedCount} 个作品`)
  console.log(`   📊 匹配条件: ${result.matchedCount} 个，实际修改: ${result.modifiedCount} 个\n`)

  // ── 5. 验证 ──
  const remaining = await Work.countDocuments({
    $or: [
      { actualAuthor: { $exists: false } },
      { actualAuthor: null },
    ],
  })
  if (remaining === 0) {
    console.log('✅ 迁移完成！所有作品均已包含 actualAuthor 字段。')
  } else {
    console.log(`⚠️  仍有 ${remaining} 个作品缺失 actualAuthor 字段，请检查原因。`)
  }

  console.log()
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
