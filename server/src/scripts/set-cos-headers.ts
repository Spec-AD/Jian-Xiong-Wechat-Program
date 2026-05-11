/**
 * scripts/set-cos-headers.ts — 设置 COS 对象 Content-Type 头
 *
 * 功能：
 *   为 COS 存储桶中已有的图标资源设置正确的 Content-Type 头
 *   这些资源在上传时未设置 Content-Type，可能导致部分客户端无法正确识别
 *
 * 使用方式：
 *   cd server
 *   npx ts-node src/scripts/set-cos-headers.ts
 *
 * 前置条件：
 *   - .env 中已配置 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION
 */

import COS from 'cos-nodejs-sdk-v5'
import config from '../config'

/** 需要设置 Header 的资源列表（Key 相对于存储桶根目录） */
const ICON_FILES = [
  { key: 'resources/MdiArrowExpandUp (1).png', contentType: 'image/png' },
  { key: 'resources/MdiHeart.png', contentType: 'image/png' },
  { key: 'resources/MdiAccountDetails.png', contentType: 'image/png' },
  { key: 'resources/MdiArrowCollapseDown.png', contentType: 'image/png' },
  { key: 'resources/MdiKnob.png', contentType: 'image/png' },
  { key: 'resources/MdiBookEdit.png', contentType: 'image/png' },
  { key: 'resources/MdiCog.png', contentType: 'image/png' },
  { key: 'resources/SimpleIconsGithub.png', contentType: 'image/png' },
  { key: 'resources/SimpleIconsAfdian.png', contentType: 'image/png' },
]

async function main() {
  if (!config.cos.secretId || !config.cos.secretKey || !config.cos.bucket) {
    console.error('❌ COS 未配置，请在 .env 中设置 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET')
    process.exit(1)
  }

  const cos = new COS({
    SecretId: config.cos.secretId,
    SecretKey: config.cos.secretKey,
  })

  console.log('📤 开始设置 COS 对象 Content-Type 头...\n')

  let successCount = 0
  let failCount = 0

  for (const file of ICON_FILES) {
    process.stdout.write(`  📄 ${file.key} ... `)

    try {
      // 使用 putObject 只更新元数据（需先获取原文件内容）
      // 方式：先用 getObject 获取，再 putObject 设置新 ContentType
      const headData = await new Promise<COS.HeadObjectResult>((resolve, reject) => {
        cos.headObject({
          Bucket: config.cos.bucket!,
          Region: config.cos.region,
          Key: file.key,
        }, (err, data) => {
          if (err) reject(err)
          else resolve(data)
        })
      })

      const size = headData.headers?.['content-length']
        ? Number(headData.headers['content-length'])
        : 0
      console.log(`已存在 (${(size / 1024).toFixed(1)}KB)`)

      // 使用 putObjectCopy 复制到自身并更新元数据
      await new Promise<void>((resolve, reject) => {
        cos.putObjectCopy({
          Bucket: config.cos.bucket!,
          Region: config.cos.region,
          Key: file.key,
          CopySource: `/${config.cos.bucket!}/${config.cos.region}/${file.key}`,
          MetadataDirective: 'Replaced',
          ContentType: file.contentType,
        }, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      console.log(`     ↳ ✅ Content-Type 已设为: ${file.contentType}`)
      successCount++
    } catch (err: any) {
      console.log(`❌ ${err.message || err}`)
      failCount++
    }
  }

  console.log('\n============================================')
  console.log('  📊 操作统计')
  console.log('============================================')
  console.log(`   总计: ${ICON_FILES.length} 个文件`)
  console.log(`   ✅ 成功: ${successCount} 个`)
  console.log(`   ❌ 失败: ${failCount} 个`)
  console.log('============================================\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
