/**
 * scripts/merge-works.ts — 合并重复作品数据修复脚本
 *
 * 问题背景：
 *   import-cos-resources.ts 导入脚本将 COS 上的每个文件独立创建为一个 Work，
 *   导致属于同一作品的多张图片被分散到多个 Work 记录中。
 *   例如"陈奕涵的成果作品 (1).jpg" → Work A，"陈奕涵的成果作品 (2).jpg" → Work B
 *
 * 本脚本功能：
 *   1. 按"基础标题 + userId"分组（基础标题 = 去除末尾编号后缀）
 *   2. 将同组所有作品的 imageList 合并到第一个（最老）作品
 *   3. 删除重复作品
 *   4. 更新作者引用（从管理账号改为标题中指定的人）
 *
 * 使用方式：
 *   cd server
 *   npx ts-node src/scripts/merge-works.ts
 *
 * 前置条件：
 *   - .env 中已配置 MONGODB_URI
 */

import { connectDatabase } from '../config/db'
import { Work } from '../models/work.model'
import { User } from '../models/user.model'
import { Like } from '../models/like.model'

/**
 * 从标题中提取"基础标题"（去掉末尾的序号后缀）
 * @example
 *   '陈奕涵的成果作品'       → '陈奕涵的成果作品'
 *   '陈奕涵的成果作品 (1)'   → '陈奕涵的成果作品'
 *   '陈奕涵的成果作品(2)'    → '陈奕涵的成果作品'
 *   '陈奕涵的成果作品 - 3'   → '陈奕涵的成果作品'
 */
function extractBaseTitle(title: string): string {
  return title
    .replace(/\s*[(（]\d+[)）]\s*$/, '')  // 去掉 "(1)" "(2)" "（1）"
    .replace(/\s*[-–—]\s*\d+\s*$/, '')     // 去掉 "- 3" "— 4"
    .replace(/\s*\d+\s*$/, '')             // 去掉末尾的纯数字
    .trim()
}

/**
 * 从类似"xxx的成果作品"标题中提取作者昵称
 * @example '陈奕涵的成果作品' → '陈奕涵'
 */
function extractAuthorName(title: string): string | null {
  const match = title.match(/^(.+?)的成果作品/)
  return match ? match[1].trim() : null
}

interface MergeGroup {
  baseTitle: string
  userId: string
  works: Array<{
    _id: string
    title: string
    imageList: string[]
    fileUrl: string
    createdAt: Date
  }>
}

async function main() {
  console.log('============================================')
  console.log('  重复作品合并修复工具')
  console.log('============================================\n')

  // ── 1. 连接数据库 ──
  console.log('📡 连接数据库...')
  await connectDatabase()
  console.log('✅ 数据库已连接\n')

  // ── 2. 获取所有图片类型作品 ──
  console.log('🔍 扫描图片类型作品...')
  const allWorks = await Work.find({ type: 'image', status: 'published' })
    .sort({ createdAt: 1 })
    .lean()
  console.log(`   共找到 ${allWorks.length} 个图片作品\n`)

  // ── 3. 按基础标题 + userId 分组 ──
  console.log('📊 按基础标题分组...')
  const groups = new Map<string, MergeGroup>()

  for (const work of allWorks) {
    const baseTitle = extractBaseTitle(work.title)
    const userId = work.userId.toString()
    const groupKey = `${baseTitle}::${userId}`

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        baseTitle,
        userId,
        works: [],
      })
    }

    groups.get(groupKey)!.works.push({
      _id: work._id.toString(),
      title: work.title,
      imageList: work.imageList || [],
      fileUrl: work.fileUrl || '',
      createdAt: work.createdAt,
    })
  }

  // ── 4. 筛选出需要合并的分组（同组 > 1 个作品）──
  const mergeGroups = Array.from(groups.values()).filter(g => g.works.length > 1)

  if (mergeGroups.length === 0) {
    console.log('✅ 没有需要合并的重复作品！')
    process.exit(0)
  }

  console.log(`\n📋 共发现 ${mergeGroups.length} 组需要合并：`)
  for (const group of mergeGroups) {
    console.log(`\n  📁 "${group.baseTitle}" (${group.works.length} 个作品)`)
    for (const w of group.works) {
      const imgCount = w.imageList.length
      const authorName = extractAuthorName(group.baseTitle)
      const hasFileUrl = w.fileUrl ? ` fileUrl=${w.fileUrl.slice(0, 60)}...` : ' fileUrl=空'
      console.log(`     ├─ ${w._id}  「${w.title}」  ${imgCount} 张图${hasFileUrl}`)
    }
  }

  // ── 5. 统计影响范围 ──
  const totalToMerge = mergeGroups.reduce((sum, g) => sum + g.works.length, 0)
  const totalKept = mergeGroups.length // 每组保留 1 个
  const totalDeleted = totalToMerge - totalKept

  console.log(`\n============================================`)
  console.log(`  📊 合并统计`)
  console.log(`============================================`)
  console.log(`   待合并作品:    ${totalToMerge} 个`)
  console.log(`   合并后保留:    ${totalKept} 个`)
  console.log(`   将删除:        ${totalDeleted} 个`)
  console.log(`============================================`)

  // ── 6. 确认是否执行 ──
  const CONFIRM = process.env.CONFIRM_MERGE === 'true'

  if (!CONFIRM) {
    console.log('\n⚠️  预览模式，未实际执行。')
    console.log('   设置环境变量 CONFIRM_MERGE=true 以执行合并:')
    console.log('   CONFIRM_MERGE=true npx ts-node src/scripts/merge-works.ts\n')
    process.exit(0)
  }

  // ── 7. 执行合并 ──
  console.log('\n🚀 开始执行合并...')
  let mergedCount = 0
  let deletedCount = 0

  for (const group of mergeGroups) {
    const [master, ...duplicates] = group.works

    // 7a. 收集所有图片 URL（去重去空）
    const allImages: string[] = []
    const seen = new Set<string>()

    for (const work of [master, ...duplicates]) {
      for (const url of work.imageList) {
        if (url && !seen.has(url)) {
          seen.add(url)
          allImages.push(url)
        }
      }
      // 如果 fileUrl 不在 imageList 中，也加入
      if (work.fileUrl && !seen.has(work.fileUrl)) {
        seen.add(work.fileUrl)
        allImages.unshift(work.fileUrl) // 第一个作为封面
      }
    }

    // 7b. 更新主作品
    await Work.findByIdAndUpdate(master._id, {
      $set: {
        imageList: allImages,
        fileUrl: allImages[0] || master.fileUrl,
        cover: allImages[0] || master.fileUrl,
      },
    })

    // 7c. 删除重复作品及其点赞
    for (const dup of duplicates) {
      await Promise.all([
        Work.deleteOne({ _id: dup._id }),
        Like.deleteMany({ workId: dup._id }),
      ])
    }

    mergedCount++
    deletedCount += duplicates.length
    console.log(`   ✅ ${group.baseTitle}: 合并 ${duplicates.length + 1} 个 → 1 个，删除 ${duplicates.length} 个`)
  }

  // ── 8. 更新作者信息 ──
  console.log('\n🔍 检查需要更新作者的作品...')

  // 查找所有标题包含"xxx的成果作品"模式的作品
  const namedWorks = await Work.find({
    title: { $regex: /的成果作品$/ },
  }).lean()

  let authorUpdatedCount = 0

  for (const work of namedWorks) {
    const authorName = extractAuthorName(work.title)
    if (!authorName) continue

    // 查找是否有该昵称的用户
    let user = await User.findOne({
      nickName: { $regex: new RegExp(`^${escapeRegex(authorName)}`) },
    })

    if (!user) {
      console.log(`   ⚠️  未找到昵称为"${authorName}"的用户，跳过（保留为当前作者）`)
      continue
    }

    // 更新作品作者
    await Work.updateMany(
      { _id: work._id },
      { $set: { userId: user._id } },
    )

    console.log(`   ✅ ${authorName}: 作品作者已更新为 ${authorName}`)
    authorUpdatedCount++
  }

  // ── 9. 输出总结 ──
  console.log('\n============================================')
  console.log('  📊 修复完成')
  console.log('============================================')
  console.log(`   合并组数:        ${mergedCount}`)
  console.log(`   删除重复作品:    ${deletedCount} 个`)
  console.log(`   更新作者:        ${authorUpdatedCount} 个`)
  console.log('============================================')
  console.log()
  console.log('💡 建议下一步：')
  console.log('   1. 在管理后台检查合并结果')
  console.log('   2. 通知相关作者登录查看')
  console.log('   3. 运行 `CONFIRM_MERGE=true npx ts-node src/scripts/merge-works.ts` 实际执行')
  console.log()

  process.exit(0)
}

/** 转义正则特殊字符 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
