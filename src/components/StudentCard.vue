<script setup lang="ts">
import type { Student } from '@/types'
import { getPetType, getLevelProgress, getPetLevelImage, calculateLevel, DEATH_THRESHOLD, checkPetStatus } from '@/data/pets'
import PetImage from './PetImage.vue'

defineProps<{
  student: Student
  isSelected?: boolean
  isDeleteMode?: boolean
  isDeleteSelected?: boolean
  scoreAnimation?: { points: number; show: boolean } | null
}>()

defineEmits<{
  click: []
}>()

function getDisplayLevel(student: Student): number {
  return calculateLevel(student.pet_exp)
}

function getLevelBgClass(level: number): string {
  if (level >= 10) return 'from-yellow-400 via-amber-400 to-orange-400'
  if (level >= 7) return 'from-pink-400 via-rose-400 to-red-400'
  if (level >= 5) return 'from-purple-400 via-violet-400 to-indigo-400'
  if (level >= 3) return 'from-blue-400 via-cyan-400 to-teal-400'
  return 'from-gray-400 via-slate-400 to-zinc-400'
}

function getLevelBorderClass(level: number): string {
  const borders: Record<number, string> = {
    1: 'border border-gray-200',
    2: 'border-2 border-gray-300',
    3: 'border-2 border-blue-400 shadow-md shadow-blue-400/10',
    4: 'border-2 border-cyan-400 shadow-md shadow-cyan-400/15',
    5: 'border-2 border-purple-400 shadow-lg shadow-purple-400/20',
    6: 'border-2 border-pink-400 shadow-lg shadow-pink-400/25',
    7: 'border-2 border-rose-400 shadow-xl shadow-rose-400/30',
    8: 'border-3 border-yellow-400 shadow-xl shadow-yellow-400/40',
  }
  return borders[level] || ''
}

function getStudentPetImage(student: Student): string {
  if (!student.pet_type) return ''
  return getPetLevelImage(student.pet_type, student.pet_level)
}

function getPetStatus(student: Student): 'alive' | 'injured' | 'dead' {
  // 使用前端计算的状态（与后端逻辑一致）
  // 这样可以保证状态实时正确
  return checkPetStatus(student.total_points, student.pet_status)
}

function getStatusInfo(student: Student) {
  const status = getPetStatus(student)
  if (status === 'dead') {
    // 复活需要积分 >= 0
    const pointsNeeded = -student.total_points
    return {
      emoji: '💀',
      text: '已死亡',
      bgClass: 'bg-gray-600',
      cardClass: 'opacity-75 grayscale-[30%]',
      progressColor: 'from-gray-400 to-gray-500',
      statusText: `距离复活还需 ${pointsNeeded} 分`
    }
  }
  if (status === 'injured') {
    const pointsNeeded = -student.total_points
    return {
      emoji: '🩹',
      text: '受伤中',
      bgClass: 'bg-orange-500',
      cardClass: 'opacity-90',
      progressColor: 'from-orange-400 to-red-400',
      statusText: `还差 ${pointsNeeded} 分恢复`
    }
  }
  return {
    emoji: null,
    text: null,
    bgClass: null,
    cardClass: '',
    progressColor: null,
    statusText: null
  }
}

// 计算复活/恢复进度
function getHealthProgress(student: Student): number {
  const status = getPetStatus(student)
  if (status === 'dead') {
    // 死亡状态下，从 DEATH_THRESHOLD 到 0 的进度
    // 例如：积分 -30，阈值 -20，进度 = (-30 - (-20)) / (0 - (-20)) = -10 / 20 = 0
    // 积分 -20，进度 = 0
    // 积分 -10，进度 = (-10 - (-20)) / 20 = 10/20 = 50%
    // 积分 0，进度 = 100%
    const progress = (student.total_points - DEATH_THRESHOLD) / (-DEATH_THRESHOLD) * 100
    return Math.min(100, Math.max(0, progress))
  }
  if (status === 'injured') {
    // 受伤状态下，从 0 到恢复的进度
    // 积分 -10，进度 = (0 - (-10)) / 20 = 10/20 = 50%
    const progress = (0 - student.total_points) / (-DEATH_THRESHOLD) * 100
    return Math.min(100, Math.max(0, progress))
  }
  return 100
}
</script>

<template>
  <div
    class="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300 cursor-pointer relative group card-hover"
    :class="[getLevelBorderClass(getDisplayLevel(student)), getStatusInfo(student).cardClass, {
      'ring-2 ring-purple-400 ring-offset-2': isSelected,
      'ring-2 ring-red-400 ring-offset-2': isDeleteMode && isDeleteSelected
    }]"
    @click="$emit('click')"
  >
    <!-- 死亡/受伤遮罩 -->
    <div
      v-if="getPetStatus(student) !== 'alive'"
      class="absolute inset-0 z-10 pointer-events-none"
      :class="getPetStatus(student) === 'dead' ? 'bg-black/10' : 'bg-orange-500/5'"
    ></div>

    <!-- 评分动效 -->
    <Transition name="score-pop">
      <div
        v-if="scoreAnimation?.show"
        class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      >
        <div
          class="text-4xl font-bold animate-bounce-in"
          :class="scoreAnimation.points > 0 ? 'text-green-500' : 'text-red-500'"
        >
          {{ scoreAnimation.points > 0 ? '+' : '' }}{{ scoreAnimation.points }}
        </div>
        <div class="absolute inset-0 overflow-hidden">
          <span v-for="i in 6" :key="i" class="absolute text-2xl animate-sparkle" :style="{ left: `${Math.random() * 80 + 10}%`, top: `${Math.random() * 80 + 10}%`, animationDelay: `${i * 100}ms` }">
            {{ scoreAnimation.points > 0 ? '⭐' : '💫' }}
          </span>
        </div>
      </div>
    </Transition>

    <!-- 选中标记 -->
    <Transition name="pop">
      <div
        v-if="isSelected || isDeleteSelected"
        class="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-md transition-all"
        :class="isSelected
          ? 'bg-gradient-to-r from-purple-400 to-pink-400'
          : 'bg-gradient-to-r from-red-400 to-pink-400'"
      >
        <span class="text-white text-sm font-bold">✓</span>
      </div>
    </Transition>

    <!-- 宠物图片区域 -->
    <div class="aspect-square flex items-center justify-center relative rounded-t-2xl"
      :class="student.pet_type 
        ? (getPetStatus(student) === 'dead' ? 'bg-gradient-to-br from-gray-200 via-slate-100 to-gray-200' : 
           getPetStatus(student) === 'injured' ? 'bg-gradient-to-br from-orange-100 via-red-50 to-orange-50' :
           'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100') 
        : 'bg-gradient-to-br from-gray-100 via-slate-50 to-gray-100'"
    >
      <!-- 有宠物时使用 PetImage 组件 -->
      <template v-if="student.pet_type">
        <div class="w-full h-full overflow-hidden" style="border-radius: 14px 14px 0 0; margin: -1px -1px 0 -1px; width: calc(100% + 2px);">
          <PetImage
            :src="getStudentPetImage(student)"
            :alt="getPetType(student.pet_type)?.name"
            size="full"
            :rounded="false"
            :show-loading="true"
            class="w-full h-full transition-all duration-300"
            :class="getPetStatus(student) === 'dead' ? 'grayscale opacity-50' : 
                    getPetStatus(student) === 'injured' ? 'hue-rotate-[-10deg] brightness-95' : ''"
          />
        </div>
        <!-- 受伤标记 -->
        <div
          v-if="getPetStatus(student) === 'injured'"
          class="absolute top-3 left-3 text-2xl animate-pulse"
        >
          🩹
        </div>
      </template>
      <!-- 未领养宠物 -->
      <div v-else class="flex flex-col items-center">
        <span class="text-6xl pet-unknown">❓</span>
        <span class="text-xs text-gray-400 mt-2 group-hover:text-orange-400 transition-colors">点击领养</span>
      </div>

      <!-- 状态徽章 -->
      <div
        v-if="getPetStatus(student) === 'dead'"
        class="absolute bottom-3 right-3 font-bold px-3 py-1 rounded-full shadow-lg bg-gray-600 text-white text-sm"
      >
        💀 已死亡
      </div>
      <div
        v-else-if="getPetStatus(student) === 'injured'"
        class="absolute bottom-3 right-3 font-bold px-3 py-1 rounded-full shadow-lg bg-orange-500 text-white text-sm animate-pulse"
      >
        🩹 受伤中
      </div>
      <div
        v-else
        class="absolute bottom-3 right-3 font-bold px-3 py-1 rounded-full shadow-lg text-white text-sm"
        :class="`bg-gradient-to-r ${getLevelBgClass(getDisplayLevel(student))}`"
      >
        <span v-if="getDisplayLevel(student) >= 10">👑</span>
        <span v-else>Lv.</span>{{ getDisplayLevel(student) }}
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="p-4">
      <!-- 学生姓名 + 宠物名 -->
      <div class="flex items-center justify-between mb-2">
        <span class="font-bold text-lg text-gray-800 group-hover:text-orange-500 transition-colors">{{ student.name }}</span>
        <span class="text-xs px-2 py-1 rounded-full"
          :class="getPetStatus(student) === 'dead' 
            ? 'bg-gray-200 text-gray-500' 
            : getPetStatus(student) === 'injured'
            ? 'bg-orange-100 text-orange-600'
            : (student.pet_type ? 'bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600' : 'bg-gray-100 text-gray-400')">
          {{ getPetStatus(student) === 'dead' ? '💀 已死亡' : 
             getPetStatus(student) === 'injured' ? '🩹 受伤中' :
             (student.pet_type ? getPetType(student.pet_type)?.name : '未领养') }}
        </span>
      </div>

      <!-- 成长值 + 积分 -->
      <div class="flex items-center justify-between text-sm mb-3">
        <span class="text-gray-500 flex items-center gap-1">
          <!-- 死亡状态 -->
          <template v-if="getPetStatus(student) === 'dead'">
            <span class="text-xs text-gray-400 font-medium">距离复活还需 {{ -student.total_points }} 分</span>
          </template>
          <!-- 受伤状态 -->
          <template v-else-if="getPetStatus(student) === 'injured'">
            <span class="text-xs text-orange-500 font-medium">🩹 还差 {{ -student.total_points }} 分恢复</span>
          </template>
          <!-- 正常状态 -->
          <template v-else-if="getLevelProgress(student.pet_exp).isMaxLevel">
            <span class="text-xs text-amber-500 font-medium">🏆 已毕业</span>
          </template>
          <template v-else>
            <span class="text-purple-400">💜</span>
            <span class="font-medium text-purple-600">{{ getLevelProgress(student.pet_exp).current }}</span>
            <span class="text-gray-300">/</span>
            <span>{{ getLevelProgress(student.pet_exp).required }}</span>
          </template>
        </span>
        <span class="font-bold text-lg flex items-center gap-1">
          <span class="text-yellow-400">⭐</span>
          <span :class="student.total_points < 0 ? 'text-red-500' : 'text-orange-500'">{{ student.total_points }}</span>
        </span>
      </div>

      <!-- 进度条 -->
      <div class="bg-gray-100 rounded-full h-2.5 overflow-hidden progress-glow">
        <!-- 死亡进度条 -->
        <div
          v-if="getPetStatus(student) === 'dead'"
          class="rounded-full h-2.5 transition-all duration-500 bg-gradient-to-r from-gray-400 to-gray-500 relative"
          :style="{ width: `${getHealthProgress(student)}%` }"
        >
          <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
        <!-- 受伤进度条 -->
        <div
          v-else-if="getPetStatus(student) === 'injured'"
          class="rounded-full h-2.5 transition-all duration-500 bg-gradient-to-r from-orange-400 to-red-400 relative"
          :style="{ width: `${getHealthProgress(student)}%` }"
        >
          <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
        </div>
        <!-- 正常进度条 -->
        <div
          v-else
          class="rounded-full h-2.5 transition-all duration-500"
          :class="getDisplayLevel(student) >= 5 ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400' : 'bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400'"
          :style="{ width: `${getLevelProgress(student.pet_exp).percentage}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>