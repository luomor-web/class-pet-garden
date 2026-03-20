<script setup lang="ts">
import { computed } from 'vue'
import { usePetStatusAnimation } from '@/composables/usePetStatusAnimation'

const { showAnimation, animationInfo, animationPhase, getPetImage } = usePetStatusAnimation()

// 动画配置
const config = computed(() => {
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
})

// 宠物图片样式
const petImageClass = computed(() => {
  if (animationInfo.value.type === 'death') {
    return 'grayscale opacity-60'
  }
  if (animationInfo.value.type === 'injured') {
    return 'hue-rotate-[-10deg] brightness-95'
  }
  return ''
})
</script>

<template>
  <Transition name="fade">
    <div v-if="showAnimation" class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200]">
      <div class="relative">
        <!-- 背景光晕 -->
        <div 
          class="absolute inset-0 rounded-full blur-3xl opacity-60 animate-pulse"
          :class="`bg-gradient-to-r ${config?.gradientFrom} via-white ${config?.gradientTo}`"
        ></div>

        <!-- 主内容卡片 -->
        <div 
          class="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 text-center shadow-2xl border-4 max-w-md"
          :class="[config?.borderColor, config?.shadowColor]"
        >
          <!-- 标题 -->
          <h2 class="text-3xl font-bold mb-2" :class="config?.textColor">
            {{ config?.title }}
          </h2>
          <p class="text-gray-500 mb-6">{{ config?.subtitle }}</p>

          <!-- 宠物图片区域 -->
          <div class="relative w-48 h-48 mx-auto my-6">
            <!-- 动画光环 -->
            <div 
              v-if="animationInfo.type === 'revive'"
              class="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 opacity-50 animate-spin" 
              style="animation-duration: 3s"
            ></div>
            <div 
              v-else-if="animationInfo.type === 'death'"
              class="absolute inset-0 rounded-3xl bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 opacity-50"
            ></div>
            <div 
              v-else
              class="absolute inset-0 rounded-3xl opacity-50 animate-pulse"
              :class="`bg-gradient-to-r ${config?.gradientFrom} ${config?.gradientTo}`"
            ></div>

            <!-- 宠物图片容器 -->
            <div 
              class="absolute inset-4 rounded-2xl overflow-hidden shadow-inner transition-all duration-500"
              :class="animationInfo.type === 'death' ? 'bg-gradient-to-br from-gray-100 to-gray-200' : 
                      animationInfo.type === 'injured' ? 'bg-gradient-to-br from-orange-100 to-red-100' :
                      'bg-gradient-to-br from-white to-gray-50'"
            >
              <img
                :src="getPetImage()"
                class="absolute inset-0 w-full h-full object-contain p-2 transition-all duration-500"
                :class="[
                  petImageClass,
                  animationPhase === 'start' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
                ]"
              />
            </div>

            <!-- 状态图标 -->
            <div 
              class="absolute -top-2 -right-2 text-5xl animate-bounce"
              :class="animationPhase === 'start' ? 'opacity-0 scale-0' : 'opacity-100 scale-100'"
              style="transition: all 0.3s ease-out 0.3s"
            >
              {{ config?.emoji }}
            </div>
          </div>

          <!-- 学生名字 -->
          <p class="text-lg text-gray-600">
            <span class="font-bold text-purple-500">{{ animationInfo.name }}</span> 的宠物
          </p>
        </div>

        <!-- 装饰星星 -->
        <template v-if="animationInfo.type === 'revive'">
          <div class="absolute -top-4 -left-4 text-4xl animate-pulse">✨</div>
          <div class="absolute -top-4 -right-4 text-4xl animate-pulse" style="animation-delay: 0.2s">✨</div>
          <div class="absolute -bottom-4 -left-4 text-4xl animate-pulse" style="animation-delay: 0.4s">✨</div>
          <div class="absolute -bottom-4 -right-4 text-4xl animate-pulse" style="animation-delay: 0.6s">✨</div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>