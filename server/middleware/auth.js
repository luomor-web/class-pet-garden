import { verifyToken } from '../utils/token.js'

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const payload = verifyToken(token)

  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期' })
  }

  req.userId = payload.userId
  next()
}

export function optionalAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const payload = verifyToken(token)

  if (payload) {
    req.userId = payload.userId
  }

  next()
}
