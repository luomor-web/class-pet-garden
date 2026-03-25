<script setup lang="ts">
import { onActivated } from 'vue'
import { useClasses } from '@/composables/useClasses'
import Header from './Header.vue'

defineProps<{
  contentClass?: string
  /** 透明背景模式，适用于自带背景的页面（如排行榜） */
  transparent?: boolean
  /** 无内边距模式，适用于全屏内容 */
  noPadding?: boolean
}>()

const { syncCurrentClass } = useClasses()

// 自动同步班级状态
onActivated(() => {
  syncCurrentClass()
})
</script>

<template>
  <div 
    class="min-h-screen flex flex-col" 
    :class="transparent ? '' : 'bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50'"
  >
    <Header />

    <main 
      class="flex-1" 
      :class="[noPadding ? '' : 'p-6', contentClass]"
    >
      <slot />
    </main>

    <div>
        <!-- 底部版权信息 -->
        <footer class="text-center text-sm text-gray-500 py-4">
          © 2026 班级宠物园 | <a href="https://www.luomor.com/" class="text-blue-500 hover:underline">烙馍网</a>
        </footer>
    </div>
  </div>
</template>