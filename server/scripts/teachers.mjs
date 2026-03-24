#!/usr/bin/env node
/**
 * 查询所有老师及其班级统计
 * 用法: node server/scripts/teachers.mjs
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, '../luomor-pet.db'));

// 查询所有用户（包括游客）
const users = db.prepare(`
  SELECT id, username, is_guest, created_at
  FROM users
  ORDER BY is_guest ASC, created_at DESC
`).all();

console.log('=== 用户及班级统计 ===\n');

users.forEach((t, i) => {
  const label = t.is_guest ? '[游客]' : '[老师]';
  
  // 查询用户的班级
  const classes = db.prepare(`
    SELECT
      c.id,
      c.name,
      (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count,
      (SELECT COUNT(*) FROM evaluation_records WHERE class_id = c.id) as eval_count
    FROM classes c
    WHERE c.user_id = ?
    ORDER BY eval_count DESC
  `).all(t.id);

  const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0);
  const totalEvals = classes.reduce((sum, c) => sum + c.eval_count, 0);

  console.log(`${i + 1}. ${label} ${t.username}`);
  console.log(`   班级数: ${classes.length} | 学生数: ${totalStudents} | 评价数: ${totalEvals}`);

  if (classes.length > 0) {
    classes.forEach(c => {
      console.log(`   - ${c.name}: ${c.student_count} 人, ${c.eval_count} 条评价`);
    });
  } else {
    console.log('   (暂无班级)');
  }
  console.log('');
});

// 汇总
const totalStats = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM users WHERE is_guest = 0 OR is_guest IS NULL) as teachers,
    (SELECT COUNT(*) FROM classes) as classes,
    (SELECT COUNT(*) FROM students) as students,
    (SELECT COUNT(*) FROM evaluation_records) as evaluations
`).get();

console.log('=== 汇总 ===');
console.log(`用户: ${totalStats.users} 人 (老师 ${totalStats.teachers} 人, 游客 ${totalStats.users - totalStats.teachers} 人)`);
console.log(`班级: ${totalStats.classes} 个`);
console.log(`学生: ${totalStats.students} 人`);
console.log(`评价: ${totalStats.evaluations} 条`);

db.close();