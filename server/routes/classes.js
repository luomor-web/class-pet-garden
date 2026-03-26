import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { verifyClassOwnership } from '../middleware/ownership.js'

const router = Router()

// 获取班级列表
router.get('/', authMiddleware, (req, res) => {
  const classes = db.prepare('SELECT * FROM classes WHERE user_id = ? ORDER BY created_at DESC').all(req.userId)
  res.json({ classes })
})

// 获取班级学生列表（包含标签）
router.get('/:classId/students', authMiddleware, (req, res) => {
  const cls = verifyClassOwnership(req.params.classId, req.userId)
  if (!cls) {
    return res.status(403).json({ error: '班级不存在或无权访问' })
  }
  
  const students = db.prepare('SELECT * FROM students WHERE class_id = ? ORDER BY name').all(req.params.classId)
  
  // 批量获取所有学生的标签
  const studentsWithTags = students.map(student => {
    const tags = db.prepare(`
      SELECT st.id, st.name, st.color, st.user_id, st.created_at
      FROM student_tags st
      JOIN student_tag_relations str ON st.id = str.tag_id
      WHERE str.student_id = ? AND st.user_id = ?
      ORDER BY str.created_at DESC
    `).all(student.id, req.userId)
    
    return { ...student, tags }
  })
  
  res.json({ students: studentsWithTags })
})

// 创建班级
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body
  const id = uuidv4()
  const now = Date.now()

  db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.userId, name, now, now)

  res.json({ id, user_id: req.userId, name, created_at: now, updated_at: now })
})

// 更新班级
router.put('/:id', authMiddleware, (req, res) => {
  const { name } = req.body
  const cls = verifyClassOwnership(req.params.id, req.userId)

  if (!cls) {
    return res.status(404).json({ error: '班级不存在或无权修改' })
  }

  const now = Date.now()
  db.prepare('UPDATE classes SET name = ?, updated_at = ? WHERE id = ?').run(name, now, req.params.id)
  res.json({ success: true })
})

// 删除班级
router.delete('/:id', authMiddleware, (req, res) => {
  const cls = verifyClassOwnership(req.params.id, req.userId)
  if (!cls) {
    return res.status(404).json({ error: '班级不存在或无权删除' })
  }

  // 按外键依赖顺序删除：evaluation_records -> badges -> student_tag_relations -> students -> classes
  db.prepare('DELETE FROM evaluation_records WHERE class_id = ?').run(req.params.id)
  db.prepare('DELETE FROM badges WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)').run(req.params.id)
  db.prepare('DELETE FROM student_tag_relations WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)').run(req.params.id)
  db.prepare('DELETE FROM students WHERE class_id = ?').run(req.params.id)
  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router