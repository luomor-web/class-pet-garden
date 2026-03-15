import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 3002

// Middleware
app.use(cors())
app.use(express.json())

// Database - 使用绝对路径
const dbPath = join(__dirname, 'pet-garden.db')
const db = new Database(dbPath)

// Create tables
db.exec(`
  -- 班级表
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  );

  -- 学生表
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    name TEXT NOT NULL,
    student_no TEXT,
    total_points INTEGER DEFAULT 0,
    pet_type TEXT,
    pet_level INTEGER DEFAULT 1,
    pet_exp INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );

  -- 徽章表
  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    pet_type TEXT NOT NULL,
    earned_at INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  -- 评价规则表
  CREATE TABLE IF NOT EXISTS evaluation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    points INTEGER NOT NULL,
    category TEXT NOT NULL,
    is_custom INTEGER DEFAULT 0,
    created_at INTEGER
  );

  -- 评价记录表
  CREATE TABLE IF NOT EXISTS evaluation_records (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    category TEXT NOT NULL,
    timestamp INTEGER,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  -- 商品表
  CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    image TEXT
  );

  -- 兑换记录表
  CREATE TABLE IF NOT EXISTS exchange_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT,
    price INTEGER,
    timestamp INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  -- 设置表
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`)

// Initialize default rules if not exists
const rulesCount = db.prepare('SELECT COUNT(*) as count FROM evaluation_rules').get()
if (rulesCount && rulesCount.count === 0) {
  const defaultRules = [
    // 学习加分
    { id: uuidv4(), name: '作业完成优秀', points: 1, category: '学习' },
    { id: uuidv4(), name: '平时测验满分', points: 3, category: '学习' },
    { id: uuidv4(), name: '平时测验达优秀', points: 2, category: '学习' },
    { id: uuidv4(), name: '默写全对', points: 1, category: '学习' },
    { id: uuidv4(), name: '订正态度认真', points: 1, category: '学习' },
    { id: uuidv4(), name: '被老师点名表扬', points: 1, category: '学习' },
    { id: uuidv4(), name: '单元测验显著进步', points: 2, category: '学习' },
    // 学习扣分
    { id: uuidv4(), name: '不交作业', points: -1, category: '学习' },
    { id: uuidv4(), name: '未完成作业', points: -2, category: '学习' },
    { id: uuidv4(), name: '作业潦草', points: -1, category: '学习' },
    { id: uuidv4(), name: '订正不认真', points: -2, category: '学习' },
    { id: uuidv4(), name: '抄袭作业', points: -5, category: '学习' },
    { id: uuidv4(), name: '考试作弊', points: -5, category: '学习' },
    // 行为加分
    { id: uuidv4(), name: '早读认真专注', points: 1, category: '行为' },
    { id: uuidv4(), name: '课前准备充分', points: 1, category: '行为' },
    { id: uuidv4(), name: '主动帮助同学', points: 2, category: '行为' },
    { id: uuidv4(), name: '拾金不昧', points: 2, category: '行为' },
    // 行为扣分
    { id: uuidv4(), name: '无故迟到或早退', points: -1, category: '行为' },
    { id: uuidv4(), name: '上课讲话、开小差', points: -1, category: '行为' },
    { id: uuidv4(), name: '说脏话、骂人', points: -2, category: '行为' },
    { id: uuidv4(), name: '欺负同学', points: -10, category: '行为' },
  ]
  
  const insertRule = db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)')
  const now = Date.now()
  for (const rule of defaultRules) {
    insertRule.run(rule.id, rule.name, rule.points, rule.category, now)
  }
}

// Initialize level config
const levelConfig = db.prepare("SELECT value FROM settings WHERE key = 'levelConfig'").get()
if (!levelConfig) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('levelConfig', ?)").run(JSON.stringify([40, 60, 80, 100, 120, 140, 160]))
}

// === API Routes ===

// Classes
app.get('/api/classes', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes ORDER BY created_at DESC').all()
  res.json({ classes })
})

app.post('/api/classes', (req, res) => {
  const { name } = req.body
  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT INTO classes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now)
  res.json({ id, name, created_at: now, updated_at: now })
})

app.put('/api/classes/:id', (req, res) => {
  const { name } = req.body
  const now = Date.now()
  db.prepare('UPDATE classes SET name = ?, updated_at = ? WHERE id = ?').run(name, now, req.params.id)
  res.json({ success: true })
})

app.delete('/api/classes/:id', (req, res) => {
  // Delete students in this class first
  db.prepare('DELETE FROM students WHERE class_id = ?').run(req.params.id)
  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Students
app.get('/api/classes/:classId/students', (req, res) => {
  const students = db.prepare('SELECT * FROM students WHERE class_id = ? ORDER BY name').all(req.params.classId)
  res.json({ students })
})

app.post('/api/students', (req, res) => {
  const { classId, name, studentNo } = req.body
  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, 0, 1, 0, ?)').run(id, classId, name, studentNo || null, now)
  res.json({ id, class_id: classId, name, student_no: studentNo || null, total_points: 0, pet_level: 1, pet_exp: 0, created_at: now })
})

app.put('/api/students/:id', (req, res) => {
  const { name, studentNo } = req.body
  db.prepare('UPDATE students SET name = ?, student_no = ? WHERE id = ?').run(name, studentNo || null, req.params.id)
  res.json({ success: true })
})

app.delete('/api/students/:id', (req, res) => {
  // 先删除相关的评价记录
  db.prepare('DELETE FROM evaluation_records WHERE student_id = ?').run(req.params.id)
  // 再删除学生
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Batch import students
app.post('/api/students/import', (req, res) => {
  const { classId, students } = req.body
  if (!classId || !students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Invalid input' })
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

// Pet
app.put('/api/students/:id/pet', (req, res) => {
  const { petType } = req.body
  const now = Date.now()
  
  // Get current student
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id)
  if (!student) {
    return res.status(404).json({ error: 'Student not found' })
  }
  
  // If student already has a pet, create a badge for it if level is 8
  if (student.pet_type && student.pet_level >= 8) {
    const badgeId = uuidv4()
    db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)').run(badgeId, req.params.id, student.pet_type, now)
  }
  
  // Update pet
  db.prepare('UPDATE students SET pet_type = ?, pet_level = 1, pet_exp = 0 WHERE id = ?').run(petType, req.params.id)
  
  res.json({ success: true, petType, petLevel: 1, petExp: 0 })
})

// Evaluation Rules
app.get('/api/rules', (req, res) => {
  const rules = db.prepare('SELECT * FROM evaluation_rules ORDER BY category, points DESC').all()
  res.json({ rules })
})

app.post('/api/rules', (req, res) => {
  const { name, points, category } = req.body
  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(id, name, points, category, now)
  res.json({ id, name, points, category, is_custom: 1, created_at: now })
})

app.delete('/api/rules/:id', (req, res) => {
  db.prepare('DELETE FROM evaluation_rules WHERE id = ? AND is_custom = 1').run(req.params.id)
  res.json({ success: true })
})

// Evaluations
app.post('/api/evaluations', (req, res) => {
  const { classId, studentId, points, reason, category } = req.body
  const id = uuidv4()
  const now = Date.now()
  
  // Insert record
  db.prepare('INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, classId, studentId, points, reason, category, now)
  
  // Update student points
  db.prepare('UPDATE students SET total_points = total_points + ? WHERE id = ?').run(points, studentId)
  
  // Get student info (after update)
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
  
  // Update pet exp if student has a pet
  // pet_exp should always equal total_points (with minimum 0)
  if (student && student.pet_type) {
    const newExp = Math.max(0, student.total_points)  // Sync with total_points
    let newLevel = student.pet_level
    
    // Level up logic (only for positive exp)
    if (newExp > 0) {
      const levelConfig = [40, 60, 80, 100, 120, 140, 160]
      let totalRequired = 0
      for (let i = 0; i < levelConfig.length; i++) {
        totalRequired += levelConfig[i]
        if (newExp >= totalRequired) {
          newLevel = i + 2
        }
      }
      newLevel = Math.min(newLevel, 8)
    } else {
      newLevel = 1  // Reset to level 1 if exp is 0
    }
    
    // Check if pet graduated (reached level 8)
    let graduated = false
    if (newLevel === 8 && student.pet_level < 8) {
      const badgeId = uuidv4()
      db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)').run(badgeId, studentId, student.pet_type, now)
      graduated = true
    }
    
    db.prepare('UPDATE students SET pet_exp = ?, pet_level = ? WHERE id = ?').run(newExp, newLevel, studentId)
    
    return res.json({ 
      id, 
      timestamp: now, 
      petLevel: newLevel, 
      petExp: newExp,
      levelUp: newLevel > student.pet_level,
      graduated
    })
  }
  
  res.json({ id, timestamp: now })
})

// Undo last evaluation
app.delete('/api/evaluations/latest', (req, res) => {
  const { classId } = req.query
  if (!classId) {
    return res.status(400).json({ error: 'classId required' })
  }
  
  // Get latest record
  const record = db.prepare('SELECT * FROM evaluation_records WHERE class_id = ? ORDER BY timestamp DESC LIMIT 1').get(classId)
  if (!record) {
    return res.status(404).json({ error: 'No record found' })
  }
  
  // Undo points
  db.prepare('UPDATE students SET total_points = total_points - ? WHERE id = ?').run(record.points, record.student_id)
  
  // Delete record
  db.prepare('DELETE FROM evaluation_records WHERE id = ?').run(record.id)
  
  res.json({ success: true, undone: record })
})

app.get('/api/evaluations', (req, res) => {
  const { classId, page = 1, pageSize = 20 } = req.query
  const offset = (Number(page) - 1) * Number(pageSize)
  
  let countQuery = 'SELECT COUNT(*) as total FROM evaluation_records er'
  let query = 'SELECT er.*, s.name as student_name FROM evaluation_records er JOIN students s ON er.student_id = s.id'
  const params = []
  const countParams = []
  
  if (classId) {
    query += ' WHERE er.class_id = ?'
    countQuery += ' WHERE class_id = ?'
    params.push(classId)
    countParams.push(classId)
  }
  
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

// Ranking
app.get('/api/classes/:classId/ranking', (req, res) => {
  const ranking = db.prepare(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM badges WHERE student_id = s.id) as badge_count
    FROM students s
    WHERE s.class_id = ?
    ORDER BY s.total_points DESC, s.pet_level DESC
  `).all(req.params.classId)
  res.json({ ranking })
})

// Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all()
  const result = {}
  for (const s of settings) {
    result[s.key] = JSON.parse(s.value)
  }
  res.json(result)
})

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Fix pet_exp for existing students
app.post('/api/fix-exp', (req, res) => {
  // Sync pet_exp with total_points for students with pets
  const result = db.prepare('UPDATE students SET pet_exp = MAX(0, total_points) WHERE pet_type IS NOT NULL').run()
  res.json({ success: true, updated: result.changes })
})

// Backup
app.get('/api/backup', (req, res) => {
  const backup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    classes: db.prepare('SELECT * FROM classes').all(),
    students: db.prepare('SELECT * FROM students').all(),
    rules: db.prepare('SELECT * FROM evaluation_rules').all(),
    records: db.prepare('SELECT * FROM evaluation_records').all(),
    badges: db.prepare('SELECT * FROM badges').all(),
    settings: db.prepare('SELECT * FROM settings').all()
  }
  res.setHeader('Content-Disposition', `attachment; filename="pet-garden-backup-${Date.now()}.json"`)
  res.json(backup)
})

// Restore
app.post('/api/restore', (req, res) => {
  const { classes, students, rules, records, badges, settings } = req.body
  
  if (!classes || !students) {
    return res.status(400).json({ error: 'Invalid backup data' })
  }
  
  try {
    // Clear existing data
    db.exec('DELETE FROM evaluation_records')
    db.exec('DELETE FROM badges')
    db.exec('DELETE FROM students')
    db.exec('DELETE FROM classes')
    db.exec('DELETE FROM evaluation_rules WHERE is_custom = 1')
    
    // Restore classes
    const insertClass = db.prepare('INSERT INTO classes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    for (const c of classes) {
      insertClass.run(c.id, c.name, c.created_at, c.updated_at)
    }
    
    // Restore students
    const insertStudent = db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_type, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const s of students) {
      insertStudent.run(s.id, s.class_id, s.name, s.student_no, s.total_points, s.pet_type, s.pet_level, s.pet_exp, s.created_at)
    }
    
    // Restore custom rules
    if (rules) {
      const insertRule = db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      for (const r of rules.filter(r => r.is_custom)) {
        insertRule.run(r.id, r.name, r.points, r.category, r.is_custom, r.created_at)
      }
    }
    
    // Restore records
    if (records) {
      const insertRecord = db.prepare('INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      for (const r of records) {
        insertRecord.run(r.id, r.class_id, r.student_id, r.points, r.reason, r.category, r.timestamp)
      }
    }
    
    // Restore badges
    if (badges) {
      const insertBadge = db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      for (const b of badges) {
        insertBadge.run(b.id, b.student_id, b.pet_type, b.earned_at)
      }
    }
    
    res.json({ success: true, message: '数据恢复成功' })
  } catch (error) {
    console.error('Restore error:', error)
    res.status(500).json({ error: '恢复失败' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})