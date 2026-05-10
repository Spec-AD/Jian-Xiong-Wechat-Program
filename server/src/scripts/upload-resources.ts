/**
 * scripts/upload-resources.ts — 资源文件上传脚本
 *
 * 功能：
 *   1. 扫描指定目录下的所有资源文件
 *   2. 将 .pptx 文件通过 PowerShell (PowerPoint COM) 转为 .pdf
 *   3. 上传所有文件到腾讯云 COS（保留原始文件名）
 *   4. 生成 URL 映射 JSON 文件
 *   5. 生成可供 seed 脚本使用的代码片段
 *
 * 使用方式：
 *   cd server
 *   ts-node src/scripts/upload-resources.ts
 *
 * 前置条件：
 *   - .env 中已配置 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION
 *   - Windows 系统已安装 Microsoft PowerPoint（用于 pptx → pdf 转换）
 *   - 已安装依赖: npm install cos-nodejs-sdk-v5
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { uploadFileWithKey } from '../services/cos.service'

// ============================================================
//  配置区 — 根据实际情况修改
// ============================================================

/** 资源文件所在目录 */
const RESOURCE_DIR = 'D:\\Downloads\\寒假支部活动可视化成果收集-Table1-可视化成果文件'

/** 上传到 COS 的前缀目录 */
const COS_KEY_PREFIX = 'resources'

/** 输出映射文件的路径 */
const OUTPUT_MAP_PATH = path.resolve(__dirname, '../../resource-map.json')

/** 输出 seed 代码片段的路径 */
const OUTPUT_SEED_PATH = path.resolve(__dirname, '../../resource-seed.ts')

// ============================================================
//  文件类型 → Content-Type 映射表
// ============================================================

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.mov': 'video/quicktime',
  '.md': 'text/markdown; charset=utf-8',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
}

function getContentType(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] || 'application/octet-stream'
}

// ============================================================
//  工具函数
// ============================================================

/** 获取文件扩展名（小写） */
function getExt(filename: string): string {
  return path.extname(filename).toLowerCase()
}

/** 判断是否为 pptx 文件 */
function isPptx(filename: string): boolean {
  return getExt(filename) === '.pptx'
}

// ============================================================
//  核心功能
// ============================================================

/**
 * 将 pptx 文件转为 pdf（使用 PowerShell + PowerPoint COM）
 * 仅在 Windows 环境下可用
 */
async function convertPptxToPdf(pptxPath: string): Promise<string | null> {
  const dir = path.dirname(pptxPath)
  const baseName = path.basename(pptxPath, '.pptx')
  const pdfPath = path.join(dir, `${baseName}.pdf`)

  // 如果 pdf 已存在，跳过转换
  if (fs.existsSync(pdfPath)) {
    console.log(`  ⏭️  PDF 已存在，跳过转换: ${path.basename(pdfPath)}`)
    return pdfPath
  }

  const psScript = `
    $ppt = New-Object -ComObject PowerPoint.Application
    $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse
    $presentation = $ppt.Presentations.Open("${pptxPath.replace(/\\/g, '\\\\')}")
    $presentation.SaveAs("${pdfPath.replace(/\\/g, '\\\\')}", 32)
    $presentation.Close()
    $ppt.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt)
    Write-Host "CONVERTED"
  `

  try {
    console.log(`  🔄 转换中: ${path.basename(pptxPath)} → ${baseName}.pdf`)
    execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, {
      timeout: 120000, // 2 分钟超时
      stdio: 'pipe',
    })
    console.log(`  ✅ 转换成功: ${path.basename(pdfPath)}`)
    return pdfPath
  } catch (err) {
    console.error(`  ❌ 转换失败: ${pptxPath}`, err)
    return null
  }
}

/**
 * 扫描目录，获取所有文件的信息
 */
function scanDirectory(dirPath: string): { filename: string; filepath: string; ext: string }[] {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ 目录不存在: ${dirPath}`)
    process.exit(1)
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const files = entries
    .filter(entry => entry.isFile())
    .map(entry => ({
      filename: entry.name,
      filepath: path.join(dirPath, entry.name),
      ext: getExt(entry.name),
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename))

  return files
}

// ============================================================
//  主流程
// ============================================================

interface ResourceMap {
  [originalFilename: string]: {
    cosUrl: string
    type: string
    size: number
  }
}

async function main() {
  console.log('============================================')
  console.log('  📤 资源文件上传脚本')
  console.log('============================================\n')

  // Step 1: 扫描目录
  console.log(`📂 扫描目录: ${RESOURCE_DIR}\n`)
  const files = scanDirectory(RESOURCE_DIR)
  console.log(`   找到 ${files.length} 个文件\n`)

  // 按类型统计
  const typeStats: Record<string, number> = {}
  for (const f of files) {
    typeStats[f.ext] = (typeStats[f.ext] || 0) + 1
  }
  console.log('📊 文件类型统计:')
  for (const [ext, count] of Object.entries(typeStats).sort()) {
    console.log(`   ${ext.padEnd(6)}: ${count} 个`)
  }
  console.log('')

  // Step 2: pptx → pdf 转换
  const pptxFiles = files.filter(f => isPptx(f.filename))
  if (pptxFiles.length > 0) {
    console.log('🔄 PPTX → PDF 转换:\n')
    for (const pptx of pptxFiles) {
      const pdfPath = await convertPptxToPdf(pptx.filepath)
      if (pdfPath && fs.existsSync(pdfPath)) {
        // 将新生成的 pdf 加入文件列表（如果尚未存在）
        const pdfFilename = path.basename(pdfPath)
        if (!files.some(f => f.filename === pdfFilename)) {
          files.push({
            filename: pdfFilename,
            filepath: pdfPath,
            ext: '.pdf',
          })
        }
      }
    }
    console.log('')
  } else {
    console.log('⏭️  没有 pptx 文件需要转换\n')
  }

  // Step 3: 上传到 COS
  console.log('📤 上传到腾讯云 COS:\n')

  const resourceMap: ResourceMap = {}
  let successCount = 0
  let failCount = 0

  for (const file of files) {
    // 跳过原始的 pptx 文件（已被 pdf 替代）
    if (isPptx(file.filename)) {
      console.log(`  ⏭️  跳过原始 pptx (已转为 pdf): ${file.filename}`)
      continue
    }

    const contentType = getContentType(file.ext)
    const fileSizeMB = (fs.statSync(file.filepath).size / 1024 / 1024).toFixed(2)

    process.stdout.write(`  📄 ${file.filename} (${fileSizeMB}MB) ... `)

    try {
      // 上传到 COS，key = resources/原始文件名
      const cosUrl = await uploadFileWithKey(
        file.filepath,
        file.filename,
        contentType,
        COS_KEY_PREFIX,
      )

      resourceMap[file.filename] = {
        cosUrl,
        type: contentType,
        size: fs.statSync(file.filepath).size,
      }

      console.log(`✅`)
      console.log(`     ↳ ${cosUrl}`)
      successCount++
    } catch (err) {
      console.log(`❌`)
      console.error(`     ↳ 错误:`, err)
      failCount++
    }
  }

  // Step 4: 输出统计
  console.log('\n============================================')
  console.log('  📊 上传统计')
  console.log('============================================')
  console.log(`   总计:  ${files.length - pptxFiles.length} 个文件`)
  console.log(`   ✅ 成功: ${successCount} 个`)
  console.log(`   ❌ 失败: ${failCount} 个`)
  console.log('============================================\n')

  // Step 5: 保存映射文件
  fs.writeFileSync(OUTPUT_MAP_PATH, JSON.stringify(resourceMap, null, 2), 'utf-8')
  console.log(`📝 资源映射已保存: ${OUTPUT_MAP_PATH}`)

  // Step 6: 生成 seed 代码片段
  generateSeedSnippet(resourceMap)
  console.log(`📝 Seed 代码片段已保存: ${OUTPUT_SEED_PATH}`)

  console.log('\n✅ 全部完成！\n')
}

/**
 * 生成可供 seed 脚本使用的代码片段
 */
function generateSeedSnippet(map: ResourceMap) {
  const entries = Object.entries(map)

  // 按文件类型分组
  const byType: Record<string, { filename: string; cosUrl: string }[]> = {}
  for (const [filename, info] of entries) {
    const ext = getExt(filename)
    if (!byType[ext]) byType[ext] = []
    byType[ext].push({ filename, cosUrl: info.cosUrl })
  }

  let snippet = `/**
 * 资源文件 URL 映射表
 * 由 upload-resources.ts 自动生成
 * 生成时间: ${new Date().toISOString()}
 * 
 * 使用方式：
 *   1. 在 seed 脚本中 import 此文件
 *   2. 使用 RESOURCE_MAP[filename] 获取 COS URL
 */

export const RESOURCE_MAP: Record<string, string> = {\n`

  for (const [filename, info] of entries) {
    snippet += `  '${filename}': '${info.cosUrl}',\n`
  }

  snippet += `}\n\n`
  snippet += `// ============================================\n`
  snippet += `//  按文件类型分组（方便 seed 脚本使用）\n`
  snippet += `// ============================================\n\n`

  for (const [ext, items] of Object.entries(byType).sort()) {
    snippet += `// --- ${ext} 文件 (${items.length}个) ---\n`
    for (const item of items) {
      snippet += `// ${item.filename}\n`
      snippet += `//   ↳ ${item.cosUrl}\n`
    }
    snippet += '\n'
  }

  // 生成 Works 数组代码片段
  snippet += `// ============================================\n`
  snippet += `//  可供 seed 使用的 Works 数组片段\n`
  snippet += `// ============================================\n\n`
  snippet += `/*\n`
  snippet += `// 在 seed/index.ts 中可以使用如下方式创建作品：\n`
  snippet += `const works = await Work.create([\n`

  for (const [filename, info] of entries) {
    const ext = getExt(filename)
    const type = extToWorkType(ext)
    const nameWithoutExt = path.basename(filename, ext)
    // 从文件名中提取学号和姓名
    const match = nameWithoutExt.match(/^(\\d+)[-－](.+)/)
    const studentName = match ? match[2] : nameWithoutExt

    snippet += `  {\n`
    snippet += `    userId: testUser._id,\n`
    snippet += `    title: '${studentName}的成果作品',\n`
    snippet += `    description: '',\n`
    snippet += `    type: '${type}',\n`
    snippet += `    categoryId: '${type}',\n`
    snippet += `    fileUrl: '${info.cosUrl}',\n`
    snippet += `    tags: [],\n`
    snippet += `    status: 'published',\n`
    snippet += `  },\n`
  }

  snippet += `])\n`
  snippet += `*/\n`

  fs.writeFileSync(OUTPUT_SEED_PATH, snippet, 'utf-8')
}

/**
 * 文件扩展名 → Work.type
 */
function extToWorkType(ext: string): string {
  const map: Record<string, string> = {
    '.mp4': 'video',
    '.mov': 'video',
    '.avi': 'video',
    '.mkv': 'video',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.webp': 'image',
    '.bmp': 'image',
    '.svg': 'image',
    '.pdf': 'doc',
    '.doc': 'doc',
    '.docx': 'doc',
    '.ppt': 'doc',
    '.pptx': 'doc',
    '.xlsx': 'doc',
    '.xls': 'doc',
    '.md': 'doc',
    '.txt': 'doc',
    '.mp3': 'audio',
    '.wav': 'audio',
    '.flac': 'audio',
    '.aac': 'audio',
    '.wma': 'audio',
    '.m4a': 'audio',
  }
  return map[ext.toLowerCase()] || 'unknown'
}

// ============================================================
//  执行
// ============================================================

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
