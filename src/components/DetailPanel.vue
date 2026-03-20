<script setup lang="ts">
import type { Student, Rule, EvaluationRecord } from '@/types'
import { getPetType, getLevelProgress, getPetLevelImage, calculateLevel } from '@/data/pets'
import QuickEvalSection from './QuickEvalSection.vue'

defineProps<{
  show: boolean
  student: Student | null
  rules: Rule[]
  studentRecords: EvaluationRecord[]
}>()

defineEmits<{
  close: []
  changePet: []
  evaluate: [rule: Rule]
}>()

function getDisplayLevel(student: Student): number {
  return calculateLevel(student.pet_exp)
}

function getStudentPetImage(student: Student): string {
  if (!student.pet_type) return ''
  return getPetLevelImage(student.pet_type, student.pet_level)
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show && student" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
      <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl animate-scale-in">
        <!-- 头部 -->
        <div class="relative bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 p-6 rounded-t-3xl">
          <!-- 顶部操作按钮 -->
          <div class="absolute top-4 right-4 flex gap-2 z-10">
            <button @click="$emit('changePet')" class="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-full flex items-center gap-1.5 text-white text-sm transition-colors" title="更换宠物">
              <span>🐾</span>
              <span class="font-medium">换宠物</span>
            </button>
            <button @click="$emit('close')" class="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors" title="关闭">
              ×
            </button>
          </div>
          
          <!-- 主体布局：左侧大宠物图 + 右侧信息 -->
          <div class="flex gap-4">
            <!-- 左侧：大宠物卡片 -->
            <div class="w-28 h-28 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
              <img
                v-if="student.pet_type"
                :src="getStudentPetImage(student)"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-5xl">❓</span>
            </div>
            
            <!-- 右侧：学生信息 + 进度条 -->
            <div class="flex-1 flex flex-col justify-center min-w-0">
              <h3 class="text-2xl font-bold text-white truncate">{{ student.name }}</h3>
              <p class="text-white/80 text-sm mt-1">
                {{ student.pet_type ? getPetType(student.pet_type)?.name : '未领养' }}
                · Lv.{{ getDisplayLevel(student) }}
                · ⭐ {{ student.total_points }}
              </p>
              
              <!-- 进度条 -->
              <div class="mt-3">
                <div class="flex justify-between text-white/90 text-xs mb-1">
                  <span>成长值</span>
                  <span v-if="getLevelProgress(student.pet_exp).isMaxLevel" class="text-yellow-300 font-medium">
                    🏆 已毕业
                  </span>
                  <span v-else>
                    {{ getLevelProgress(student.pet_exp).current }}/{{ getLevelProgress(student.pet_exp).required }}
                  </span>
                </div>
                <div class="bg-white/20 rounded-full h-2.5 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300"
                    :style="{ width: `${getLevelProgress(student.pet_exp).percentage}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 快速评价（复用组件） -->
        <QuickEvalSection
          :rules="rules"
          @evaluate="$emit('evaluate', $event)"
        />

        <!-- 最近记录 -->
        <div class="p-6">
          <h4 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span>📋</span> 最近记录
          </h4>
          <div v-if="studentRecords.length === 0" class="text-center py-8 text-gray-400">
            <div class="text-4xl mb-2">📝</div>
            暂无评价记录
          </div>
          <div v-else class="space-y-2 max-h-60 overflow-auto">
            <div
              v-for="record in studentRecords"
              :key="record.id"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                :class="record.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
              >
                {{ record.points > 0 ? '+' : '' }}{{ record.points }}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-800">{{ record.reason }}</div>
                <div class="text-xs text-gray-400">
                  <span class="px-1.5 py-0.5 bg-gray-200 rounded mr-2">{{ record.category }}</span>
                  {{ formatDate(record.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>