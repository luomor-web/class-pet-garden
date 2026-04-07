import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { verifyClassOwnership, verifyStudentOwnership, verifyStudentsOwnership } from '../middleware/ownership.js'

const router = Router()

// 添加学生
router.post('/', authMiddleware, (req, res) => {
  const { classId, name, studentNo } = req.body

  // 验证班级归属
  const cls = verifyClassOwnership(classId, req.userId)
  if (!cls) {
    return res.status(403).json({ error: '班级不存在或无权访问' })
  }

  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, 0, 1, 0, ?)')
    .run(id, classId, name, studentNo || null, now)
  res.json({ id, class_id: classId, name, student_no: studentNo || null, total_points: 0, pet_level: 1, pet_exp: 0, created_at: now })
})

// 更新学生
router.put('/:id', authMiddleware, (req, res) => {
  const { name, studentNo } = req.body

  const student = verifyStudentOwnership(req.params.id, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  db.prepare('UPDATE students SET name = ?, student_no = ? WHERE id = ?').run(name, studentNo || null, req.params.id)
  res.json({ success: true })
})

// 删除学生
router.delete('/:id', authMiddleware, (req, res) => {
  const student = verifyStudentOwnership(req.params.id, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  // 先删除相关的评价记录
  db.prepare('DELETE FROM evaluation_records WHERE student_id = ?').run(req.params.id)
  // 再删除学生
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// 批量导入学生
router.post('/import', authMiddleware, (req, res) => {
  const { classId, students } = req.body
  if (!classId || !students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  const cls = verifyClassOwnership(classId, req.userId)
  if (!cls) {
    return res.status(403).json({ error: '班级不存在或无权访问' })
  }

  const now = Date.now()
  const insertStmt = db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, 0, 1, 0, ?)')

  let imported = 0
  for (const student of students) {
    if (student.name && student.name.trim()) {
      const id = uuidv4()
      insertStmt.run(id, classId, student.name.trim(), student.studentNo?.trim() || null, now)
      imported++
    }
  }

  res.json({ success: true, imported })
})

// 批量删除学生
router.post('/batch-delete', authMiddleware, (req, res) => {
  const { ids } = req.body
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '无效的学生ID列表' })
  }

  const { valid, students: validStudents } = verifyStudentsOwnership(ids, req.userId)
  if (!valid) {
    return res.status(403).json({ error: '部分学生不存在或无权删除' })
  }

  // 删除评价记录和学生
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM evaluation_records WHERE student_id IN (${placeholders})`).run(...ids)
  db.prepare(`DELETE FROM students WHERE id IN (${placeholders})`).run(...ids)
  
  res.json({ success: true, deleted: ids.length })
})

// 更新学生宠物
router.put('/:id/pet', authMiddleware, (req, res) => {
  const { petType } = req.body
  const now = Date.now()

  const student = verifyStudentOwnership(req.params.id, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  // If student already has a pet, create a badge for it if level is 8
  if (student.pet_type && student.pet_level >= 8) {
    const badgeId = uuidv4()
    db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      .run(badgeId, req.params.id, student.pet_type, now)
  }

  // Update pet type (keep level and exp)
  db.prepare('UPDATE students SET pet_type = ? WHERE id = ?')
    .run(petType, req.params.id)

  res.json({ success: true })
})

// 转班
router.put('/:id/transfer', authMiddleware, (req, res) => {
  const { targetClassId } = req.body

  if (!targetClassId) {
    return res.status(400).json({ error: '请选择目标班级' })
  }

  // 验证学生归属
  const student = verifyStudentOwnership(req.params.id, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  // 验证目标班级归属
  const targetClass = verifyClassOwnership(targetClassId, req.userId)
  if (!targetClass) {
    return res.status(403).json({ error: '目标班级不存在或无权访问' })
  }

  // 不能转到同一个班
  if (student.class_id === targetClassId) {
    return res.status(400).json({ error: '学生已在该班级中' })
  }

  // 更新学生的班级
  db.prepare('UPDATE students SET class_id = ? WHERE id = ?').run(targetClassId, req.params.id)

  // 同时更新该学生的评价记录的班级归属
  db.prepare('UPDATE evaluation_records SET class_id = ? WHERE student_id = ?').run(targetClassId, req.params.id)

  res.json({ success: true })
})

// 批量转班
router.post('/batch-transfer', authMiddleware, (req, res) => {
  const { ids, targetClassId } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请选择要转班的学生' })
  }

  if (!targetClassId) {
    return res.status(400).json({ error: '请选择目标班级' })
  }

  // 验证学生归属
  const { valid } = verifyStudentsOwnership(ids, req.userId)
  if (!valid) {
    return res.status(403).json({ error: '部分学生不存在或无权访问' })
  }

  // 验证目标班级归属
  const targetClass = verifyClassOwnership(targetClassId, req.userId)
  if (!targetClass) {
    return res.status(403).json({ error: '目标班级不存在或无权访问' })
  }

  // 批量更新
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`UPDATE students SET class_id = ? WHERE id IN (${placeholders})`).run(targetClassId, ...ids)
  db.prepare(`UPDATE evaluation_records SET class_id = ? WHERE student_id IN (${placeholders})`).run(targetClassId, ...ids)

  res.json({ success: true, transferred: ids.length })
})

export default router