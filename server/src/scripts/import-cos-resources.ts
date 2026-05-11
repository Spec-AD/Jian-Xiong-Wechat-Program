/**
 * scripts/import-cos-resources.ts — 将 COS 已有资源批量导入为 Work 作品
 *
 * 功能：
 *   列取 COS 存储桶 resources/ 目录下的所有文件，逐一创建 Work 记录
 *   首次运行全量导入，再次运行自动跳过已导入的文件（按 fileUrl 去重）
 *
 * 使用方式：
 *   cd server
 *   npx ts-node src/scripts/import-cos-resources.ts
 *
 * 前置条件：
 *   - .env 中已配置 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION
 *   - .env 中已配置 MONGODB_URI
 *   - 需要先在 MongoDB 中有一个管理员用户（用于作为作品作者）
 *     可在脚本中指定 ADMIN_OPENID 或直接运行后手动修改
 *
 * 安全提示：
 *   此脚本会连接到数据库并创建大量记录，建议先在测试环境验证
 */

import { connectDatabase } from '../config/db'
import config from '../config'
import { importCosObjectsAsWorks, listCosObjects, isCosConfigured } from '../services/cos.service'
import { User } from '../models/user.model'

/** 指定将资源导入到哪位管理员用户的名下 */
// 方式一：通过环境变量指定管理员 openid
const ADMIN_OPENID = process.env.IMPORT_ADMIN_OPENID || ''
// 方式二：如果未指定，使用数据库中的第一个管理员用户
const FALLBACK_TO_FIRST_ADMIN = true

async function main() {
  console.log('============================================')
  console.log('  COS 资源 → Work 作品 批量导入工具')
  console.log('============================================\n')

  // ── 1. 检查 COS 配置 ──
  if (!isCosConfigured()) {
    console.error('❌ COS 未配置，请在 .env 中设置 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET')
    process.exit(1)
  }
  console.log('✅ COS 已配置')
  console.log(`   存储桶: ${config.cos.bucket}`)
  console.log(`   区域:   ${config.cos.region}`)
  console.log()

  // ── 2. 连接数据库 ──
  console.log('📡 连接数据库...')
  await connectDatabase()
  console.log('✅ 数据库已连接\n')

  // ── 3. 查找管理员用户 ──
  let adminUser: any = null

  if (ADMIN_OPENID) {
    adminUser = await User.findOne({ openid: ADMIN_OPENID })
    if (adminUser) {
      console.log(`✅ 使用指定管理员: ${adminUser.nickName || adminUser.openid} (${adminUser._id})`)
    } else {
      console.warn(`⚠️ 未找到 openid 为 "${ADMIN_OPENID}" 的用户`)
    }
  }

  if (!adminUser && FALLBACK_TO_FIRST_ADMIN) {
    adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 })
    if (adminUser) {
      console.log(`✅ 使用首个管理员用户: ${adminUser.nickName || adminUser.openid} (${adminUser._id})`)
    }
  }

  if (!adminUser) {
    // 使用任意用户（降级方案）
    adminUser = await User.findOne().sort({ createdAt: 1 })
    if (adminUser) {
      console.warn(`⚠️ 未找到管理员用户，使用首个用户: ${adminUser.nickName || adminUser._id}`)
      console.warn('   建议后续在管理后台修改作品作者')
    }
  }

  if (!adminUser) {
    console.error('❌ 数据库中没有任何用户，请先通过小程序登录创建用户')
    process.exit(1)
  }

  // ── 4. 列出所有 COS 资源 ──
  console.log('\n📂 正在列取 COS 资源...')
  const prefix = 'resources/'

  let allObjects: any[] = []
  let marker: string | undefined = undefined

  do {
    const result = await listCosObjects(prefix, 1000, marker)
    allObjects = allObjects.concat(result.objects)
    marker = result.nextMarker
    console.log(`   已获取 ${allObjects.length} 个文件...`)
  } while (marker)

  if (allObjects.length === 0) {
    console.log('\n⚠️  COS 中没有找到资源文件')
    console.log(`   请检查前缀 "${prefix}" 是否正确`)
    console.log(`   确认路径: https://${config.cos.bucket}.cos.${config.cos.region}.myqcloud.com/${prefix}`)
    process.exit(0)
  }

  console.log(`\n📊 共发现 ${allObjects.length} 个资源文件`)

  // 按类型统计
  const typeStats: Record<string, number> = {}
  for (const obj of allObjects) {
    const ext = obj.ext.replace('.', '') || 'unknown'
    typeStats[ext] = (typeStats[ext] || 0) + 1
  }
  console.log('   类型分布:')
  for (const [ext, count] of Object.entries(typeStats)) {
    console.log(`     .${ext}: ${count} 个`)
  }

  // ── 5. 确认导入 ──
  console.log('\n⚠️  即将导入以下资源到作品数据库:')
  allObjects.slice(0, 10).forEach(obj => {
    console.log(`   📄 ${obj.key} (${(obj.size / 1024).toFixed(1)} KB)`)
  })
  if (allObjects.length > 10) {
    console.log(`   ... 还有 ${allObjects.length - 10} 个文件`)
  }

  // 非交互模式（直接导入）
  const objectKeys = allObjects.map(obj => obj.key)

  console.log('\n🚀 开始导入...')
  const result = await importCosObjectsAsWorks(objectKeys, adminUser._id.toString())

  console.log('\n============================================')
  console.log('  📊 导入结果')
  console.log('============================================')
  console.log(`   总计:     ${allObjects.length} 个文件`)
  console.log(`   ✅ 导入:   ${result.imported} 个`)
  console.log(`   ⏭ 跳过:   ${result.skipped} 个（已存在）`)
  console.log(`   ❌ 失败:   ${result.errors.length} 个`)

  if (result.errors.length > 0) {
    console.log('\n   失败详情:')
    result.errors.forEach((err, i) => {
      console.log(`     ${i + 1}. ${err}`)
    })
  }

  console.log('\n============================================')
  console.log('  ✅ 导入完成！')
  console.log('============================================')
  console.log()
  console.log('💡 接下来可以在小程序管理后台中:')
  console.log('   1. 查看已导入的作品列表 → 管理后台 → 作品管理')
  console.log('   2. 编辑作品标题、描述等信息')
  console.log('   3. 设置 Banner 推荐作品')
  console.log()

  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
