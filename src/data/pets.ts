// 宠物类型定义
export interface PetType {
  id: string
  name: string
  category: 'normal' | 'mythical'
  image: string
}

// 宠物配置
export const PET_TYPES: PetType[] = [
  // 普通动物
  { id: 'west-highland', name: '西高地', category: 'normal', image: '/pet-garden/images/pets/normal/west-highland.png' },
  { id: 'bichon', name: '比熊', category: 'normal', image: '/pet-garden/images/pets/normal/bichon.png' },
  { id: 'border-collie', name: '边牧', category: 'normal', image: '/pet-garden/images/pets/normal/border-collie.png' },
  { id: 'shiba', name: '柴犬', category: 'normal', image: '/pet-garden/images/pets/normal/shiba.png' },
  { id: 'golden-retriever', name: '金毛', category: 'normal', image: '/pet-garden/images/pets/normal/golden-retriever.png' },
  { id: 'samoyed', name: '萨摩耶', category: 'normal', image: '/pet-garden/images/pets/normal/samoyed.png' },
  { id: 'husky', name: '哈士奇', category: 'normal', image: '/pet-garden/images/pets/normal/husky.png' },
  { id: 'tabby-cat', name: '虎斑猫', category: 'normal', image: '/pet-garden/images/pets/normal/tabby-cat.png' },
  { id: 'persian-cat', name: '波斯猫', category: 'normal', image: '/pet-garden/images/pets/normal/persian-cat.png' },
  { id: 'ragdoll-cat', name: '布偶猫', category: 'normal', image: '/pet-garden/images/pets/normal/ragdoll-cat.png' },
  { id: 'orange-cat', name: '橘猫', category: 'normal', image: '/pet-garden/images/pets/normal/orange-cat.png' },
  { id: 'lop-rabbit', name: '垂耳兔', category: 'normal', image: '/pet-garden/images/pets/normal/lop-rabbit.png' },
  { id: 'angora-rabbit', name: '安哥拉兔', category: 'normal', image: '/pet-garden/images/pets/normal/angora-rabbit.png' },
  { id: 'hamster', name: '仓鼠', category: 'normal', image: '/pet-garden/images/pets/normal/hamster.png' },
  { id: 'winter-hamster', name: '银狐仓鼠', category: 'normal', image: '/pet-garden/images/pets/normal/winter-hamster.png' },
  { id: 'call-duck', name: '柯尔鸭', category: 'normal', image: '/pet-garden/images/pets/normal/call-duck.png' },
  { id: 'alpaca', name: '羊驼', category: 'normal', image: '/pet-garden/images/pets/normal/alpaca.png' },
  { id: 'red-panda', name: '小熊猫', category: 'normal', image: '/pet-garden/images/pets/normal/red-panda.png' },
  
  // 神兽
  { id: 'white-tiger', name: '白虎', category: 'mythical', image: '/pet-garden/images/pets/mythical/white-tiger.png' },
  { id: 'unicorn', name: '独角兽', category: 'mythical', image: '/pet-garden/images/pets/mythical/unicorn.png' },
  { id: 'pixiu', name: '貔貅', category: 'mythical', image: '/pet-garden/images/pets/mythical/pixiu.png' },
  { id: 'azure-dragon', name: '青龙', category: 'mythical', image: '/pet-garden/images/pets/mythical/azure-dragon.png' },
  { id: 'vermilion-bird', name: '朱雀', category: 'mythical', image: '/pet-garden/images/pets/mythical/vermilion-bird.png' },
  { id: 'suanni', name: '狻猊', category: 'mythical', image: '/pet-garden/images/pets/mythical/suanni.png' },
  { id: 'succulent-spirit', name: '多肉精灵', category: 'mythical', image: '/pet-garden/images/pets/mythical/succulent-spirit.png' },
]

// 等级配置
export const LEVEL_CONFIG = [40, 60, 80, 100, 120, 140, 160]

// 获取宠物信息
export function getPetType(id: string): PetType | undefined {
  return PET_TYPES.find(p => p.id === id)
}

// 计算等级
export function calculateLevel(exp: number): number {
  let level = 1
  let total = 0
  for (const required of LEVEL_CONFIG) {
    total += required
    if (exp >= total) {
      level++
    } else {
      break
    }
  }
  return Math.min(level, 8)
}

// 获取当前等级进度
export function getLevelProgress(exp: number): { current: number; required: number; percentage: number } {
  if (!exp || exp <= 0) {
    return { current: 0, required: LEVEL_CONFIG[0], percentage: 0 }
  }
  
  let total = 0
  for (let i = 0; i < LEVEL_CONFIG.length; i++) {
    const levelTotal = total + LEVEL_CONFIG[i]
    if (exp < levelTotal) {
      const current = exp - total
      return { 
        current, 
        required: LEVEL_CONFIG[i], 
        percentage: Math.round((current / LEVEL_CONFIG[i]) * 100) 
      }
    }
    total = levelTotal
  }
  
  // Max level reached
  return { current: LEVEL_CONFIG[LEVEL_CONFIG.length - 1], required: LEVEL_CONFIG[LEVEL_CONFIG.length - 1], percentage: 100 }
}