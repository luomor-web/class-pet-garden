<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick } from 'vue'
import type { Student, Rule, EvaluationRecord, Tag } from '@/types'
import { useAuth, setGlobalErrorHandler } from '@/composables/useAuth'
import { useClasses } from '@/composables/useClasses'
import { useStudents } from '@/composables/useStudents'
import { useTags } from '@/composables/useTags'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useLevelUp } from '@/composables/useLevelUp'
import { usePetStatusAnimation } from '@/composables/usePetStatusAnimation'
import { useLoginModal } from '@/composables/useLoginModal'
import { getPetType } from '@/data/pets'
import { matchByPinyin } from '@/utils/pinyin'

// Components
import LoadingScreen from '@/components/LoadingScreen.vue'
import LevelUpModal from '@/components/LevelUpModal.vue'
import StudentCard from '@/components/StudentCard.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import DetailPanel from '@/components/DetailPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AuthModal from '@/components/AuthModal.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import EvaluationModal from '@/components/modals/EvaluationModal.vue'
import PetModal from '@/components/modals/PetModal.vue'
import PetStatusModal from '@/components/PetStatusModal.vue'
import ClassModal from '@/components/modals/ClassModal.vue'

// Auth & Toast
const { api } = useAuth()
const toast = useToast()
const { confirmDialog, showConfirm, closeConfirm } = useConfirm()
const { showLevelUpAnimation, levelUpInfo, levelUpPhase, triggerLevelUp } = useLevelUp()
const { triggerAnimation: triggerPetStatusAnimation } = usePetStatusAnimation()

// 使用全局状态
const { classes, currentClass, loadClasses, createClass } = useClasses()
const { students, loadStudents, changePet, batchEvaluate, addEvaluation } = useStudents()
const { allTags, loadTags, getStudentTags } = useTags()
const { showLoginModal, closeLoginModal } = useLoginModal()

// 设置全局错误处理器
setGlobalErrorHandler((message) => {
  toast.error(message)
})

// State
const rules = ref<Rule[]>([])
const searchQuery = ref('')
const sortBy = ref<'name' | 'studentNo' | 'progress'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const isLoaded = ref(false)

// Modal states
const showEvalModal = ref(false)
const showPetModal = ref(false)
const showClassModal = ref(false)
const showDetailPanel = ref(false)
const selectedStudent = ref<Student | null>(null)
const detailStudent = ref<Student | null>(null)
const studentRecords = ref<EvaluationRecord[]>([])

// Batch mode
const batchMode = ref(false)
const selectedStudents = ref<Set<string>>(new Set())

// Score animations
const scoreAnimations = ref<Map<string, { points: number; show: boolean }>>(new Map())

// 标签过滤
const selectedTagFilter = ref<Tag | null>(null)
const showTagFilter = ref(false)

// Computed
const filteredStudents = computed(() => {
  let result = [...students.value]
  if (selectedTagFilter.value) {
    result = result.filter(s => {
      const studentTags = getStudentTags(s.id)
      return studentTags.some((t: Tag) => t.id === selectedTagFilter.value!.id)
    })
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(s => {
      if (s.name.toLowerCase().includes(query)) return true
      if (s.student_no && s.student_no.toLowerCase().includes(query)) return true
      if (matchByPinyin(s.name, query)) return true
      return false
    })
  }
  result.sort((a, b) => {
    let comparison = 0
    switch (sortBy.value) {
      case 'name': comparison = a.name.localeCompare(b.name); break
      case 'studentNo': comparison = (a.student_no || '').localeCompare(b.student_no || ''); break
      case 'progress':
        const levelA = a.pet_level || 0, levelB = b.pet_level || 0
        comparison = levelA !== levelB ? levelA - levelB : (a.pet_exp || 0) - (b.pet_exp || 0)
        break
    }
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
  return result
})

// 处理登录成功
function handleLogin(user: { id: string; username: string; isGuest: boolean }) {
  toast.success(`欢迎，${user.username}！`)
  loadClasses()
  loadRules()
}

// 数据加载
async function loadRules() {
  try {
    const res = await api.get('/rules')
    rules.value = res.data.rules
  } catch (error) {
    console.error('加载规则失败:', error)
  }
}

// 宠物操作
async function selectPet(petId: string) {
  if (!selectedStudent.value) return
  try {
    await changePet(selectedStudent.value.id, petId)
    const pet = getPetType(petId)
    toast.success(`🎉 ${selectedStudent.value.name} 领养了一只 ${pet?.name || '宠物'}！`)
    showPetModal.value = false
    selectedStudent.value = null
    if (detailStudent.value) {
      detailStudent.value = students.value.find(s => s.id === detailStudent.value?.id) || null
    }
  } catch (error) {
    toast.error('领养失败')
  }
}

// 评价操作
function triggerScoreAnimation(studentId: string, points: number) {
  scoreAnimations.value.set(studentId, { points, show: true })
  setTimeout(() => scoreAnimations.value.delete(studentId), 1500)
}

function handlePetStatusChange(res: any, student: Student, pointsDelta: number) {
  const newTotalPoints = student.total_points + pointsDelta
  if (res?.died) {
    triggerPetStatusAnimation('death', student.name, student.pet_type || '', student.pet_level || 1, 'injured', 'dead', newTotalPoints)
  } else if (res?.injured) {
    triggerPetStatusAnimation('injured', student.name, student.pet_type || '', student.pet_level || 1, 'alive', 'injured', newTotalPoints)
  } else if (res?.revived) {
    triggerPetStatusAnimation('revive', student.name, student.pet_type || '', student.pet_level || 1, 'dead', 'alive', newTotalPoints)
  } else if (res?.healed && !res.revived) {
    triggerPetStatusAnimation('heal', student.name, student.pet_type || '', student.pet_level || 1, 'injured', 'alive', newTotalPoints)
  }
}

async function doEvaluate(student: Student, rule: Rule) {
  try {
    const res = await addEvaluation(student.id, { points: rule.points, name: rule.name, category: rule.category })
    triggerScoreAnimation(student.id, rule.points)
    if (res?.levelUp) {
      triggerLevelUp(student.name, res.petLevel, student.pet_type || '', res.petLevel - 1)
    }
    if (res?.graduated) {
      toast.success(`🎓 恭喜！${student.name} 的宠物毕业了！`)
    }
    handlePetStatusChange(res, student, rule.points)
    return res
  } catch (error) {
    toast.error('评价失败')
    return null
  }
}

async function handleEvaluate(rule: Rule) {
  if (!currentClass.value) return

  // 批量评价模式
  if (!selectedStudent.value) {
    const studentIds = Array.from(selectedStudents.value)
    try {
      await batchEvaluate(studentIds, { points: rule.points, name: rule.name, category: rule.category })
      for (const studentId of studentIds) {
        triggerScoreAnimation(studentId, rule.points)
      }
      showEvalModal.value = false
      toast.success(`已为 ${studentIds.length} 名学生${rule.points > 0 ? '加' : '扣'}${Math.abs(rule.points)}分`)
      cancelBatchMode()
    } catch (error) {
      toast.error('评价失败')
    }
    return
  }

  // 单个学生评价
  const res = await doEvaluate(selectedStudent.value, rule)
  if (res) {
    showEvalModal.value = false
  }
}

async function handleDetailEvaluate(rule: Rule) {
  if (!detailStudent.value || !currentClass.value) return
  const res = await doEvaluate(detailStudent.value, rule)
  if (res) {
    closeDetailPanel()
  }
}

// 创建班级
async function handleCreateClass(name: string) {
  if (!name.trim()) {
    toast.warning('请输入班级名称')
    return
  }
  try {
    await createClass(name.trim())
    toast.success('班级创建成功！')
    showClassModal.value = false
  } catch (error) {
    toast.error('创建班级失败')
  }
}

// 详情面板
async function openDetailPanel(student: Student) {
  if (!student.pet_type) {
    showConfirm({
      title: '领养宠物',
      message: `${student.name} 还没有领养宠物，是否现在领养？`,
      confirmText: '去领养',
      onConfirm: () => {
        selectedStudent.value = student
        showPetModal.value = true
      }
    })
    return
  }
  detailStudent.value = student
  showDetailPanel.value = true
  await loadStudentRecords(student.id)
}

async function loadStudentRecords(studentId: string) {
  try {
    const res = await api.get(`/evaluations?studentId=${studentId}&pageSize=20`)
    studentRecords.value = res.data.records || []
  } catch (error) {
    studentRecords.value = []
  }
}

function closeDetailPanel() {
  showDetailPanel.value = false
  detailStudent.value = null
  studentRecords.value = []
}

// 批量模式
function startBatchMode() {
  batchMode.value = true
  selectedStudents.value = new Set()
}

function cancelBatchMode() {
  batchMode.value = false
  selectedStudents.value = new Set()
}

function selectAllFiltered() {
  const newSet = new Set(selectedStudents.value)
  for (const student of filteredStudents.value) {
    newSet.add(student.id)
  }
  selectedStudents.value = newSet
}

function toggleStudentSelect(studentId: string) {
  const newSet = new Set(selectedStudents.value)
  if (newSet.has(studentId)) newSet.delete(studentId)
  else newSet.add(studentId)
  selectedStudents.value = newSet
}

onMounted(async () => {
  try {
    await loadClasses()
    await loadRules()
    await loadTags()
    await loadStudents()
  } finally {
    nextTick(() => { isLoaded.value = true })
  }
})

onActivated(() => {
  loadStudents()
  loadRules()
  loadTags()
})
</script>

<template>
  <PageLayout>
    <!-- Loading -->
    <LoadingScreen :show="!isLoaded" />

    <!-- Level Up Modal -->
    <LevelUpModal
      :show="showLevelUpAnimation"
      :name="levelUpInfo.name"
      :level="levelUpInfo.level"
      :pet-type="levelUpInfo.petType"
      :prev-level="levelUpInfo.prevLevel"
      :phase="levelUpPhase"
    />

    <!-- Pet Status Modal -->
    <PetStatusModal />

    <!-- Main Content -->
    <div v-if="isLoaded" class="overflow-auto">
      <!-- 工具栏 -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <!-- 左侧：搜索、标签、排序 -->
        <template v-if="students.length > 0 && !batchMode">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 搜索学生..."
            class="w-48 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:border-orange-400 transition-colors"
          />

          <!-- 标签过滤 -->
          <div v-if="allTags.length > 0" class="relative">
            <button
              @click="showTagFilter = !showTagFilter"
              class="flex items-center gap-1.5 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white shadow-sm hover:border-orange-400 transition-colors"
              :class="selectedTagFilter ? 'border-orange-400 text-orange-600' : 'text-gray-600'"
            >
              <span>🏷️</span>
              <span>{{ selectedTagFilter?.name || '标签' }}</span>
              <span class="text-gray-400 text-xs">▾</span>
            </button>
            <div v-if="showTagFilter" @click="showTagFilter = false" class="fixed inset-0 z-40"></div>
            <Transition name="dropdown">
              <div v-if="showTagFilter" class="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 z-50 overflow-hidden">
                <button v-if="selectedTagFilter" @click="selectedTagFilter = null; showTagFilter = false" class="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">✕ 清除筛选</button>
                <button v-for="tag in allTags" :key="tag.id" @click="selectedTagFilter = tag; showTagFilter = false" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2" :class="selectedTagFilter?.id === tag.id ? 'bg-orange-50 text-orange-600 font-medium' : ''">
                  <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: tag.color }"></span>{{ tag.name }}
                </button>
              </div>
            </Transition>
          </div>

          <!-- 排序按钮组 -->
          <div class="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            <button @click="sortBy = 'name'; sortOrder = 'asc'" class="px-2 py-1 text-xs rounded-md transition-colors" :class="sortBy === 'name' && sortOrder === 'asc' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'">A-Z</button>
            <button @click="sortBy = 'name'; sortOrder = 'desc'" class="px-2 py-1 text-xs rounded-md transition-colors" :class="sortBy === 'name' && sortOrder === 'desc' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'">Z-A</button>
            <button @click="sortBy = 'studentNo'; sortOrder = 'asc'" class="px-2 py-1 text-xs rounded-md transition-colors" :class="sortBy === 'studentNo' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'">学号</button>
            <button @click="sortBy = 'progress'; sortOrder = 'desc'" class="px-2 py-1 text-xs rounded-md transition-colors" :class="sortBy === 'progress' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'">进度</button>
          </div>

          <span class="text-sm text-gray-500">{{ students.length }} 人</span>
        </template>

        <!-- 批量模式提示 -->
        <div v-if="batchMode" class="flex items-center gap-2 text-orange-600 font-medium">
          <span>✅</span>
          <span>已选择 {{ selectedStudents.size }} 人</span>
        </div>

        <div class="flex-1"></div>

        <!-- 右侧：批量操作按钮 -->
        <button v-if="students.length > 0 && !batchMode" @click="startBatchMode" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all">✅ 批量评价</button>
        <template v-if="batchMode">
          <button @click="selectAllFiltered" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all">📋 全选 ({{ filteredStudents.length }})</button>
          <button @click="cancelBatchMode" class="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium text-sm shadow-sm hover:bg-orange-600 transition-all">✕ 退出批量评价</button>
        </template>
      </div>

      <Transition name="fade" mode="out-in">
        <!-- 无班级状态 -->
        <div v-if="classes.length === 0" key="no-class" class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="text-8xl mb-6 animate-float">🏫</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-3">还没有班级</h3>
          <p class="text-gray-500 mb-6 text-lg">创建一个班级，开启你的宠物园之旅吧！</p>
          <button @click="showClassModal = true" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold">
            ➕ 创建班级
          </button>
        </div>

        <!-- 无学生状态 -->
        <div v-else-if="students.length === 0" key="no-student" class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="text-8xl mb-6 animate-float">👨‍🎓</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-3">还没有学生</h3>
          <p class="text-gray-500 mb-6 text-lg">添加学生，让他们领养可爱的宠物吧！</p>
          <router-link to="/students" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold">
            👉 去学生管理
          </router-link>
        </div>

        <!-- 学生列表 -->
        <div v-else key="students" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          <StudentCard
            v-for="student in filteredStudents"
            :key="student.id"
            :student="student"
            :is-selected="batchMode && selectedStudents.has(student.id)"
            :score-animation="scoreAnimations.get(student.id)"
            @click="batchMode ? toggleStudentSelect(student.id) : openDetailPanel(student)"
          />
        </div>
      </Transition>

      <!-- Batch Action Bar -->
      <BatchActionBar
        v-if="batchMode"
        :selected-count="selectedStudents.size"
        mode="batch"
        @evaluate="selectedStudent = null; showEvalModal = true"
      />
    </div>

    <!-- Modals -->
    <EvaluationModal :show="showEvalModal" :selected-count="selectedStudents.size" :rules="rules" @close="showEvalModal = false" @evaluate="handleEvaluate" />
    <PetModal :show="showPetModal" :student="selectedStudent" @close="showPetModal = false; selectedStudent = null" @select="selectPet" />
    <DetailPanel :show="showDetailPanel" :student="detailStudent" :rules="rules" :student-records="studentRecords" @close="closeDetailPanel" @change-pet="showDetailPanel = false; selectedStudent = detailStudent; showPetModal = true" @evaluate="handleDetailEvaluate" />
    <ConfirmDialog :show="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :type="confirmDialog.type" @confirm="confirmDialog.onConfirm" @cancel="closeConfirm" />
    <AuthModal :show="showLoginModal" @close="closeLoginModal" @login="handleLogin($event)" />
    <ClassModal :show="showClassModal" @close="showClassModal = false" @submit="handleCreateClass" />
  </PageLayout>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-10px); }
</style>