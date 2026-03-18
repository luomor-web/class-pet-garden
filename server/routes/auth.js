import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { generateToken, verifyToken } from '../utils/token.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 注册
router.post('/register', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度3-20字符' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' })
  }

  // 检查用户名是否已存在
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    return res.status(400).json({ error: '用户名已存在' })
  }

  const userId = uuidv4()
  const passwordHash = hashPassword(password)

  db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, username, passwordHash, 0, Date.now())

  const token = generateToken(userId)
  res.json({
    success: true,
    token,
    user: { id: userId, username, isGuest: false }
  })
})

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  const user = db.prepare('SELECT id, username, password_hash, is_guest FROM users WHERE username = ?').get(username)

  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const token = generateToken(user.id)
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, isGuest: !!user.is_guest }
  })
})

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, is_guest FROM users WHERE id = ?').get(req.userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      isGuest: !!user.is_guest
    }
  })
})

export default router
