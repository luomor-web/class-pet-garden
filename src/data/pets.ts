// 宠物类型定义
export interface PetType {
  id: string
  name: string
  category: 'normal' | 'mythical'
  image: string
  // 等级图片路径，key为等级(1-8)，value为图片路径
  levelImages?: Record<number, string>
}

// 生成等级图片路径的辅助函数
function generateLevelImages(petId: string): Record<number, string> {
  const basePath = `/pet-garden/pets/${petId}`
  const images: Record<number, string> = {}
  for (let i = 1; i <= 8; i++) {
    images[i] = `${basePath}/lv${i}.png`
  }
  return images
}

// 宠物配置
export const PET_TYPES: PetType[] = [
  // 普通动物
  { id: 'west-highland', name: '西高地', category: 'normal', image: '/pet-garden/images/pets/normal/west-highland.png', levelImages: generateLevelImages('west-highland') },
  { id: 'bichon', name: '比熊', category: 'normal', image: '/pet-garden/images/pets/normal/bichon.png', levelImages: generateLevelImages('bichon') },
  { id: 'border-collie', name: '边牧', category: 'normal', image: '/pet-garden/images/pets/normal/border-collie.png', levelImages: generateLevelImages('border-collie') },
  { id: 'shiba', name: '柴犬', category: 'normal', image: '/pet-garden/images/pets/normal/shiba.png', levelImages: generateLevelImages('shiba') },
  { id: 'golden-retriever', name: '金毛', category: 'normal', image: '/pet-garden/images/pets/normal/golden-retriever.png', levelImages: generateLevelImages('golden-retriever') },
  { id: 'samoyed', name: '萨摩耶', category: 'normal', image: '/pet-garden/images/pets/normal/samoyed.png', levelImages: generateLevelImages('samoyed') },
  { id: 'husky', name: '哈士奇', category: 'normal', image: '/pet-garden/images/pets/normal/husky.png', levelImages: generateLevelImages('husky') },
  { id: 'tabby-cat', name: '虎斑猫', category: 'normal', image: '/pet-garden/images/pets/normal/tabby-cat.png', levelImages: generateLevelImages('tabby-cat') },
  { id: 'persian-cat', name: '波斯猫', category: 'normal', image: '/pet-garden/images/pets/normal/persian-cat.png', levelImages: generateLevelImages('persian-cat') },
  { id: 'ragdoll-cat', name: '布偶猫', category: 'normal', image: '/pet-garden/images/pets/normal/ragdoll-cat.png', levelImages: generateLevelImages('ragdoll-cat') },
  { id: 'orange-cat', name: '橘猫', category: 'normal', image: '/pet-garden/images/pets/normal/orange-cat.png', levelImages: generateLevelImages('orange-cat') },
  { id: 'lop-rabbit', name: '垂耳兔', category: 'normal', image: '/pet-garden/images/pets/normal/lop-rabbit.png', levelImages: generateLevelImages('lop-rabbit') },
  { id: 'angora-rabbit', name: '安哥拉兔', category: 'normal', image: '/pet-garden/images/pets/normal/angora-rabbit.png', levelImages: generateLevelImages('angora-rabbit') },
  { id: 'hamster', name: '仓鼠', category: 'normal', image: '/pet-garden/images/pets/normal/hamster.png', levelImages: generateLevelImages('hamster') },
  { id: 'winter-hamster', name: '银狐仓鼠', category: 'normal', image: '/pet-garden/images/pets/normal/winter-hamster.png', levelImages: generateLevelImages('winter-hamster') },
  { id: 'call-duck', name: '柯尔鸭', category: 'normal', image: '/pet-garden/images/pets/normal/call-duck.png', levelImages: generateLevelImages('call-duck') },
  { id: 'alpaca', name: '羊驼', category: 'normal', image: '/pet-garden/images/pets/normal/alpaca.png', levelImages: generateLevelImages('alpaca') },
  { id: 'red-panda', name: '小熊猫', category: 'normal', image: '/pet-garden/images/pets/normal/red-panda.png', levelImages: generateLevelImages('red-panda') },
  { id: 'corgi', name: '柯基', category: 'normal', image: '/pet-garden/images/pets/normal/corgi.png', levelImages: generateLevelImages('corgi') },
  
  // 神兽
  { id: 'white-tiger', name: '白虎', category: 'mythical', image: '/pet-garden/images/pets/mythical/white-tiger.png', levelImages: generateLevelImages('white-tiger') },
  { id: 'unicorn', name: '独角兽', category: 'mythical', image: '/pet-garden/images/pets/mythical/unicorn.png', levelImages: generateLevelImages('unicorn') },
  { id: 'pixiu', name: '貔貅', category: 'mythical', image: '/pet-garden/images/pets/mythical/pixiu.png', levelImages: generateLevelImages('pixiu') },
  { id: 'azure-dragon', name: '青龙', category: 'mythical', image: '/pet-garden/images/pets/mythical/azure-dragon.png', levelImages: generateLevelImages('azure-dragon') },
  { id: 'vermilion-bird', name: '朱雀', category: 'mythical', image: '/pet-garden/images/pets/mythical/vermilion-bird.png', levelImages: generateLevelImages('vermilion-bird') },
  { id: 'suanni', name: '狻猊', category: 'mythical', image: '/pet-garden/images/pets/mythical/suanni.png', levelImages: generateLevelImages('suanni') },
  { id: 'succulent-spirit', name: '多肉精灵', category: 'mythical', image: '/pet-garden/images/pets/mythical/succulent-spirit.png', levelImages: generateLevelImages('succulent-spirit') },
]

// 等级配置
export const LEVEL_CONFIG = [40, 60, 80, 100, 120, 140, 160]

// 获取宠物信息
export function getPetType(id: string): PetType | undefined {
  return PET_TYPES.find(p => p.id === id)
}

// 获取宠物指定等级的图片
export function getPetLevelImage(petId: string, level: number): string {
  const pet = getPetType(petId)
  if (!pet) return ''
  
  // 确保等级在 1-8 范围内
  const validLevel = Math.max(1, Math.min(8, level))
  
  // 优先使用等级图片，如果没有则使用默认图片
  return pet.levelImages?.[validLevel] || pet.image || ''
}

// 获取宠物等级1的图片（用于选择列表展示）
export function getPetLevel1Image(petId: string): string {
  return getPetLevelImage(petId, 1)
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