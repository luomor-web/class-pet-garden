import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 默认规则模板（完整版）
const DEFAULT_RULES = [
  // ===== 学习 =====
  { name: '平时测验满分', points: 3, category: '学习' },
  { name: '作业完成优秀', points: 3, category: '学习' },
  { name: '平时测验达优秀', points: 2, category: '学习' },
  { name: '单元测验显著进步', points: 2, category: '学习' },
  { name: '课堂积极发言', points: 2, category: '学习' },
  { name: '作业完成优秀', points: 1, category: '学习' },
  { name: '默写全对', points: 1, category: '学习' },
  { name: '订正态度认真', points: 1, category: '学习' },
  { name: '优秀作业,值得表扬', points: 1, category: '学习' },
  { name: '近期学习状态进步', points: 1, category: '学习' },
  { name: '被老师点名表扬', points: 1, category: '学习' },
  { name: '不交作业', points: -1, category: '学习' },
  { name: '作业潦草', points: -1, category: '学习' },
  { name: '未完成作业', points: -2, category: '学习' },
  { name: '订正不认真', points: -2, category: '学习' },
  { name: '学习显著退步', points: -2, category: '学习' },
  { name: '抄袭作业', points: -5, category: '学习' },
  { name: '考试作弊', points: -5, category: '学习' },
  
  // ===== 行为 =====
  { name: '拾金不昧(贵重物品)', points: 5, category: '行为' },
  { name: '主动帮助生病同学', points: 3, category: '行为' },
  { name: '主动调解同学矛盾、化解冲突', points: 3, category: '行为' },
  { name: '做好人好事被学校提出表扬', points: 3, category: '行为' },
  { name: '积极参与校内外志愿服务', points: 3, category: '行为' },
  { name: '守纪表现优秀(被表扬)', points: 2, category: '行为' },
  { name: '主动帮助同学', points: 2, category: '行为' },
  { name: '拾金不昧(一般物品)', points: 2, category: '行为' },
  { name: '帮助同学', points: 2, category: '行为' },
  { name: '早读认真专注', points: 1, category: '行为' },
  { name: '课前准备充分', points: 1, category: '行为' },
  { name: '眼保健操全程认真', points: 1, category: '行为' },
  { name: '升旗仪式安静整齐', points: 1, category: '行为' },
  { name: '犯错主动认错,积极协商', points: 1, category: '行为' },
  { name: '遵守纪律', points: 1, category: '行为' },
  { name: '无故迟到或早退', points: -1, category: '行为' },
  { name: '未佩戴红领巾,不穿校服', points: -1, category: '行为' },
  { name: '上课讲话、开小差', points: -1, category: '行为' },
  { name: '中午自习说话、随意走动', points: -1, category: '行为' },
  { name: '排队时说话或小动作不停,被点名', points: -1, category: '行为' },
  { name: '迟到', points: -1, category: '行为' },
  { name: '撒谎、隐瞒真实情况', points: -2, category: '行为' },
  { name: '说脏话,骂人,起绰号', points: -2, category: '行为' },
  { name: '私自旷课或课间操', points: -3, category: '行为' },
  { name: '扰乱课堂', points: -3, category: '行为' },
  { name: '课间追逐打闹', points: -3, category: '行为' },
  { name: '追逐打闹(酿成事故)', points: -3, category: '行为' },
  { name: '私自带玩具或零食或危险物品', points: -3, category: '行为' },
  { name: '挑拨离间、拉帮结派', points: -3, category: '行为' },
  { name: '不尊重同学、孤立他人', points: -3, category: '行为' },
  { name: '为私欲包庇犯错者', points: -3, category: '行为' },
  { name: '恶意举报、诬陷他人', points: -3, category: '行为' },
  { name: '课堂捣乱', points: -3, category: '行为' },
  { name: '传播脏话或不良歌谣', points: -5, category: '行为' },
  { name: '破坏校园设施', points: -5, category: '行为' },
  { name: '欺负、推搡、伤害同学', points: -10, category: '行为' },
  
  // ===== 健康 =====
  { name: '主动倒垃圾并套垃圾袋', points: 2, category: '健康' },
  { name: '主动打扫卫生', points: 2, category: '健康' },
  { name: '坚持运动', points: 2, category: '健康' },
  { name: '认真完成包干区值日', points: 1, category: '健康' },
  { name: '主动为班级擦黑板', points: 1, category: '健康' },
  { name: '主动整理讲台', points: 1, category: '健康' },
  { name: '主动整理黑板粉笔槽', points: 1, category: '健康' },
  { name: '座位整洁无涂画,桌椅干净', points: 1, category: '健康' },
  { name: '座位周围无垃圾', points: 1, category: '健康' },
  { name: '个人座位卫生不合格', points: -1, category: '健康' },
  { name: '校园内乱扔垃圾', points: -1, category: '健康' },
  { name: '桌洞脏乱、物品杂乱', points: -1, category: '健康' },
  { name: '不讲卫生', points: -1, category: '健康' },
  { name: '打扫包干区时间玩耍,不认真', points: -2, category: '健康' },
  { name: '破坏卫生、乱涂乱画', points: -2, category: '健康' },
  { name: '浪费粮食', points: -2, category: '健康' },
  { name: '破坏班级绿植、把玩绿植', points: -3, category: '健康' },
  
  // ===== 其他 =====
  { name: '区级及以上:一等奖', points: 8, category: '其他' },
  { name: '区级及以上:二等奖', points: 6, category: '其他' },
  { name: '校级比赛:一等奖', points: 5, category: '其他' },
  { name: '为班级争得荣誉', points: 5, category: '其他' },
  { name: '校级比赛:二等奖', points: 4, category: '其他' },
  { name: '区级及以上:三等奖', points: 4, category: '其他' },
  { name: '代表班级参赛', points: 3, category: '其他' },
  { name: '校级比赛:三等奖', points: 3, category: '其他' },
  { name: '主动整理图书、摆放整齐', points: 2, category: '其他' },
  { name: '主动帮同学更换桌椅', points: 2, category: '其他' },
  { name: '主动承担班级任务', points: 2, category: '其他' },
  { name: '积极参加班级墙面布置', points: 2, category: '其他' },
  { name: '活动中表现优秀', points: 2, category: '其他' },
  { name: '联欢会或文艺汇演积极参与', points: 2, category: '其他' },
  { name: '小组全周无违纪、全员交作业', points: 2, category: '其他' },
  { name: '积极参加班级或学校活动', points: 1, category: '其他' },
  { name: '损坏公物、乱刻乱画', points: -1, category: '其他' },
  { name: '浪费水电、屡教不改', points: -1, category: '其他' },
  { name: '故意损坏卫生工具', points: -2, category: '其他' },
  { name: '故意玩弄损坏公共电器', points: -3, category: '其他' },
  { name: '扣分严重/打架/作弊/严重违纪', points: -8, category: '其他' },
]

// 为用户复制默认规则（使用事务批量插入）
function copyDefaultRules(userId) {
  const now = Date.now()
  const stmt = db.prepare(`
    INSERT INTO evaluation_rules (id, name, points, category, user_id, created_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  // 使用事务包装，84 条规则一次性提交
  const insertMany = db.transaction((rules) => {
    for (const rule of rules) {
      stmt.run(uuidv4(), rule.name, rule.points, rule.category, userId, now)
    }
  })

  insertMany(DEFAULT_RULES)
  return DEFAULT_RULES.length
}

// 获取规则列表（完全用户隔离）
router.get('/', authMiddleware, (req, res) => {
  let rules = db.prepare(`
    SELECT * FROM evaluation_rules
    WHERE user_id = ?
    ORDER BY 
      CASE WHEN points > 0 THEN 0 ELSE 1 END,
      points DESC,
      created_at DESC
  `).all(req.userId)
  
  // 新用户自动初始化默认规则
  if (rules.length === 0) {
    copyDefaultRules(req.userId)
    rules = db.prepare(`
      SELECT * FROM evaluation_rules
      WHERE user_id = ?
      ORDER BY 
        CASE WHEN points > 0 THEN 0 ELSE 1 END,
        points DESC,
        created_at DESC
    `).all(req.userId)
  }
  
  res.json({ rules })
})

// 添加规则
router.post('/', authMiddleware, (req, res) => {
  const { name, points, category } = req.body
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '规则名称不能为空' })
  }
  
  const id = uuidv4()
  const now = Date.now()
  
  db.prepare(`
    INSERT INTO evaluation_rules (id, name, points, category, user_id, created_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), points || 0, category || '其他', req.userId, now)
  
  res.json({ 
    id, 
    name: name.trim(), 
    points: points || 0, 
    category: category || '其他',
    user_id: req.userId, 
    created_at: now 
  })
})

// 重置为默认规则（必须在 /:id 路由之前）
router.post('/reset', authMiddleware, (req, res) => {
  try {
    // 删除用户所有规则
    db.prepare('DELETE FROM evaluation_rules WHERE user_id = ?').run(req.userId)
    
    // 复制默认模板
    const count = copyDefaultRules(req.userId)
    
    // 返回新规则
    const rules = db.prepare(`
      SELECT * FROM evaluation_rules
      WHERE user_id = ?
      ORDER BY category, points DESC
    `).all(req.userId)
    
    res.json({ success: true, rules, count })
  } catch (error) {
    console.error('Reset rules error:', error)
    res.status(500).json({ error: '重置失败' })
  }
})

// 更新规则
router.put('/:id', authMiddleware, (req, res) => {
  const { name, points, category } = req.body
  
  const result = db.prepare(`
    UPDATE evaluation_rules 
    SET name = ?, points = ?, category = ?
    WHERE id = ? AND user_id = ?
  `).run(name?.trim() || '', points || 0, category || '其他', req.params.id, req.userId)
  
  if (result.changes === 0) {
    return res.status(404).json({ error: '规则不存在或无权修改' })
  }
  
  res.json({ success: true })
})

// 删除规则（用户可删除自己的任何规则）
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare(`
    DELETE FROM evaluation_rules 
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.userId)
  
  if (result.changes === 0) {
    return res.status(404).json({ error: '规则不存在或无权删除' })
  }
  
  res.json({ success: true })
})

// 获取用户最常用的规则（从评价记录统计）
router.get('/frequent', authMiddleware, (req, res) => {
  // 只返回当前用户还存在的规则（包括用户自己的规则和公共规则）
  // 先展示加分规则，再展示减分规则
  const frequentRules = db.prepare(`
    SELECT 
      er.reason as name,
      er.points,
      er.category,
      COUNT(*) as use_count
    FROM evaluation_records er
    WHERE er.user_id = ?
    AND EXISTS (
      SELECT 1 FROM evaluation_rules r 
      WHERE (r.user_id = ? OR r.user_id IS NULL)
      AND r.name = er.reason 
      AND r.points = er.points
    )
    GROUP BY er.reason, er.points, er.category
    ORDER BY 
      CASE WHEN er.points > 0 THEN 0 ELSE 1 END,
      use_count DESC
    LIMIT 25
  `).all(req.userId, req.userId)

  res.json({ rules: frequentRules })
})

export default router