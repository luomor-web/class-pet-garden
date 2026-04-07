<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Student, Rule, EvaluationRecord } from '@/types'
import { getPetType, getLevelProgress, getPetLevelImage, calculateLevel, checkPetStatus } from '@/data/pets'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import QuickEvalSection from './QuickEvalSection.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  show: boolean
  student: Student | null
  rules: Rule[]
  studentRecords: EvaluationRecord[]
}>()

const emit = defineEmits<{
  close: []
  changePet: []
  evaluate: [rule: Rule]
  revived: []
}>()

const { api } = useAuth()
const toast = useToast()
const { confirmDialog, showConfirm, closeConfirm } = useConfirm()

// 复活任务相关
const revivalEnabled = ref(false)
const assignedTasks = ref<Array<{
  id: string
  task_id: string
  name: string
  description?: string
  status: 'pending' | 'completed'
  assigned_at: number
  completed_at?: number
}>>([])
const availableTasks = ref<Array<{ id: string; name: string; description?: string; is_enabled: boolean }>>([])
const showAssignModal = ref(false)
const selectedTaskIds = ref<string[]>([])

const studentStatus = computed(() => {
  if (!props.student) return 'alive'
  return checkPetStatus(props.student.total_points, props.student.pet_status)
})

const isDead = computed(() => studentStatus.value === 'dead')

const completedCount = computed(() => assignedTasks.value.filter(t => t.status === 'completed').length)

const canRevive = computed(() => {
  if (assignedTasks.value.length === 0) return false
  return assignedTasks.value.every(t => t.status === 'completed')
})

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

// 加载复活设置和任务
async function loadRevivalData() {
  if (!props.student || !isDead.value) return
  
  try {
    // 检查复活功能是否开启
    const settingsRes = await api.get('/revival/settings')
    revivalEnabled.value = settingsRes.data.enabled
    
    if (!revivalEnabled.value) return
    
    // 获取可用任务
    const tasksRes = await api.get('/revival/tasks')
    availableTasks.value = tasksRes.data.allTasks.filter((t: { is_enabled: boolean }) => t.is_enabled)
    
    // 获取已分配任务
    const assignedRes = await api.get(`/revival/students/${props.student.id}/tasks`)
    assignedTasks.value = assignedRes.data.tasks.map((t: any) => ({
      id: t.id,
      task_id: t.task_id,
      name: t.name,
      description: t.description,
      status: t.status,
      assigned_at: t.assigned_at,
      completed_at: t.completed_at
    }))
  } catch (e) {
    console.error('加载复活数据失败:', e)
  }
}

async function toggleTaskComplete(taskId: string, currentStatus: string) {
  if (!props.student) return
  
  try {
    if (currentStatus === 'pending') {
      await api.put(`/revival/students/${props.student.id}/tasks/${taskId}/complete`)
      const task = assignedTasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = 'completed'
        task.completed_at = Date.now()
      }
      toast.success('任务已完成！')
    } else {
      await api.put(`/revival/students/${props.student.id}/tasks/${taskId}/uncomplete`)
      const task = assignedTasks.value.find(t => t.id === taskId)
      if (task) {
        task.status = 'pending'
        task.completed_at = undefined
      }
      toast.success('已取消完成')
    }
  } catch (e) {
    toast.error('操作失败')
  }
}

function openAssignModal() {
  selectedTaskIds.value = assignedTasks.value.map(t => t.task_id)
  showAssignModal.value = true
}

function closeAssignModal() {
  showAssignModal.value = false
}

async function assignTasks() {
  if (!props.student || selectedTaskIds.value.length === 0) {
    toast.warning('请至少选择一个任务')
    return
  }
  
  try {
    await api.post(`/revival/students/${props.student.id}/tasks`, {
      taskIds: selectedTaskIds.value
    })
    toast.success('任务分配成功！')
    showAssignModal.value = false
    await loadRevivalData()
  } catch (e: any) {
    toast.error(e.response?.data?.error || '分配失败')
  }
}

async function confirmRevive() {
  if (!props.student) return
  
  showConfirm({
    title: '确认复活',
    message: `确定复活 ${props.student?.name} 的宠物吗？积分将重置为 0。`,
    confirmText: '确认复活',
    type: 'info',
    onConfirm: async () => {
      if (!props.student) return
      try {
        await api.post(`/revival/students/${props.student.id}/revive`)
        toast.success('🎉 宠物复活成功！')
        emit('revived')
      } catch (e: any) {
        toast.error(e.response?.data?.error || '复活失败')
      }
    }
  })
}

async function removeTasks() {
  if (!props.student) return
  const studentId = props.student.id
  
  showConfirm({
    title: '移除任务',
    message: '确定移除所有复活任务吗？',
    confirmText: '移除',
    type: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/revival/students/${studentId}/tasks`)
        assignedTasks.value = []
        toast.success('已移除任务')
      } catch (e) {
        toast.error('移除失败')
      }
    }
  })
}

// 监听学生变化
watch(() => props.student, () => {
  if (props.show && props.student) {
    loadRevivalData()
  }
}, { immediate: true })

watch(() => props.show, (show) => {
  if (show && props.student) {
    loadRevivalData()
  }
})
</script>

<template>
  <Transition name="modal">
    <div v-if="show && student" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
      <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl animate-scale-in">
        <!-- 头部 -->
        <div 
          class="relative p-6 rounded-t-3xl"
          :class="isDead 
            ? 'bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700' 
            : 'bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400'"
        >
          <!-- 阵亡标记 -->
          <div v-if="isDead" class="absolute top-4 left-4 px-3 py-1.5 bg-black/30 rounded-full text-white text-sm font-medium flex items-center gap-1.5">
            <span>🪦</span>
            <span>已阵亡</span>
          </div>
          
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
            <div 
              class="w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0"
              :class="isDead ? 'bg-black/30' : 'bg-white/20 backdrop-blur-sm'"
            >
              <img
                v-if="student.pet_type"
                :src="getStudentPetImage(student)"
                class="w-full h-full object-cover"
                :class="isDead ? 'grayscale opacity-50' : ''"
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
                    class="h-full rounded-full transition-all duration-500"
                    :class="isDead ? 'bg-gray-400' : 'bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300'"
                    :style="{ width: `${getLevelProgress(student.pet_exp).percentage}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 复活任务面板（仅开启复活功能且阵亡时显示） -->
        <div v-if="isDead && revivalEnabled" class="p-6 bg-gray-50 border-b">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-gray-700 flex items-center gap-2">
              <span>🔄</span> 复活任务
              <span v-if="assignedTasks.length > 0" class="text-sm font-normal text-gray-500">
                ({{ completedCount }}/{{ assignedTasks.length }} 已完成)
              </span>
            </h4>
            <div class="flex gap-2">
              <button
                @click="openAssignModal"
                class="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                {{ assignedTasks.length > 0 ? '重新分配' : '分配任务' }}
              </button>
              <button
                v-if="assignedTasks.length > 0"
                @click="removeTasks"
                class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                移除
              </button>
            </div>
          </div>

          <!-- 任务列表 -->
          <div v-if="assignedTasks.length > 0" class="space-y-2 mb-4">
            <div
              v-for="task in assignedTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm"
              :class="task.status === 'completed' ? 'opacity-75' : ''"
            >
              <button
                @click="toggleTaskComplete(task.id, task.status)"
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="task.status === 'completed' 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'border-gray-300 hover:border-green-400'"
              >
                <span v-if="task.status === 'completed'" class="text-sm">✓</span>
              </button>
              <div class="flex-1">
                <div 
                  class="font-medium"
                  :class="task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'"
                >
                  {{ task.name }}
                </div>
                <div v-if="task.description" class="text-xs text-gray-500">
                  {{ task.description }}
                </div>
              </div>
              <span v-if="task.status === 'completed'" class="text-xs text-green-600">
                ✓ 已完成
              </span>
            </div>
          </div>
          <div v-else class="text-center py-6 text-gray-500">
            <div class="text-3xl mb-2">📋</div>
            <p>点击"分配任务"为学生设置复活任务</p>
          </div>

          <!-- 复活按钮 -->
          <button
            v-if="canRevive"
            @click="confirmRevive"
            class="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            🎉 完成所有任务，点击复活宠物！
          </button>
          <div v-else-if="assignedTasks.length > 0" class="text-center text-sm text-gray-500">
            完成所有任务后即可复活宠物
          </div>
        </div>

        <!-- 快速评价（复用组件） - 阵亡学生也可以评价 -->
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

      <!-- 分配任务弹窗 -->
      <Transition name="modal">
        <div v-if="showAssignModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4" @click.self="closeAssignModal">
          <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-auto shadow-2xl">
            <div class="p-4 border-b flex items-center justify-between">
              <h3 class="font-bold text-lg">📋 选择复活任务</h3>
              <button @click="closeAssignModal" class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
                ×
              </button>
            </div>
            <div class="p-4">
              <p class="text-sm text-gray-500 mb-4">为学生选择复活任务：</p>
              <div class="space-y-2 max-h-60 overflow-auto">
                <label
                  v-for="task in availableTasks"
                  :key="task.id"
                  class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  :class="selectedTaskIds.includes(task.id) ? 'bg-orange-50 border-2 border-orange-300' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'"
                >
                  <input
                    type="checkbox"
                    :value="task.id"
                    v-model="selectedTaskIds"
                    class="w-5 h-5 rounded text-orange-500 focus:ring-orange-400"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-gray-800">{{ task.name }}</div>
                    <div v-if="task.description" class="text-xs text-gray-500">
                      {{ task.description }}
                    </div>
                  </div>
                </label>
              </div>
              <p class="text-sm text-gray-500 mt-3">
                已选择 {{ selectedTaskIds.length }} 个任务
              </p>
            </div>
            <div class="p-4 border-t flex gap-3">
              <button
                @click="closeAssignModal"
                class="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                @click="assignTasks"
                :disabled="selectedTaskIds.length === 0"
                class="flex-1 py-2.5 bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <ConfirmDialog
    :show="confirmDialog.show"
    :title="confirmDialog.title"
    :message="confirmDialog.message"
    :confirm-text="confirmDialog.confirmText"
    :cancel-text="confirmDialog.cancelText"
    :type="confirmDialog.type"
    @confirm="confirmDialog.onConfirm"
    @cancel="closeConfirm"
  />
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.animate-scale-in {
  animation: scaleIn 0.3s ease;
}
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>