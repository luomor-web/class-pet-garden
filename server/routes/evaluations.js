import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { calculateLevel } from '../utils/level.js'

const router = Router()

// 死亡阈值：积分低于此值宠物死亡
const DEATH_THRESHOLD = -20

// 检查宠物状态
function checkPetStatus(totalPoints, currentStatus) {
  // 处理 NULL 或 undefined 的情况
  const status = currentStatus || 'alive'
  
  // 死亡状态：积分 < -20
  if (totalPoints < DEATH_THRESHOLD) {
    if (status !== 'dead') {
      return { status: 'dead', died: true, revived: false, injured: false, healed: false }
    }
    return { status: 'dead', died: false, revived: false, injured: false, healed: false }
  }
  
  // 积分在 [-20, 0) 范围内
  if (totalPoints < 0) {
    // 如果之前是死亡状态，保持死亡状态（不自动变成受伤）
    if (status === 'dead') {
      return { status: 'dead', died: false, revived: false, injured: false, healed: false }
    }
    // 正常进入受伤状态
    if (status === 'alive') {
      return { status: 'injured', died: false, revived: false, injured: true, healed: false }
    }
    // 已经是受伤状态
    return { status: 'injured', died: false, revived: false, injured: false, healed: false }
  }
  
  // 积分 >= 0：正常状态
  if (status === 'dead') {
    return { status: 'alive', died: false, revived: true, injured: false, healed: true }
  }
  if (status === 'injured') {
    return { status: 'alive', died: false, revived: false, injured: false, healed: true }
  }
  return { status: 'alive', died: false, revived: false, injured: false, healed: false }
}

// 添加评价
router.post('/', authMiddleware, (req, res) => {
  const { classId, studentId, points, reason, category } = req.body

  // 验证班级归属
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls || cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  const id = uuidv4()
  const now = Date.now()

  // Insert record
  db.prepare('INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, classId, studentId, points, reason, category, now)

  // Update student points
  db.prepare('UPDATE students SET total_points = total_points + ? WHERE id = ?').run(points, studentId)

  // Get student info (after update)
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)

  // Check pet status (death/revive)
  const statusCheck = checkPetStatus(student.total_points, student.pet_status)
  if (statusCheck.status !== student.pet_status) {
    db.prepare('UPDATE students SET pet_status = ? WHERE id = ?').run(statusCheck.status, studentId)
    student.pet_status = statusCheck.status
  }

  // Update pet exp if student has a pet
  if (student && student.pet_type) {
    // pet_exp should always equal total_points (with minimum 0)
    const newExp = Math.max(0, student.total_points)

    // Calculate new level based on exp
    const newLevel = calculateLevel(newExp)

    // Check if pet graduated (reached level 8)
    let graduated = false
    if (newLevel === 8 && student.pet_level < 8) {
      const badgeId = uuidv4()
      db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
        .run(badgeId, studentId, student.pet_type, now)
      graduated = true
    }

    db.prepare('UPDATE students SET pet_exp = ?, pet_level = ? WHERE id = ?').run(newExp, newLevel, studentId)

    return res.json({
      id,
      timestamp: now,
      petLevel: newLevel,
      petExp: newExp,
      petStatus: statusCheck.status,
      levelUp: newLevel > student.pet_level,
      levelDown: newLevel < student.pet_level,
      graduated,
      died: statusCheck.died,
      revived: statusCheck.revived,
      injured: statusCheck.injured,
      healed: statusCheck.healed
    })
  }

  res.json({ 
    id, 
    timestamp: now,
    petStatus: statusCheck.status,
    died: statusCheck.died,
    revived: statusCheck.revived,
    injured: statusCheck.injured,
    healed: statusCheck.healed
  })
})

// 获取评价记录列表
router.get('/', authMiddleware, (req, res) => {
  const { classId, studentId, page = 1, pageSize = 20 } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)

  let countQuery = 'SELECT COUNT(*) as total FROM evaluation_records er JOIN classes c ON er.class_id = c.id'
  let query = 'SELECT er.*, s.name as student_name FROM evaluation_records er JOIN students s ON er.student_id = s.id JOIN classes c ON er.class_id = c.id'
  const params = []
  const countParams = []

  // 始终添加用户过滤
  params.push(req.userId)
  countParams.push(req.userId)

  // 支持按班级或学生筛选
  const conditions = ['c.user_id = ?']
  if (classId) {
    conditions.push('er.class_id = ?')
    params.push(classId)
    countParams.push(classId)
  }
  if (studentId) {
    conditions.push('er.student_id = ?')
    params.push(studentId)
    countParams.push(studentId)
  }

  query += ' WHERE ' + conditions.join(' AND ')
  countQuery += ' WHERE ' + conditions.join(' AND ')

  // Get total count
  const totalResult = db.prepare(countQuery).get(...countParams)
  const total = totalResult?.total || 0

  // Get paginated records
  query += ' ORDER BY er.timestamp DESC LIMIT ? OFFSET ?'
  params.push(Number(pageSize), offset)

  const records = db.prepare(query).all(...params)
  res.json({
    records,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / Number(pageSize))
  })
})

// 撤回最新评价
router.delete('/latest', authMiddleware, (req, res) => {
  const { classId } = req.query
  if (!classId) {
    return res.status(400).json({ error: 'classId required' })
  }

  // 验证班级归属
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls || cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  // Get latest record
  const record = db.prepare('SELECT * FROM evaluation_records WHERE class_id = ? ORDER BY timestamp DESC LIMIT 1').get(classId)
  if (!record) {
    return res.status(404).json({ error: 'No record found' })
  }

  // Get student current data
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(record.student_id)

  // Calculate new exp
  const expChange = Math.abs(record.points)
  const newExp = Math.max(0, student.pet_exp - expChange)

  // Recalculate level based on new exp
  const newLevel = calculateLevel(newExp)

  // Undo points, exp and update level
  const newTotalPoints = student.total_points - record.points
  const statusCheck = checkPetStatus(newTotalPoints, student.pet_status)
  
  db.prepare('UPDATE students SET total_points = ?, pet_exp = ?, pet_level = ?, pet_status = ? WHERE id = ?')
    .run(newTotalPoints, newExp, newLevel, statusCheck.status, record.student_id)

  // Delete record
  db.prepare('DELETE FROM evaluation_records WHERE id = ?').run(record.id)

  res.json({ success: true, undone: record, petStatus: statusCheck.status })
})

// 删除指定评价记录
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params

  // Get record
  const record = db.prepare(`
    SELECT er.* FROM evaluation_records er
    JOIN classes c ON er.class_id = c.id
    WHERE er.id = ? AND c.user_id = ?
  `).get(id, req.userId)

  if (!record) {
    return res.status(404).json({ error: 'Record not found' })
  }

  // Get student current data
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(record.student_id)

  // Calculate new exp
  const expChange = Math.abs(record.points)
  const newExp = Math.max(0, student.pet_exp - expChange)

  // Recalculate level based on new exp
  const newLevel = calculateLevel(newExp)

  // Undo points, exp and update level
  const newTotalPoints = student.total_points - record.points
  const statusCheck = checkPetStatus(newTotalPoints, student.pet_status)
  
  db.prepare('UPDATE students SET total_points = ?, pet_exp = ?, pet_level = ?, pet_status = ? WHERE id = ?')
    .run(newTotalPoints, newExp, newLevel, statusCheck.status, record.student_id)

  // Delete record
  db.prepare('DELETE FROM evaluation_records WHERE id = ?').run(id)

  res.json({ success: true, undone: record, petStatus: statusCheck.status })
})

export default router
