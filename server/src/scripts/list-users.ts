/**
 * scripts/list-users.ts — 列出所有用户，用于查找可用的 userId
 *
 * 使用方式：
 *   cd server
 *   npx ts-node src/scripts/list-users.ts
 */

import { connectDatabase } from '../config/db'
import '../models/user.model'
import mongoose from 'mongoose'

async function main() {
  await connectDatabase()
  const users = await mongoose.model('User').find().lean()
  console.log(`共 ${users.length} 个用户:\n`)
  for (const u of users) {
    console.log(`  ID: ${u._id}  |  昵称: ${(u as any).nickName || '无'}  |  角色: ${(u as any).role || 'user'}`)
  }
  console.log()
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
