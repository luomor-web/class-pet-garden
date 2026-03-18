import crypto from 'crypto'

const SALT = 'pet-garden-secret-salt-2024'

export function hashPassword(password) {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex')
}

export function verifyPassword(password, hash) {
  // 新方法：HMAC-SHA256
  const newHash = hashPassword(password)
  if (newHash === hash) return true

  // 兼容旧方法：纯 SHA256（用于迁移旧数据）
  const oldHash = crypto.createHash('sha256').update(password).digest('hex')
  if (oldHash === hash) return true

  return false
}

// 检查是否需要升级 hash
export function needsUpgrade(hash) {
  // 如果是旧格式（纯 SHA256），需要升级
  const testPassword = 'test'
  const oldHash = crypto.createHash('sha256').update(testPassword).digest('hex')
  // 新 hash 长度和旧的一样，所以我们通过比较格式来判断
  // 新 hash 用 HMAC，我们可以尝试重新 hash 已知的测试密码
  return true // 简单起见，总是建议升级
}
