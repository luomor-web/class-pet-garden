import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

// 设置测试环境
process.env.TEST_DB = '1'

// 创建测试 app
const app = express()
app.use(cors())
app.use(express.json())

// 导入路由（在设置 TEST_DB 后导入）
const authRoutes = (await import('../routes/auth.js')).default
const classRoutes = (await import('../routes/classes.js')).default
const studentRoutes = (await import('../routes/students.js')).default
const evaluationRoutes = (await import('../routes/evaluations.js')).default
const ruleRoutes = (await import('../routes/rules.js')).default

const { db } = await import('../db.js')

app.use('/api/auth', authRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/evaluations', evaluationRoutes)
app.use('/api/rules', ruleRoutes)

// 初始化数据库
function initTestDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );

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

    CREATE TABLE IF NOT EXISTS evaluation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      points INTEGER NOT NULL,
      category TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0,
      created_at INTEGER
    );

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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      pet_type TEXT NOT NULL,
      earned_at INTEGER,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
  `)

  // 插入默认规则
  const now = Date.now()
  const insertRule = db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)')
  insertRule.run(uuidv4(), '作业完成优秀', 1, '学习', now)
  insertRule.run(uuidv4(), '迟到', -1, '行为', now)
}

beforeAll(() => {
  initTestDb()
})

afterAll(() => {
  if (db) db.close()
})

describe('Auth API', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.username).toBe('testuser')
  })

  it('should reject duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'duplicate', password: 'password123' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'duplicate', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('已存在')
  })

  it('should login with correct credentials', async () => {
    // 先注册
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'password123' })

    // 再登录
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeTruthy()
  })

  it('should reject wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'wrongpass', password: 'password123' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wrongpass', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toContain('错误')
  })
})

describe('Classes API', () => {
  let token

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'classuser', password: 'password123' })
    token = res.body.token
  })

  it('should create a class', async () => {
    const res = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '测试班级' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('测试班级')
  })

  it('should list classes', async () => {
    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.classes).toBeInstanceOf(Array)
    expect(res.body.classes.length).toBeGreaterThan(0)
  })

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .get('/api/classes')

    expect(res.status).toBe(401)
  })
})

describe('Students API', () => {
  let token, classId

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'studentuser', password: 'password123' })
    token = res.body.token

    const classRes = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '学生测试班级' })
    classId = classRes.body.id
  })

  it('should add a student', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ classId, name: '张三', studentNo: '001' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('张三')
    expect(res.body.student_no).toBe('001')
  })

  it('should list students in a class', async () => {
    const res = await request(app)
      .get(`/api/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.students).toBeInstanceOf(Array)
    expect(res.body.students.length).toBeGreaterThan(0)
  })
})

describe('Rules API', () => {
  it('should list rules', async () => {
    const res = await request(app)
      .get('/api/rules')

    expect(res.status).toBe(200)
    expect(res.body.rules).toBeInstanceOf(Array)
    expect(res.body.rules.length).toBeGreaterThan(0)
  })
})