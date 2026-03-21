<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { PET_TYPES, getPetLevelImage } from '@/data/pets'
import PetImage from '@/components/PetImage.vue'
import Header from '@/components/layout/Header.vue'
import { useAuth } from '@/composables/useAuth'
import type { Class } from '@/types'

const { api, isGuest, isAdmin, username } = useAuth()

const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)

// 处理退出登录

// 分类标签
const categories = [
  { id: 'all', name: '全部' },
  { id: 'normal', name: '普通动物' },
  { id: 'mythical', name: '神兽' }
]

const currentCategory = ref('all')
const selectedPet = ref<string | null>(null)
const selectedLevel = ref(1)

// 普通动物
const normalPets = computed(() => PET_TYPES.filter(p => p.category === 'normal'))

// 神兽
const mythicalPets = computed(() => PET_TYPES.filter(p => p.category === 'mythical'))

// 获取等级颜色
function getLevelColor(level: number): string {
  const colors: Record<number, string> = {
    1: 'from-gray-400 to-gray-500',
    2: 'from-gray-400 to-slate-500',
    3: 'from-blue-400 to-cyan-500',
    4: 'from-cyan-400 to-teal-500',
    5: 'from-purple-400 to-violet-500',
    6: 'from-pink-400 to-rose-500',
    7: 'from-rose-400 to-red-500',
    8: 'from-yellow-400 via-amber-400 to-orange-500'
  }
  return colors[level] || 'from-gray-400 to-gray-500'
}

// 获取等级名称
function getLevelName(level: number): string {
  const names: Record<number, string> = {
    1: '初生',
    2: '成长',
    3: '优秀',
    4: '进阶',
    5: '稀有',
    6: '精英',
    7: '史诗',
    8: '传说'
  }
  return names[level] || `Lv.${level}`
}

// 选择宠物
function selectPet(petId: string) {
  selectedPet.value = petId
  selectedLevel.value = 1
}

// 关闭详情
function closeDetail() {
  selectedPet.value = null
}

async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
    if (classes.value.length > 0) {
      const savedClassId = localStorage.getItem('pet-garden-current-class')
      currentClass.value = savedClassId 
        ? classes.value.find(c => c.id === savedClassId) || classes.value[0]
        : classes.value[0]
    }
  } catch (error) {
    console.error('加载班级失败:', error)
  }
}

// 检查班级是否变化
function syncCurrentClass() {
  const savedClassId = localStorage.getItem('pet-garden-current-class')
  if (savedClassId && savedClassId !== currentClass.value?.id) {
    currentClass.value = classes.value.find(c => c.id === savedClassId) || classes.value[0]
  }
}

onMounted(() => {
  loadClasses()
})

onActivated(() => {
  syncCurrentClass()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex flex-col">
    <Header 
      :classes="classes" 
      :current-class="currentClass" 
      :is-guest="isGuest"
      :is-admin="isAdmin"
      :username="username"
      :batch-mode="false"
      
      
    />

    <main class="flex-1 p-6">
      <!-- 分类标签 -->
      <div class="flex gap-3 mb-8">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="currentCategory = cat.id"
          class="px-6 py-3 rounded-xl font-bold transition-all"
          :class="currentCategory === cat.id 
            ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg' 
            : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- 普通动物区域 -->
      <section v-if="currentCategory === 'all' || currentCategory === 'normal'" class="mb-10">
        <h2 class="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm">🐕</span>
          普通动物
        </h2>
        <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          <div
            v-for="pet in normalPets"
            :key="pet.id"
            @click="selectPet(pet.id)"
            class="bg-white rounded-2xl p-3 shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            <div class="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100 mb-2 relative">
              <PetImage
                :src="getPetLevelImage(pet.id, 1)"
                :alt="pet.name"
                size="full"
                :rounded="false"
                :hover-scale="true"
                :fixed-emoji-size="true"
              />
            </div>
            <div class="text-center">
              <div class="font-bold text-sm text-gray-800 group-hover:text-orange-500 transition-colors">{{ pet.name }}</div>
              <div class="text-xs text-gray-400">点击查看</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 神兽区域 -->
      <section v-if="currentCategory === 'all' || currentCategory === 'mythical'">
        <h2 class="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span class="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm">✨</span>
          神兽
        </h2>
        <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          <div
            v-for="pet in mythicalPets"
            :key="pet.id"
            @click="selectPet(pet.id)"
            class="bg-white rounded-2xl p-3 shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            <div class="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 mb-2 relative">
              <PetImage
                :src="getPetLevelImage(pet.id, 1)"
                :alt="pet.name"
                size="full"
                :rounded="false"
                :hover-scale="true"
                :fixed-emoji-size="true"
              />
            </div>
            <div class="text-center">
              <div class="font-bold text-sm text-gray-800 group-hover:text-purple-500 transition-colors">{{ pet.name }}</div>
              <div class="text-xs text-gray-400">点击查看</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 宠物详情弹窗 -->
      <Transition name="modal">
        <div v-if="selectedPet" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeDetail">
          <div class="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-auto shadow-2xl">
            <!-- 头部 -->
            <div class="bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 p-6 rounded-t-3xl flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center">
                  <PetImage
                    :src="getPetLevelImage(selectedPet, selectedLevel)"
                    size="md"
                    :rounded="true"
                    :show-loading="false"
                    :fixed-emoji-size="true"
                  />
                </div>
                <div class="text-white">
                  <h2 class="text-2xl font-bold">{{ PET_TYPES.find(p => p.id === selectedPet)?.name }}</h2>
                  <p class="text-white/80">
                    {{ PET_TYPES.find(p => p.id === selectedPet)?.category === 'mythical' ? '神兽' : '普通动物' }}
                    · Lv.{{ selectedLevel }} {{ getLevelName(selectedLevel) }}
                  </p>
                </div>
              </div>
              <button @click="closeDetail" class="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl transition-colors">
                ×
              </button>
            </div>

            <!-- 内容 -->
            <div class="p-6">
              <!-- 当前等级大图 -->
              <div class="flex flex-col md:flex-row gap-6 mb-8">
                <div class="w-full md:w-1/2">
                  <div class="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100 shadow-inner relative">
                    <PetImage
                      :src="getPetLevelImage(selectedPet, selectedLevel)"
                      :alt="PET_TYPES.find(p => p.id === selectedPet)?.name"
                      size="full"
                      :rounded="false"
                      :show-loading="true"
                      :fixed-emoji-size="true"
                    />
                    <div class="absolute top-4 right-4 font-bold px-4 py-2 rounded-full shadow-lg text-white text-lg bg-gradient-to-r"
                      :class="getLevelColor(selectedLevel)"
                    >
                      Lv.{{ selectedLevel }}
                    </div>
                  </div>
                </div>
                <div class="w-full md:w-1/2 flex flex-col justify-center">
                  <h3 class="text-xl font-bold text-gray-800 mb-4">等级信息</h3>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span class="text-gray-600">当前等级</span>
                      <span class="font-bold text-lg" :class="`text-gradient bg-gradient-to-r ${getLevelColor(selectedLevel)} bg-clip-text text-transparent`">
                        Lv.{{ selectedLevel }} {{ getLevelName(selectedLevel) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span class="text-gray-600">宠物类型</span>
                      <span class="font-bold text-gray-800">
                        {{ PET_TYPES.find(p => p.id === selectedPet)?.category === 'mythical' ? '神兽' : '普通动物' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 等级选择 -->
              <h3 class="text-lg font-bold text-gray-800 mb-4">选择等级预览</h3>
              <div class="grid grid-cols-4 md:grid-cols-8 gap-3">
                <button
                  v-for="level in 8"
                  :key="level"
                  @click="selectedLevel = level"
                  class="relative aspect-square rounded-2xl overflow-hidden transition-all"
                  :class="selectedLevel === level ? 'ring-4 ring-orange-400 scale-105' : 'hover:scale-105'"
                >
                  <div class="absolute inset-0 bg-gradient-to-br" :class="getLevelColor(level)"></div>
                  <PetImage
                    :src="getPetLevelImage(selectedPet, level)"
                    size="full"
                    :rounded="false"
                    :show-loading="false"
                    :fixed-emoji-size="true"
                    class="relative z-10"
                  />
                  <div class="absolute bottom-1 left-1 right-1 z-20">
                    <div class="bg-white/90 rounded-lg py-1 text-center">
                      <div class="text-xs font-bold text-gray-800">Lv.{{ level }}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.text-gradient {
  background-clip: text;
  -webkit-background-clip: text;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.9);
}
</style>