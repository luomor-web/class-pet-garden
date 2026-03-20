import { ref } from 'vue'
import { getPetLevelImage } from '@/data/pets'

type PetStatus = 'alive' | 'injured' | 'dead'
type AnimationType = 'injured' | 'death' | 'revive' | 'heal'

interface PetStatusAnimation {
  type: AnimationType
  name: string
  petType: string
  petLevel: number
  fromStatus: PetStatus
  toStatus: PetStatus
  totalPoints: number
}

// 全局状态（单例模式）
const showAnimation = ref(false)
const animationInfo = ref<PetStatusAnimation>({
  type: 'injured',
  name: '',
  petType: '',
  petLevel: 1,
  fromStatus: 'alive',
  toStatus: 'injured',
  totalPoints: 0
})
const animationPhase = ref<'start' | 'effect' | 'end'>('start')

export function usePetStatusAnimation() {
  function triggerAnimation(
    type: AnimationType,
    name: string,
    petType: string,
    petLevel: number,
    fromStatus: PetStatus,
    toStatus: PetStatus,
    totalPoints: number = 0
  ) {
    animationInfo.value = { type, name, petType, petLevel, fromStatus, toStatus, totalPoints }
    animationPhase.value = 'start'
    showAnimation.value = true

    // 动画时序
    setTimeout(() => { animationPhase.value = 'effect' }, 300)
    setTimeout(() => { animationPhase.value = 'end' }, 1500)
    setTimeout(() => { showAnimation.value = false }, 2500)
  }

  function getPetImage() {
    if (!animationInfo.value.petType) return ''
    return getPetLevelImage(animationInfo.value.petType, animationInfo.value.petLevel)
  }

  function getAnimationConfig() {
    const pointsNeeded = Math.max(0, -animationInfo.value.totalPoints)
    const configs = {
      injured: {
        title: '宠物受伤了！',
        subtitle: '快加油恢复吧！',
        borderColor: 'border-orange-400',
        shadowColor: 'shadow-orange-400/50',
        gradientFrom: 'from-orange-300',
        gradientTo: 'to-red-300',
        textColor: 'text-orange-500',
        emoji: '🩹'
      },
      death: {
        title: '宠物休眠了',
        subtitle: pointsNeeded > 0 ? `还需 ${pointsNeeded} 分可以苏醒` : '即将苏醒！',
        borderColor: 'border-gray-400',
        shadowColor: 'shadow-gray-400/50',
        gradientFrom: 'from-gray-300',
        gradientTo: 'to-gray-400',
        textColor: 'text-gray-600',
        emoji: '😴'
      },
      revive: {
        title: '宠物苏醒了！',
        subtitle: '太棒了！继续加油！',
        borderColor: 'border-green-400',
        shadowColor: 'shadow-green-400/50',
        gradientFrom: 'from-green-300',
        gradientTo: 'to-emerald-300',
        textColor: 'text-green-500',
        emoji: '✨'
      },
      heal: {
        title: '恢复健康！',
        subtitle: '宠物状态良好',
        borderColor: 'border-teal-400',
        shadowColor: 'shadow-teal-400/50',
        gradientFrom: 'from-teal-300',
        gradientTo: 'to-cyan-300',
        textColor: 'text-teal-500',
        emoji: '💚'
      }
    }
    return configs[animationInfo.value.type]
  }

  return {
    showAnimation,
    animationInfo,
    animationPhase,
    triggerAnimation,
    getPetImage,
    getAnimationConfig
  }
}