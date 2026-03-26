<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

watch(() => props.show, (show) => {
  if (show) {
    
  }
})

function close() {
  emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
        <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
          <span class="text-2xl">🏫</span> 打赏
        </h3>
        <p class="text-gray-600 mb-6">感谢您的支持！您的打赏将帮助我们继续改进和维护星光班级宠物园。</p>
        <div class="flex gap-3 mb-6">
          <img style="width: 200px" src="https://www.luomor.com/wp-content/uploads/2025/05/alipay.jpeg" />
          <img style="width: 200px" src="https://www.luomor.com/wp-content/uploads/2023/04/WX20230418-182420@2x.png" />
        </div>
        <div class="flex gap-3 justify-end">
          <button @click="close" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">已打赏</button>
          <button @click="close" class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors">取消</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
