<script setup lang="ts">
import { computed } from 'vue'
import { getPetLevelImage } from '@/data/pets'

const props = defineProps<{
  show: boolean
  name: string
  petType: string
  petLevel: number
}>()

const petImage = computed(() => getPetLevelImage(props.petType, props.petLevel))
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200]">
      <div class="relative">
        <!-- 背景光晕 -->
        <div class="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-full blur-3xl opacity-60 animate-pulse"></div>

        <!-- 主内容 -->
        <div class="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 text-center shadow-2xl border-4 border-green-400 shadow-green-400/50 max-w-md">
          <!-- 标题 -->
          <h2 class="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            🎉 宠物复活啦！
          </h2>

          <!-- 宠物动画区域 -->
          <div class="relative w-48 h-48 mx-auto my-6">
            <!-- 复活光环 -->
            <div class="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 opacity-50 animate-spin" style="animation-duration: 3s"></div>
            <div class="absolute inset-2 rounded-3xl bg-gradient-to-r from-yellow-300 via-green-300 to-emerald-300 opacity-40 animate-spin" style="animation-duration: 2s; animation-direction: reverse"></div>

            <!-- 宠物图片容器 -->
            <div class="absolute inset-4 rounded-2xl overflow-hidden bg-gradient-to-br from-green-100 to-emerald-100 shadow-inner">
              <img
                :src="petImage"
                class="w-full h-full object-contain p-2 animate-bounce"
              />
            </div>

            <!-- 复活标记 -->
            <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white rounded-full px-4 py-1 shadow-lg text-sm font-bold">
              ✨ 复活成功
            </div>
          </div>

          <!-- 信息 -->
          <p class="text-lg text-gray-600 mb-1">
            <span class="font-bold text-green-500">{{ name }}</span> 的宠物
          </p>
          <p class="text-sm text-gray-500">
            积分已重置为 0，继续努力吧！
          </p>
        </div>

        <!-- 装饰 -->
        <div class="absolute -top-4 -left-4 text-4xl animate-bounce">🎉</div>
        <div class="absolute -top-4 -right-4 text-4xl animate-bounce" style="animation-delay: 0.2s">✨</div>
        <div class="absolute -bottom-4 -left-4 text-4xl animate-bounce" style="animation-delay: 0.4s">🌟</div>
        <div class="absolute -bottom-4 -right-4 text-4xl animate-bounce" style="animation-delay: 0.6s">🎊</div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>