import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 获取规则列表（公开接口，无需认证）
router.get('/', (req, res) => {
  const rules = db.prepare('SELECT * FROM evaluation_rules ORDER BY category, points DESC').all()
  res.json({ rules })
})

// 添加自定义规则（需要认证）
router.post('/', authMiddleware, (req, res) => {
  const { name, points, category } = req.body
  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 1, ?)')
    .run(id, name, points, category, now)
  res.json({ id, name, points, category, is_custom: 1, created_at: now })
})

// 删除自定义规则（需要认证）
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM evaluation_rules WHERE id = ? AND is_custom = 1').run(req.params.id)
  res.json({ success: true })
})

export default router
