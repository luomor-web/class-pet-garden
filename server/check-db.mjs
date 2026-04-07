import Database from 'better-sqlite3';

const db = new Database('./pet-garden.db');

console.log('\n=== 数据库检查报告 ===\n');

// 1. 用户表
const users = db.prepare('SELECT id, username, is_admin, is_guest, created_at FROM users').all();
console.log(`【用户表】共 ${users.length} 条记录：`);
users.forEach(u => {
  const role = u.is_admin ? '管理员' : (u.is_guest ? '访客' : '教师');
  console.log(`  [${u.id}] ${u.username} (${role})`);
});
const userIds = new Set(users.map(u => u.id));

// 2. 学生表
const students = db.prepare('SELECT id, name, class_id FROM students').all();
console.log(`\n【学生表】共 ${students.length} 条记录`);
const studentIds = new Set(students.map(s => s.id));

// 3. 班级表
const classes = db.prepare('SELECT id, name, user_id FROM classes').all();
console.log(`\n【班级表】共 ${classes.length} 条记录`);
const classIds = new Set(classes.map(c => c.id));

// 检查班级是否关联到有效用户
const classesWithInvalidUser = classes.filter(c => !userIds.has(c.user_id));
if (classesWithInvalidUser.length > 0) {
  console.log(`  ⚠️ 发现 ${classesWithInvalidUser.length} 个班级关联到不存在的用户！`);
  classesWithInvalidUser.forEach(c => console.log(`    - [${c.id}] ${c.name} (user_id: ${c.user_id})`));
} else {
  console.log(`  ✓ 所有班级都关联到有效用户`);
}

// 4. 检查学生是否关联到有效班级
const studentsWithInvalidClass = students.filter(s => !classIds.has(s.class_id));
console.log(`\n【学生-班级关联检查】`);
if (studentsWithInvalidClass.length > 0) {
  console.log(`  ⚠️ 发现 ${studentsWithInvalidClass.length} 个学生关联到不存在的班级！`);
  studentsWithInvalidClass.forEach(s => console.log(`    - [${s.id}] ${s.name} (class_id: ${s.class_id})`));
} else {
  console.log(`  ✓ 所有学生都关联到有效班级`);
}

// 5. 检查帖子
const posts = db.prepare('SELECT id, user_id, title FROM posts').all();
console.log(`\n【帖子表】共 ${posts.length} 条`);
const postsWithInvalidAuthor = posts.filter(p => !userIds.has(p.user_id));
if (postsWithInvalidAuthor.length > 0) {
  console.log(`  ⚠️ 发现 ${postsWithInvalidAuthor.length} 条帖子关联到不存在的用户：`);
  postsWithInvalidAuthor.forEach(p => console.log(`    - [${p.id}] "${p.title}" (user_id: ${p.user_id})`));
} else {
  console.log(`  ✓ 所有帖子作者都有效`);
}

// 6. 检查评论
const comments = db.prepare('SELECT id, post_id, user_id FROM post_comments').all();
console.log(`\n【评论表】共 ${comments.length} 条`);
const commentsWithInvalidAuthor = comments.filter(c => !userIds.has(c.user_id));
if (commentsWithInvalidAuthor.length > 0) {
  console.log(`  ⚠️ 发现 ${commentsWithInvalidAuthor.length} 条评论关联到不存在的用户`);
}

// 7. 检查投票
const votes = db.prepare('SELECT id, post_id, user_id FROM post_votes').all();
console.log(`\n【投票表】共 ${votes.length} 条`);
const votesWithInvalidUser = votes.filter(v => !userIds.has(v.user_id));
if (votesWithInvalidUser.length > 0) {
  console.log(`  ⚠️ 发现 ${votesWithInvalidUser.length} 条投票关联到不存在的用户`);
}

// 8. 检查兑换记录
const exchangeRecords = db.prepare('SELECT id, student_id, item_name FROM exchange_records').all();
console.log(`\n【兑换记录】共 ${exchangeRecords.length} 条`);
const exchangesWithInvalidStudent = exchangeRecords.filter(e => !studentIds.has(e.student_id));
if (exchangesWithInvalidStudent.length > 0) {
  console.log(`  ⚠️ 发现 ${exchangesWithInvalidStudent.length} 条兑换记录关联到不存在的学生`);
}

// 9. 检查评价记录
const evalRecords = db.prepare('SELECT id, student_id, user_id FROM evaluation_records').all();
console.log(`\n【评价记录】共 ${evalRecords.length} 条`);
const evalsWithInvalidStudent = evalRecords.filter(e => !studentIds.has(e.student_id));
const evalsWithInvalidUser = evalRecords.filter(e => e.user_id && !userIds.has(e.user_id));
if (evalsWithInvalidStudent.length > 0) {
  console.log(`  ⚠️ 发现 ${evalsWithInvalidStudent.length} 条评价记录关联到不存在的学生`);
}
if (evalsWithInvalidUser.length > 0) {
  console.log(`  ⚠️ 发现 ${evalsWithInvalidUser.length} 条评价记录关联到不存在的用户`);
}
if (evalsWithInvalidStudent.length === 0 && evalsWithInvalidUser.length === 0) {
  console.log(`  ✓ 所有评价记录关联都有效`);
}

// 10. 检查复活任务
const revivalTasks = db.prepare('SELECT id, student_id FROM student_revival_tasks').all();
console.log(`\n【学生复活任务】共 ${revivalTasks.length} 条`);
const revivalWithInvalidStudent = revivalTasks.filter(r => !studentIds.has(r.student_id));
if (revivalWithInvalidStudent.length > 0) {
  console.log(`  ⚠️ 发现 ${revivalWithInvalidStudent.length} 条复活任务关联到不存在的学生`);
}

// 11. 检查学生标签关联
const tagRelations = db.prepare('SELECT id, student_id FROM student_tag_relations').all();
console.log(`\n【学生标签关联】共 ${tagRelations.length} 条`);
const tagsWithInvalidStudent = tagRelations.filter(t => !studentIds.has(t.student_id));
if (tagsWithInvalidStudent.length > 0) {
  console.log(`  ⚠️ 发现 ${tagsWithInvalidStudent.length} 条标签关联到不存在的学生`);
}

// 汇总
console.log('\n=== 数据完整性汇总 ===');
console.log(`用户: ${users.length}`);
console.log(`班级: ${classes.length}`);
console.log(`学生: ${students.length}`);
console.log(`帖子: ${posts.length}`);
console.log(`评论: ${comments.length}`);
console.log(`投票: ${votes.length}`);
console.log(`兑换记录: ${exchangeRecords.length}`);
console.log(`评价记录: ${evalRecords.length}`);
console.log(`复活任务: ${revivalTasks.length}`);
console.log(`标签关联: ${tagRelations.length}`);

const issues = [
  classesWithInvalidUser.length,
  studentsWithInvalidClass.length,
  postsWithInvalidAuthor.length,
  commentsWithInvalidAuthor.length,
  votesWithInvalidUser.length,
  exchangesWithInvalidStudent.length,
  evalsWithInvalidStudent.length,
  evalsWithInvalidUser.length,
  revivalWithInvalidStudent.length,
  tagsWithInvalidStudent.length
].reduce((a, b) => a + b, 0);

if (issues === 0) {
  console.log('\n✅ 数据库完整性检查通过，没有发现无效数据！');
} else {
  console.log(`\n⚠️ 共发现 ${issues} 处数据完整性问题，需要清理！`);
}

db.close();