import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// 获取留言列表
router.get('/', (req, res) => {
  const posts = db.prepare(`
    SELECT 
      p.id, p.title, p.content, p.created_at, p.updated_at,
      u.username as author_name,
      u.id as author_id,
      u.is_admin as author_is_admin,
      (SELECT count(*) FROM post_votes WHERE post_id = p.id AND vote_type = 1) as upvotes,
      (SELECT count(*) FROM post_votes WHERE post_id = p.id AND vote_type = -1) as downvotes,
      (SELECT count(*) FROM post_comments WHERE post_id = p.id) as comment_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `).all()

  res.json({ posts })
})

// 获取单个帖子详情（含评论）
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT 
      p.id, p.title, p.content, p.created_at, p.updated_at,
      u.username as author_name,
      u.id as author_id,
      u.is_admin as author_is_admin,
      (SELECT count(*) FROM post_votes WHERE post_id = p.id AND vote_type = 1) as upvotes,
      (SELECT count(*) FROM post_votes WHERE post_id = p.id AND vote_type = -1) as downvotes
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id)

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  // 获取评论
  const comments = db.prepare(`
    SELECT 
      c.id, c.content, c.created_at,
      u.username as author_name,
      u.id as author_id,
      u.is_admin as author_is_admin
    FROM post_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id)

  res.json({ post, comments })
})

// 创建帖子（需要登录，非游客）
router.post('/', authMiddleware, (req, res) => {
  // 检查是否是游客
  const user = db.prepare('SELECT is_guest FROM users WHERE id = ?').get(req.userId)
  if (!user || user.is_guest) {
    return res.status(403).json({ error: '游客无法发帖' })
  }

  const { title, content } = req.body
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '标题不能为空' })
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '内容不能为空' })
  }
  if (content.length > 300) {
    return res.status(400).json({ error: '内容不能超过300字' })
  }

  const id = randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO posts (id, user_id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, title.trim(), content.trim(), now, now)

  res.json({ 
    id, 
    title: title.trim(), 
    content: content.trim(),
    created_at: now,
    updated_at: now
  })
})

// 删除帖子（仅作者本人或管理员）
router.delete('/:id', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(req.params.id)
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  // 检查权限：作者或管理员
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId)
  if (post.user_id !== req.userId && !user?.is_admin) {
    return res.status(403).json({ error: '只能删除自己的帖子' })
  }

  // 级联删除评论和投票
  db.transaction(() => {
    db.prepare('DELETE FROM post_comments WHERE post_id = ?').run(req.params.id)
    db.prepare('DELETE FROM post_votes WHERE post_id = ?').run(req.params.id)
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id)
  })()

  res.json({ success: true })
})

// 投票（点赞/点踩）
router.post('/:id/vote', authMiddleware, (req, res) => {
  // 检查是否是游客
  const user = db.prepare('SELECT is_guest FROM users WHERE id = ?').get(req.userId)
  if (!user || user.is_guest) {
    return res.status(403).json({ error: '游客无法投票' })
  }

  const { voteType } = req.body // 1=赞, -1=踩, 0=取消
  if (![-1, 0, 1].includes(voteType)) {
    return res.status(400).json({ error: '无效的投票类型' })
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id)
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  // 检查是否已投票
  const existingVote = db.prepare(`
    SELECT id, vote_type FROM post_votes WHERE post_id = ? AND user_id = ?
  `).get(req.params.id, req.userId)

  if (voteType === 0) {
    // 取消投票
    if (existingVote) {
      db.prepare('DELETE FROM post_votes WHERE id = ?').run(existingVote.id)
    }
    res.json({ success: true, voteType: 0 })
  } else {
    // 添加或更新投票
    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // 重复点击相同类型，取消投票
        db.prepare('DELETE FROM post_votes WHERE id = ?').run(existingVote.id)
        res.json({ success: true, voteType: 0 })
      } else {
        // 切换投票类型
        db.prepare('UPDATE post_votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id)
        res.json({ success: true, voteType })
      }
    } else {
      // 新投票
      const id = randomUUID()
      db.prepare(`
        INSERT INTO post_votes (id, post_id, user_id, vote_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, req.params.id, req.userId, voteType, Date.now())
      res.json({ success: true, voteType })
    }
  }
})

// 获取用户对帖子的投票状态
router.get('/:id/vote', authMiddleware, (req, res) => {
  const vote = db.prepare(`
    SELECT vote_type FROM post_votes WHERE post_id = ? AND user_id = ?
  `).get(req.params.id, req.userId)

  res.json({ voteType: vote ? vote.vote_type : 0 })
})

// 添加评论
router.post('/:id/comments', authMiddleware, (req, res) => {
  // 检查是否是游客
  const user = db.prepare('SELECT is_guest FROM users WHERE id = ?').get(req.userId)
  if (!user || user.is_guest) {
    return res.status(403).json({ error: '游客无法评论' })
  }

  const { content } = req.body
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' })
  }
  if (content.length > 300) {
    return res.status(400).json({ error: '评论不能超过300字' })
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id)
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  const id = randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO post_comments (id, post_id, user_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.id, req.userId, content.trim(), now)

  // 获取用户信息
  const author = db.prepare('SELECT username, is_admin FROM users WHERE id = ?').get(req.userId)

  res.json({ 
    id, 
    content: content.trim(),
    created_at: now,
    author_name: author.username,
    author_id: req.userId,
    author_is_admin: author.is_admin
  })
})

// 删除评论（仅作者本人或管理员）
router.delete('/:postId/comments/:commentId', authMiddleware, (req, res) => {
  const comment = db.prepare(`
    SELECT id, user_id, post_id FROM post_comments WHERE id = ? AND post_id = ?
  `).get(req.params.commentId, req.params.postId)

  if (!comment) {
    return res.status(404).json({ error: '评论不存在' })
  }

  // 检查权限：作者或管理员
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId)
  if (comment.user_id !== req.userId && !user?.is_admin) {
    return res.status(403).json({ error: '只能删除自己的评论' })
  }

  db.prepare('DELETE FROM post_comments WHERE id = ?').run(req.params.commentId)
  res.json({ success: true })
})

export default router