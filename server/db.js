import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 支持测试模式使用内存数据库
const isDocker = fs.existsSync('/.dockerenv')
const dbPath = process.env.TEST_DB ? ':memory:' : (isDocker ? '/db/luomor-pet.db' : join(__dirname, 'luomor-pet.db'))
export const db = new Database(dbPath)

// 初始化数据库表
export function initDb() {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      created_at INTEGER
    );

    -- 班级表
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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
      pet_status TEXT DEFAULT 'alive',
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

    -- 学生标签表（用户隔离）
    CREATE TABLE IF NOT EXISTS student_tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      created_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 学生-标签关联表
    CREATE TABLE IF NOT EXISTS student_tag_relations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at INTEGER,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (tag_id) REFERENCES student_tags(id)
    );

    -- 留言板帖子表
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 帖子评论表
    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 帖子投票表（点赞/点踩）
    CREATE TABLE IF NOT EXISTS post_votes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote_type INTEGER NOT NULL,  -- 1=赞, -1=踩
      created_at INTEGER,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(post_id, user_id)  -- 每个用户对每个帖子只能投一次
    );

    -- 复活任务表（用户隔离）
    CREATE TABLE IF NOT EXISTS revival_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_preset INTEGER DEFAULT 0,  -- 是否为系统预置任务
      is_enabled INTEGER DEFAULT 1,  -- 是否启用（用户可禁用预置任务）
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 学生复活任务分配表
    CREATE TABLE IF NOT EXISTS student_revival_tasks (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',  -- pending | completed
      assigned_at INTEGER,
      completed_at INTEGER,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (task_id) REFERENCES revival_tasks(id)
    );

    -- 复活记录表
    CREATE TABLE IF NOT EXISTS revival_records (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      revived_at INTEGER,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );
  `)

  // 迁移：添加 pet_status 字段（如果不存在）
  try {
    db.exec(`ALTER TABLE students ADD COLUMN pet_status TEXT DEFAULT 'alive'`)
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // 迁移：添加 user_id 到 evaluation_rules（如果不存在）
  try {
    db.exec(`ALTER TABLE evaluation_rules ADD COLUMN user_id TEXT`)
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // 迁移：添加 user_id 到 evaluation_records（如果不存在）
  try {
    db.exec(`ALTER TABLE evaluation_records ADD COLUMN user_id TEXT`)
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // 迁移：添加 is_admin 到 users（如果不存在）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`)
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // 迁移：添加 revival_enabled 到 users（如果不存在）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN revival_enabled INTEGER DEFAULT 0`)
  } catch (e) {
    // 字段已存在，忽略错误
  }
}
