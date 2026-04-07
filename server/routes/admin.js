import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 管理员权限检查中间件
function adminMiddleware(req, res, next) {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId)
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: '需要管理员权限' })
  }
  next()
}

// 获取所有老师及游客统计（不包括管理员）
router.get('/teachers', authMiddleware, adminMiddleware, (req, res) => {
  const teachers = db.prepare(`
    SELECT id, username, created_at, is_admin, is_guest
    FROM users
    WHERE is_admin = 0
    ORDER BY created_at DESC
  `).all()

  const result = teachers.map(teacher => {
    const classes = db.prepare(`
      SELECT c.id, c.name,
             (SELECT count(*) FROM students s WHERE s.class_id = c.id) as student_count,
             (SELECT count(*) FROM evaluation_records e WHERE e.class_id = c.id) as eval_count
      FROM classes c
      WHERE c.user_id = ?
      ORDER BY student_count DESC
    `).all(teacher.id)

    const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0)
    const totalEvals = classes.reduce((sum, c) => sum + c.eval_count, 0)

    // 获取该老师最近一次评价时间
    const lastEval = db.prepare(`
      SELECT MAX(timestamp) as last_time
      FROM evaluation_records
      WHERE user_id = ?
    `).get(teacher.id)

    // 获取今日评价次数
    const todayEvals = db.prepare(`
      SELECT count(*) as count
      FROM evaluation_records
      WHERE user_id = ?
        AND date(timestamp/1000, 'unixepoch', 'localtime') = date('now', 'localtime')
    `).get(teacher.id)

    return {
      id: teacher.id,
      username: teacher.username,
      isAdmin: !!teacher.is_admin,
      isGuest: !!teacher.is_guest,
      createdAt: teacher.created_at,
      classCount: classes.length,
      totalStudents,
      totalEvals,
      lastEvalTime: lastEval?.last_time || null,
      todayEvals: todayEvals.count,
      classes
    }
  })

  // 按最后一次评价时间排序，最近评价的排前面，没评价过的排最后
  result.sort((a, b) => {
    if (a.lastEvalTime === null && b.lastEvalTime === null) return 0
    if (a.lastEvalTime === null) return 1
    if (b.lastEvalTime === null) return -1
    return b.lastEvalTime - a.lastEvalTime
  })

  res.json({ teachers: result })
})

// 获取系统统计概览
router.get('/stats', authMiddleware, adminMiddleware, (req, res) => {
  const stats = {
    teachers: db.prepare('SELECT count(*) as count FROM users WHERE is_guest = 0').get().count,
    classes: db.prepare('SELECT count(*) as count FROM classes').get().count,
    students: db.prepare('SELECT count(*) as count FROM students').get().count,
    evaluations: db.prepare('SELECT count(*) as count FROM evaluation_records').get().count,
    todayEvaluations: db.prepare(`
      SELECT count(*) as count FROM evaluation_records 
      WHERE date(timestamp/1000, 'unixepoch', 'localtime') = date('now', 'localtime')
    `).get().count
  }

  // 最近7天的评价统计
  const dailyStats = db.prepare(`
    SELECT date(timestamp/1000, 'unixepoch', 'localtime') as date, 
           count(*) as count 
    FROM evaluation_records 
    WHERE timestamp >= (strftime('%s', 'now') - 7*24*60*60) * 1000
    GROUP BY date
    ORDER BY date DESC
  `).all()

  res.json({ stats, dailyStats })
})

// 删除用户（危险操作，级联删除班级、学生、评价记录）
router.delete('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const userId = req.params.id

  // 不能删除自己
  if (userId === req.userId) {
    return res.status(400).json({ error: '不能删除自己' })
  }

  // 检查用户是否存在
  const user = db.prepare('SELECT id, username, is_admin, is_guest FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  // 不能删除管理员
  if (user.is_admin) {
    return res.status(403).json({ error: '不能删除管理员' })
  }

  // 不能删除游客
  if (user.is_guest) {
    return res.status(403).json({ error: '不能删除游客' })
  }

  try {
    // 开启事务，确保数据一致性
    db.transaction(() => {
      // 获取用户所有班级
      const classes = db.prepare('SELECT id FROM classes WHERE user_id = ?').all(userId)
      const classIds = classes.map(c => c.id)

      if (classIds.length > 0) {
        // 删除评价记录
        const deleteEvals = db.prepare('DELETE FROM evaluation_records WHERE class_id IN (' + classIds.map(() => '?').join(',') + ')')
        deleteEvals.run(...classIds)

        // 删除学生-标签关联
        const students = db.prepare('SELECT id FROM students WHERE class_id IN (' + classIds.map(() => '?').join(',') + ')').all(...classIds)
        const studentIds = students.map(s => s.id)
        if (studentIds.length > 0) {
          db.prepare('DELETE FROM student_tag_relations WHERE student_id IN (' + studentIds.map(() => '?').join(',') + ')').run(...studentIds)
        }

        // 删除学生
        const deleteStudents = db.prepare('DELETE FROM students WHERE class_id IN (' + classIds.map(() => '?').join(',') + ')')
        deleteStudents.run(...classIds)

        // 删除班级
        db.prepare('DELETE FROM classes WHERE user_id = ?').run(userId)
      }

      // 删除用户标签（会级联删除 student_tag_relations，因为有外键）
      db.prepare('DELETE FROM student_tags WHERE user_id = ?').run(userId)

      // 删除用户的帖子评论
      db.prepare('DELETE FROM post_comments WHERE user_id = ?').run(userId)

      // 获取用户的帖子
      const posts = db.prepare('SELECT id FROM posts WHERE user_id = ?').all(userId)
      const postIds = posts.map(p => p.id)
      if (postIds.length > 0) {
        // 删除帖子的评论
        db.prepare('DELETE FROM post_comments WHERE post_id IN (' + postIds.map(() => '?').join(',') + ')').run(...postIds)
        // 删除帖子
        db.prepare('DELETE FROM posts WHERE user_id = ?').run(userId)
      }

      // 删除用户
      db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    })()

    res.json({ success: true, message: `已删除用户 ${user.username}` })
  } catch (err) {
    console.error('删除用户失败:', err)
    res.status(500).json({ error: '删除失败，请稍后重试' })
  }
})

// 获取近7天详细统计数据
router.get('/daily-stats', authMiddleware, adminMiddleware, (req, res) => {
  // 计算7天前的时间戳（毫秒）
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  // 每天新增用户
  const newUsers = db.prepare(`
    SELECT date(created_at/1000, 'unixepoch', 'localtime') as date, count(*) as count
    FROM users
    WHERE is_guest = 0 AND created_at >= ?
    GROUP BY date
  `).all(sevenDaysAgo)

  // 每天新增班级
  const newClasses = db.prepare(`
    SELECT date(created_at/1000, 'unixepoch', 'localtime') as date, count(*) as count
    FROM classes
    WHERE created_at >= ?
    GROUP BY date
  `).all(sevenDaysAgo)

  // 每天新增学生
  const newStudents = db.prepare(`
    SELECT date(created_at/1000, 'unixepoch', 'localtime') as date, count(*) as count
    FROM students
    WHERE created_at >= ?
    GROUP BY date
  `).all(sevenDaysAgo)

  // 每天评价数
  const evaluations = db.prepare(`
    SELECT date(timestamp/1000, 'unixepoch', 'localtime') as date, count(*) as count
    FROM evaluation_records
    WHERE timestamp >= ?
    GROUP BY date
  `).all(sevenDaysAgo)

  // 转换为日期 -> 数量的映射
  const toMap = (arr) => {
    const map = {}
    arr.forEach(item => { map[item.date] = item.count })
    return map
  }

  const usersMap = toMap(newUsers)
  const classesMap = toMap(newClasses)
  const studentsMap = toMap(newStudents)
  const evalsMap = toMap(evaluations)

  // 生成最近7天的日期列表（从6天前到今天，使用本地时区）
  const dates = []
  const now = new Date()
  const todayStr = now.toLocaleDateString('sv-SE') // YYYY-MM-DD format in local time
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(d.toLocaleDateString('sv-SE'))
  }

  // 组装结果，确保每天都有数据
  const result = dates.map(date => ({
    date,
    newUsers: usersMap[date] || 0,
    newClasses: classesMap[date] || 0,
    newStudents: studentsMap[date] || 0,
    evaluations: evalsMap[date] || 0
  }))

  res.json({ dailyStats: result })
})

export default router