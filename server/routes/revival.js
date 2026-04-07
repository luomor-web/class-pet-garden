import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { verifyStudentOwnership } from '../middleware/ownership.js'

const router = Router()

// 系统预置任务
const PRESET_TASKS = [
  { id: 'preset-1', name: '连续3天准时到校', description: '按时到校，不迟到', sort_order: 1 },
  { id: 'preset-2', name: '本周作业全部按时提交', description: '按时提交所有作业', sort_order: 2 },
  { id: 'preset-3', name: '课堂积极发言3次', description: '主动举手发言', sort_order: 3 },
  { id: 'preset-4', name: '帮助同学完成一件事', description: '热心帮助他人', sort_order: 4 },
  { id: 'preset-5', name: '担任值日生1次', description: '参与班级值日', sort_order: 5 },
  { id: 'preset-6', name: '获得老师表扬1次', description: '表现优秀获得表扬', sort_order: 6 },
  { id: 'preset-7', name: '整理图书角/植物角', description: '维护班级环境', sort_order: 7 },
  { id: 'preset-8', name: '主动回答问题2次', description: '课堂积极参与', sort_order: 8 },
  { id: 'preset-9', name: '书写工整得到展示', description: '作业书写认真', sort_order: 9 },
  { id: 'preset-10', name: '拾金不昧/做好事', description: '品德表现优秀', sort_order: 10 },
]

// 获取复活功能开关状态
router.get('/settings', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT revival_enabled FROM users WHERE id = ?').get(req.userId)
  res.json({ enabled: !!user?.revival_enabled })
})

// 更新复活功能开关
router.put('/settings', authMiddleware, (req, res) => {
  const { enabled } = req.body
  db.prepare('UPDATE users SET revival_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.userId)
  res.json({ success: true })
})

// 获取用户的复活任务列表（预置+自定义）
router.get('/tasks', authMiddleware, (req, res) => {
  // 获取用户自定义任务
  const customTasks = db.prepare(`
    SELECT id, name, description, is_preset, is_enabled, sort_order, created_at
    FROM revival_tasks 
    WHERE user_id = ? AND is_preset = 0
    ORDER BY sort_order, created_at
  `).all(req.userId)

  // 获取用户对预置任务的启用状态
  const presetSettings = db.prepare(`
    SELECT id, is_enabled FROM revival_tasks WHERE user_id = ? AND is_preset = 1
  `).all(req.userId)

  const presetMap = new Map(presetSettings.map(p => {
    // 从组合 ID 中提取原始 taskId
    const originalId = p.id.replace(`${req.userId}-`, '')
    return [originalId, p.is_enabled]
  }))

  // 组装预置任务列表
  const presetTasks = PRESET_TASKS.map(preset => ({
    ...preset,
    is_preset: true,
    is_enabled: presetMap.get(preset.id) ?? true,  // 默认启用
    created_at: null
  }))

  res.json({
    presetTasks,
    customTasks,
    allTasks: [...presetTasks, ...customTasks].sort((a, b) => a.sort_order - b.sort_order)
  })
})

// 更新预置任务启用状态
router.put('/tasks/preset/:taskId', authMiddleware, (req, res) => {
  const { taskId } = req.params
  const { enabled } = req.body

  // 检查是否是有效的预置任务
  const preset = PRESET_TASKS.find(p => p.id === taskId)
  if (!preset) {
    return res.status(400).json({ error: '无效的预置任务' })
  }

  // 使用组合 ID 避免用户间冲突
  const recordId = `${req.userId}-${taskId}`

  // 插入或更新
  const existing = db.prepare(`
    SELECT id FROM revival_tasks WHERE id = ?
  `).get(recordId)

  if (existing) {
    db.prepare(`
      UPDATE revival_tasks SET is_enabled = ? WHERE id = ?
    `).run(enabled ? 1 : 0, recordId)
  } else {
    const now = Date.now()
    db.prepare(`
      INSERT INTO revival_tasks (id, user_id, name, description, is_preset, is_enabled, sort_order, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `).run(recordId, req.userId, preset.name, preset.description, enabled ? 1 : 0, preset.sort_order, now)
  }

  res.json({ success: true })
})

// 添加自定义任务
router.post('/tasks/custom', authMiddleware, (req, res) => {
  const { name, description } = req.body

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '任务名称不能为空' })
  }

  const id = uuidv4()
  const now = Date.now()

  // 获取最大排序值
  const maxOrder = db.prepare(`
    SELECT MAX(sort_order) as max_order FROM revival_tasks WHERE user_id = ?
  `).get(req.userId)

  const sortOrder = (maxOrder?.max_order || 10) + 1

  db.prepare(`
    INSERT INTO revival_tasks (id, user_id, name, description, is_preset, is_enabled, sort_order, created_at)
    VALUES (?, ?, ?, ?, 0, 1, ?, ?)
  `).run(id, req.userId, name.trim(), description?.trim() || null, sortOrder, now)

  res.json({
    id,
    name: name.trim(),
    description: description?.trim() || null,
    is_preset: false,
    is_enabled: true,
    sort_order: sortOrder,
    created_at: now
  })
})

// 删除自定义任务
router.delete('/tasks/custom/:taskId', authMiddleware, (req, res) => {
  const { taskId } = req.params

  const task = db.prepare(`
    SELECT id FROM revival_tasks WHERE id = ? AND user_id = ? AND is_preset = 0
  `).get(taskId, req.userId)

  if (!task) {
    return res.status(404).json({ error: '任务不存在或无权删除' })
  }

  // 删除关联的学生任务分配
  db.prepare('DELETE FROM student_revival_tasks WHERE task_id = ?').run(taskId)
  // 删除任务
  db.prepare('DELETE FROM revival_tasks WHERE id = ?').run(taskId)

  res.json({ success: true })
})

// 更新自定义任务
router.put('/tasks/custom/:taskId', authMiddleware, (req, res) => {
  const { taskId } = req.params
  const { name, description } = req.body

  const task = db.prepare(`
    SELECT id FROM revival_tasks WHERE id = ? AND user_id = ? AND is_preset = 0
  `).get(taskId, req.userId)

  if (!task) {
    return res.status(404).json({ error: '任务不存在或无权修改' })
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: '任务名称不能为空' })
  }

  db.prepare(`
    UPDATE revival_tasks SET name = ?, description = ? WHERE id = ?
  `).run(name.trim(), description?.trim() || null, taskId)

  res.json({ success: true })
})

// ===== 学生复活任务分配 =====

// 获取学生已分配的复活任务
router.get('/students/:studentId/tasks', authMiddleware, (req, res) => {
  const { studentId } = req.params

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  const tasks = db.prepare(`
    SELECT srt.id, srt.task_id, srt.status, srt.assigned_at, srt.completed_at,
           rt.name, rt.description, rt.is_preset
    FROM student_revival_tasks srt
    JOIN revival_tasks rt ON srt.task_id = rt.id
    WHERE srt.student_id = ?
    ORDER BY srt.assigned_at
  `).all(studentId)

  res.json({ tasks, student })
})

// 为学生分配复活任务
router.post('/students/:studentId/tasks', authMiddleware, (req, res) => {
  const { studentId } = req.params
  const { taskIds } = req.body

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: '请选择至少一个任务' })
  }

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  // 验证任务有效性
  const validTaskIds = []
  for (const taskId of taskIds) {
    // 检查是否是预置任务
    const preset = PRESET_TASKS.find(p => p.id === taskId)
    if (preset) {
      // 检查预置任务是否被禁用（用户设置）
      const recordId = `${req.userId}-${taskId}`
      const userSetting = db.prepare(`
        SELECT is_enabled FROM revival_tasks WHERE id = ?
      `).get(recordId)
      
      // 如果用户没有禁用过这个预置任务，则有效
      if (!userSetting || userSetting.is_enabled === 1) {
        validTaskIds.push(taskId)
      }
    } else {
      // 自定义任务，检查数据库
      const customTask = db.prepare(`
        SELECT id FROM revival_tasks 
        WHERE id = ? AND user_id = ? AND is_preset = 0 AND is_enabled = 1
      `).get(taskId, req.userId)
      
      if (customTask) {
        validTaskIds.push(taskId)
      }
    }
  }

  if (validTaskIds.length !== taskIds.length) {
    return res.status(400).json({ error: '部分任务不存在或未启用' })
  }

  // 删除旧任务
  db.prepare('DELETE FROM student_revival_tasks WHERE student_id = ?').run(studentId)

  // 分配新任务
  const now = Date.now()
  const insertStmt = db.prepare(`
    INSERT INTO student_revival_tasks (id, student_id, task_id, status, assigned_at)
    VALUES (?, ?, ?, 'pending', ?)
  `)

  for (const taskId of validTaskIds) {
    insertStmt.run(uuidv4(), studentId, taskId, now)
  }

  res.json({ success: true, assignedCount: validTaskIds.length })
})

// 标记任务完成
router.put('/students/:studentId/tasks/:taskId/complete', authMiddleware, (req, res) => {
  const { studentId, taskId } = req.params

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  const task = db.prepare(`
    SELECT id, status FROM student_revival_tasks WHERE student_id = ? AND id = ?
  `).get(studentId, taskId)

  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  const now = Date.now()
  db.prepare(`
    UPDATE student_revival_tasks SET status = 'completed', completed_at = ? WHERE id = ?
  `).run(now, taskId)

  res.json({ success: true })
})

// 取消任务完成
router.put('/students/:studentId/tasks/:taskId/uncomplete', authMiddleware, (req, res) => {
  const { studentId, taskId } = req.params

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  db.prepare(`
    UPDATE student_revival_tasks SET status = 'pending', completed_at = NULL 
    WHERE student_id = ? AND id = ?
  `).run(studentId, taskId)

  res.json({ success: true })
})

// 确认复活
router.post('/students/:studentId/revive', authMiddleware, (req, res) => {
  const { studentId } = req.params

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  // 检查是否所有任务都已完成
  const pendingTasks = db.prepare(`
    SELECT id FROM student_revival_tasks WHERE student_id = ? AND status = 'pending'
  `).all(studentId)

  // 如果有分配的任务，必须全部完成
  const allTasks = db.prepare(`
    SELECT id FROM student_revival_tasks WHERE student_id = ?
  `).all(studentId)

  if (allTasks.length > 0 && pendingTasks.length > 0) {
    return res.status(400).json({ error: '还有未完成的任务' })
  }

  const now = Date.now()

  // 复活：重置积分和状态
  db.prepare(`
    UPDATE students SET total_points = 0, pet_status = 'alive' WHERE id = ?
  `).run(studentId)

  // 记录复活
  db.prepare(`
    INSERT INTO revival_records (id, student_id, revived_at)
    VALUES (?, ?, ?)
  `).run(uuidv4(), studentId, now)

  // 清除任务分配
  db.prepare('DELETE FROM student_revival_tasks WHERE student_id = ?').run(studentId)

  res.json({ success: true })
})

// 移除学生的复活任务
router.delete('/students/:studentId/tasks', authMiddleware, (req, res) => {
  const { studentId } = req.params

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  db.prepare('DELETE FROM student_revival_tasks WHERE student_id = ?').run(studentId)

  res.json({ success: true })
})

// 获取复活记录
router.get('/students/:studentId/records', authMiddleware, (req, res) => {
  const { studentId } = req.params

  // 验证学生归属
  const student = verifyStudentOwnership(studentId, req.userId)
  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  const records = db.prepare(`
    SELECT id, revived_at FROM revival_records WHERE student_id = ? ORDER BY revived_at DESC
  `).all(studentId)

  res.json({ records })
})

export default router