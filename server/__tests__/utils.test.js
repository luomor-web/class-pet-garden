import { describe, it, expect, beforeEach } from 'vitest'
import { calculateLevel, getLevelProgress, LEVEL_CONFIG } from '../utils/level.js'

describe('Level Utils', () => {
  describe('calculateLevel', () => {
    it('should return 1 for 0 exp', () => {
      expect(calculateLevel(0)).toBe(1)
    })

    it('should return 1 for exp less than first threshold', () => {
      expect(calculateLevel(19)).toBe(1)
    })

    it('should return 2 when exp reaches first threshold', () => {
      expect(calculateLevel(20)).toBe(2)
    })

    it('should return 3 for 50 exp', () => {
      expect(calculateLevel(50)).toBe(3)
    })

    it('should return 8 (max) for high exp', () => {
      expect(calculateLevel(1000)).toBe(8)
    })
  })

  describe('getLevelProgress', () => {
    it('should return correct progress for level 1', () => {
      const progress = getLevelProgress(10)
      expect(progress.level).toBe(1)
      expect(progress.current).toBe(10)
      expect(progress.required).toBe(20)
      expect(progress.percentage).toBe(50)
      expect(progress.isMaxLevel).toBe(false)
    })

    it('should return correct progress for level 2', () => {
      const progress = getLevelProgress(35)
      expect(progress.level).toBe(2)
      expect(progress.current).toBe(15)
      expect(progress.required).toBe(30)
    })

    it('should show max level for level 8', () => {
      const progress = getLevelProgress(1000)
      expect(progress.level).toBe(8)
      expect(progress.isMaxLevel).toBe(true)
      expect(progress.percentage).toBe(100)
    })
  })
})

describe('Password Utils', () => {
  let hashPassword, verifyPassword

  beforeEach(async () => {
    const mod = await import('../utils/password.js')
    hashPassword = mod.hashPassword
    verifyPassword = mod.verifyPassword
  })

  it('should hash password consistently', () => {
    const hash1 = hashPassword('test123')
    const hash2 = hashPassword('test123')
    expect(hash1).toBe(hash2)
  })

  it('should verify correct password', () => {
    const hash = hashPassword('mypassword')
    expect(verifyPassword('mypassword', hash)).toBe(true)
  })

  it('should reject wrong password', () => {
    const hash = hashPassword('mypassword')
    expect(verifyPassword('wrongpassword', hash)).toBe(false)
  })

  it('should verify old SHA256 hash', () => {
    // 旧格式：纯 SHA256
    const oldHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' // '123456'
    expect(verifyPassword('123456', oldHash)).toBe(true)
  })
})

describe('Token Utils', () => {
  let generateToken, verifyToken

  beforeEach(async () => {
    const mod = await import('../utils/token.js')
    generateToken = mod.generateToken
    verifyToken = mod.verifyToken
  })

  it('should generate valid token', () => {
    const token = generateToken('user123')
    expect(token).toBeTruthy()
    expect(token.split(':').length).toBe(3)
  })

  it('should verify valid token', () => {
    const token = generateToken('user123')
    const payload = verifyToken(token)
    expect(payload).toBeTruthy()
    expect(payload.userId).toBe('user123')
  })

  it('should reject invalid token', () => {
    expect(verifyToken('invalid-token')).toBeNull()
    expect(verifyToken('')).toBeNull()
    expect(verifyToken(null)).toBeNull()
  })
})