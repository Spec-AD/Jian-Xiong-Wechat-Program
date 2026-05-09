/**
 * 测试 COS 连接
 * 运行: npx ts-node src/scripts/test-cos.ts
 */
import COS from 'cos-nodejs-sdk-v5'
import config from '../config'

const cos = new COS({
  SecretId: config.cos.secretId,
  SecretKey: config.cos.secretKey,
})

console.log('正在测试 COS 连接...')
console.log(`Bucket: ${config.cos.bucket}`)
console.log(`Region: ${config.cos.region}`)

cos.putObject(
  {
    Bucket: config.cos.bucket,
    Region: config.cos.region,
    Key: 'test/connection-test.txt',
    Body: Buffer.from('健雄书院 COS 连接测试成功！时间: ' + new Date().toISOString()),
  },
  (err, data) => {
    if (err) {
      console.error('❌ COS 连接失败:', err)
      process.exit(1)
    }
    console.log('✅ COS 连接测试成功!')
    console.log('   文件 URL: https://' + data.Location)
    console.log('   您现在可以在浏览器打开这个 URL 查看内容')
    process.exit(0)
  },
)
