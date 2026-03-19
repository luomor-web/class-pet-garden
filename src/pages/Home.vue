<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick } from 'vue'
import type { Student, Class, Rule, EvaluationRecord } from '@/types'
import { useAuth, setGlobalErrorHandler } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useLevelUp } from '@/composables/useLevelUp'
import { usePetStatusAnimation } from '@/composables/usePetStatusAnimation'
import { getPetType } from '@/data/pets'
import { pinyin } from 'pinyin-pro'

// Components
import LoadingScreen from '@/components/LoadingScreen.vue'
import LevelUpModal from '@/components/LevelUpModal.vue'
import StudentCard from '@/components/StudentCard.vue'
import BatchActionBar from '@/components/BatchActionBar.vue'
import DetailPanel from '@/components/DetailPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AuthModal from '@/components/AuthModal.vue'
import Header from '@/components/layout/Header.vue'
import ClassModal from '@/components/modals/ClassModal.vue'
import StudentModal from '@/components/modals/StudentModal.vue'
import ImportModal from '@/components/modals/ImportModal.vue'
import EvaluationModal from '@/components/modals/EvaluationModal.vue'
import PetModal from '@/components/modals/PetModal.vue'
import RecordsModal from '@/components/modals/RecordsModal.vue'
import PetStatusModal from '@/components/PetStatusModal.vue'

// Auth & Toast
const { isGuest, username, logout, api } = useAuth()
const toast = useToast()
const { confirmDialog, showConfirm, closeConfirm } = useConfirm()
const { showLevelUpAnimation, levelUpInfo, levelUpPhase, triggerLevelUp } = useLevelUp()
const { triggerAnimation: triggerPetStatusAnimation } = usePetStatusAnimation()

// 设置全局错误处理器
setGlobalErrorHandler((message) => {
  toast.error(message)
})

// State
const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const students = ref<Student[]>([])
const rules = ref<Rule[]>([])
const searchQuery = ref('')
const sortBy = ref<'name' | 'studentNo' | 'progress'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const isLoading = ref(true)
const isLoaded = ref(false)

// 数据版本控制（用于判断是否需要刷新）
const lastDataVersion = ref<number>(0)

function getDataVersion(): number {
  return parseInt(localStorage.getItem('pet-garden-data-version') || '0', 10)
}

// Modal states
const showClassModal = ref(false)
const showClassSelect = ref(false)
const showStudentModal = ref(false)
const showImportModal = ref(false)
const showEvalModal = ref(false)
const showPetModal = ref(false)
const showRecordsModal = ref(false)
const showDetailPanel = ref(false)
const showAuthModal = ref(false)
const editingClass = ref<Class | null>(null)
const selectedStudent = ref<Student | null>(null)
const detailStudent = ref<Student | null>(null)
const studentRecords = ref<EvaluationRecord[]>([])

// Batch mode
const batchMode = ref(false)
const selectedStudents = ref<Set<string>>(new Set())
const showDeleteStudentMode = ref(false)
const deleteStudentList = ref<string[]>([])

// Evaluation records
const evaluationRecords = ref<EvaluationRecord[]>([])
const recordsPage = ref(1)
const totalRecords = ref(0)
const totalPages = ref(0)

// Score animations
const scoreAnimations = ref<Map<string, { points: number; show: boolean }>>(new Map())

// 辅助函数：获取拼音首字母
function getPinyinInitials(text: string): string {
  return pinyin(text, { pattern: 'first', toneType: 'none' }).replace(/\s/g, '').toLowerCase()
}

// 辅助函数：获取完整拼音
function getPinyinFull(text: string): string {
  return pinyin(text, { toneType: 'none' }).replace(/\s/g, '').toLowerCase()
}

// Computed
const filteredStudents = computed(() => {
  let result = [...students.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(s => {
      // 1. 姓名匹配
      if (s.name.toLowerCase().includes(query)) return true
      
      // 2. 学号匹配
      if (s.student_no && s.student_no.toLowerCase().includes(query)) return true
      
      // 3. 拼音首字母匹配（如 "cxm" 匹配 "陈小明"）
      const initials = getPinyinInitials(s.name)
      if (initials.includes(query)) return true
      
      // 4. 完整拼音匹配
      const fullPinyin = getPinyinFull(s.name)
      if (fullPinyin.includes(query)) return true
      
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

const selectedEvalTab = ref('学习')
const detailEvalTab = ref('学习')

// API functions
async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
    if (classes.value.length > 0) {
      const savedClassId = localStorage.getItem('pet-garden-current-class')
      const savedClass = savedClassId ? classes.value.find(c => c.id === savedClassId) : null
      if (savedClass) await selectClass(savedClass)
      else if (!currentClass.value || !classes.value.find(c => c.id === currentClass.value?.id)) {
        await selectClass(classes.value[0])
      }
    } else {
      currentClass.value = null
      students.value = []
    }
  } catch (error) {
    console.error('加载班级失败:', error)
  }
}

async function selectClass(cls: Class) {
  currentClass.value = cls
  localStorage.setItem('pet-garden-current-class', cls.id)
  await loadStudents()
}

async function loadStudents() {
  if (!currentClass.value) return
  const res = await api.get(`/classes/${currentClass.value.id}/students`)
  students.value = res.data.students
}

async function loadRules() {
  const res = await api.get('/rules')
  rules.value = res.data.rules
}

// Class actions
async function createClass(name: string) {
  if (!name.trim()) { toast.warning('请输入班级名称'); return }
  try {
    await api.post('/classes', { name: name.trim() })
    showClassModal.value = false
    editingClass.value = null
    await loadClasses()
    toast.success('班级创建成功！')
  } catch (error) {
    toast.error('创建班级失败，请重试')
  }
}

async function updateClass(name: string) {
  if (!editingClass.value || !name.trim()) return
  try {
    await api.put(`/classes/${editingClass.value.id}`, { name: name.trim() })
    if (currentClass.value?.id === editingClass.value.id) {
      currentClass.value = { ...currentClass.value, name: name.trim() }
    }
    showClassModal.value = false
    editingClass.value = null
    await loadClasses()
  } catch (error) {
    toast.error('更新班级失败')
  }
}

function openCreateClassModal() {
  editingClass.value = null
  showClassModal.value = true
}

function openEditClassModal() {
  if (!currentClass.value) return
  editingClass.value = currentClass.value
  showClassModal.value = true
}

function handleDeleteClass() {
  if (!currentClass.value) return
  showConfirm({
    title: '删除班级',
    message: '确定删除该班级？所有学生数据将一并删除！',
    confirmText: '删除',
    type: 'danger',
    onConfirm: async () => {
      await api.delete(`/classes/${currentClass.value!.id}`)
      currentClass.value = null
      students.value = []
      await loadClasses()
      toast.success('班级删除成功！')
    }
  })
}

// Student actions
async function addStudent(name: string, studentNo: string) {
  if (!name.trim() || !currentClass.value) return
  try {
    await api.post('/students', { classId: currentClass.value.id, name: name.trim(), studentNo: studentNo || null })
    showStudentModal.value = false
    await loadStudents()
  } catch (error) {
    toast.error('添加学生失败')
  }
}

async function importStudents(text: string) {
  if (!text.trim() || !currentClass.value) return
  const lines = text.trim().split('\n')
  const studentList = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/[\t,\s;]+/)
    if (parts.length >= 2) {
      studentList.push({ name: parts[0], studentNo: parts.slice(1).join('') })
    } else if (parts.length === 1) {
      studentList.push({ name: parts[0], studentNo: '' })
    }
  }
  if (studentList.length === 0) { toast.warning('没有识别到学生信息'); return }
  try {
    const res = await api.post('/students/import', { classId: currentClass.value.id, students: studentList })
    toast.success(`成功导入 ${res.data.imported} 名学生`)
    showImportModal.value = false
    await loadStudents()
  } catch (error) {
    toast.error('导入失败')
  }
}

async function batchDeleteStudents() {
  if (deleteStudentList.value.length === 0) return
  showConfirm({
    title: '删除学生',
    message: `确定删除 ${deleteStudentList.value.length} 名学生？此操作不可恢复！`,
    confirmText: '删除',
    type: 'danger',
    onConfirm: async () => {
      let successCount = 0
      for (const studentId of deleteStudentList.value) {
        try {
          await api.delete(`/students/${studentId}`)
          successCount++
        } catch (error) {
          console.error('删除失败:', error)
        }
      }
      toast.success(`已删除 ${successCount} 名学生`)
      cancelDeleteMode()
      await loadStudents()
    }
  })
}

// Pet actions
async function selectPet(petId: string) {
  if (!selectedStudent.value) return
  try {
    await api.put(`/students/${selectedStudent.value.id}/pet`, { petType: petId })
    const pet = getPetType(petId)
    toast.success(`🎉 ${selectedStudent.value.name} 领养了一只 ${pet?.name || '宠物'}！`)
    showPetModal.value = false
    selectedStudent.value = null
    await loadStudents()
    if (detailStudent.value) {
      detailStudent.value = students.value.find(s => s.id === detailStudent.value?.id) || null
    }
  } catch (error) {
    toast.error('领养失败')
  }
}

// Evaluation actions
function triggerScoreAnimation(studentId: string, points: number) {
  scoreAnimations.value.set(studentId, { points, show: true })
  setTimeout(() => scoreAnimations.value.delete(studentId), 1500)
}

async function handleEvaluate(rule: Rule) {
  if (!currentClass.value) return

  if (!selectedStudent.value) {
    // Batch mode
    const studentIds = Array.from(selectedStudents.value)
    for (const studentId of studentIds) {
      try {
        await api.post('/evaluations', {
          classId: currentClass.value.id,
          studentId,
          points: rule.points,
          reason: rule.name,
          category: rule.category
        })
        triggerScoreAnimation(studentId, rule.points)
      } catch (error) {
        console.error('评价失败:', error)
      }
    }
    showEvalModal.value = false
    toast.success(`已为 ${studentIds.length} 名学生${rule.points > 0 ? '加' : '扣'}${Math.abs(rule.points)}分`)
    cancelBatchMode()
    await loadStudents()
    return
  }

  try {
    const res = await api.post('/evaluations', {
      classId: currentClass.value.id,
      studentId: selectedStudent.value.id,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })
    triggerScoreAnimation(selectedStudent.value.id, rule.points)
    if (res.data.levelUp) {
      triggerLevelUp(selectedStudent.value.name, res.data.petLevel, selectedStudent.value.pet_type || '', res.data.petLevel - 1)
    }
    if (res.data.graduated) {
      toast.success(`🎓 恭喜！${selectedStudent.value.name} 的宠物毕业了！`)
    }
    // 计算新的总积分
    const newTotalPoints = selectedStudent.value.total_points + rule.points
    // 死亡动画
    if (res.data.died) {
      triggerPetStatusAnimation('death', selectedStudent.value.name, selectedStudent.value.pet_type || '', selectedStudent.value.pet_level || 1, 'injured', 'dead', newTotalPoints)
    }
    // 受伤动画
    else if (res.data.injured) {
      triggerPetStatusAnimation('injured', selectedStudent.value.name, selectedStudent.value.pet_type || '', selectedStudent.value.pet_level || 1, 'alive', 'injured', newTotalPoints)
    }
    // 复活动画
    else if (res.data.revived) {
      triggerPetStatusAnimation('revive', selectedStudent.value.name, selectedStudent.value.pet_type || '', selectedStudent.value.pet_level || 1, 'dead', 'alive', newTotalPoints)
    }
    // 恢复动画
    else if (res.data.healed && !res.data.revived) {
      triggerPetStatusAnimation('heal', selectedStudent.value.name, selectedStudent.value.pet_type || '', selectedStudent.value.pet_level || 1, 'injured', 'alive', newTotalPoints)
    }
    showEvalModal.value = false
    await loadStudents()
  } catch (error) {
    toast.error('评价失败')
  }
}

async function handleDetailEvaluate(rule: Rule) {
  if (!detailStudent.value || !currentClass.value) return
  try {
    const res = await api.post('/evaluations', {
      classId: currentClass.value.id,
      studentId: detailStudent.value.id,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })
    triggerScoreAnimation(detailStudent.value.id, rule.points)
    if (res.data.levelUp) {
      triggerLevelUp(detailStudent.value.name, res.data.petLevel, detailStudent.value.pet_type || '', res.data.petLevel - 1)
    }
    // 计算新的总积分
    const newTotalPoints = detailStudent.value.total_points + rule.points
    // 死亡动画
    if (res.data.died) {
      triggerPetStatusAnimation('death', detailStudent.value.name, detailStudent.value.pet_type || '', detailStudent.value.pet_level || 1, 'injured', 'dead', newTotalPoints)
    }
    // 受伤动画
    else if (res.data.injured) {
      triggerPetStatusAnimation('injured', detailStudent.value.name, detailStudent.value.pet_type || '', detailStudent.value.pet_level || 1, 'alive', 'injured', newTotalPoints)
    }
    // 复活动画
    else if (res.data.revived) {
      triggerPetStatusAnimation('revive', detailStudent.value.name, detailStudent.value.pet_type || '', detailStudent.value.pet_level || 1, 'dead', 'alive', newTotalPoints)
    }
    // 恢复动画
    else if (res.data.healed && !res.data.revived) {
      triggerPetStatusAnimation('heal', detailStudent.value.name, detailStudent.value.pet_type || '', detailStudent.value.pet_level || 1, 'injured', 'alive', newTotalPoints)
    }
    await loadStudents()
    closeDetailPanel()
  } catch (error) {
    toast.error('评价失败')
  }
}

// Detail panel
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
  detailEvalTab.value = '学习'
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

// Batch mode
function startBatchMode() {
  batchMode.value = true
  selectedStudents.value = new Set()
}

function cancelBatchMode() {
  batchMode.value = false
  selectedStudents.value = new Set()
}

function toggleStudentSelect(studentId: string) {
  const newSet = new Set(selectedStudents.value)
  if (newSet.has(studentId)) newSet.delete(studentId)
  else newSet.add(studentId)
  selectedStudents.value = newSet
}

function cancelDeleteMode() {
  showDeleteStudentMode.value = false
  deleteStudentList.value = []
}

function toggleDeleteStudent(studentId: string) {
  const index = deleteStudentList.value.indexOf(studentId)
  if (index > -1) deleteStudentList.value.splice(index, 1)
  else deleteStudentList.value.push(studentId)
}

// Records
async function loadEvaluationRecords() {
  if (!currentClass.value) return
  const res = await api.get(`/evaluations?classId=${currentClass.value.id}&page=${recordsPage.value}&pageSize=20`)
  evaluationRecords.value = res.data.records
  totalRecords.value = res.data.total
  totalPages.value = res.data.totalPages
}

async function handleUndoLastEvaluation(recordId?: string) {
  if (!currentClass.value) return
  showConfirm({
    title: '撤回评价',
    message: '确定要撤回这条评价吗？',
    confirmText: '撤回',
    type: 'warning',
    onConfirm: async () => {
      try {
        let res
        if (recordId) res = await api.delete(`/evaluations/${recordId}`)
        else res = await api.delete(`/evaluations/latest?classId=${currentClass.value!.id}`)
        if (res.data.success) {
          toast.success(`已撤回：${res.data.undone.points > 0 ? '+' : ''}${res.data.undone.points}分`)
          await loadStudents()
          await loadEvaluationRecords()
        }
      } catch (error) {
        toast.error('撤回失败')
      }
    }
  })
}

// Initialize
onMounted(async () => {
  isLoading.value = true
  try {
    await loadClasses()
    await loadRules()
    lastDataVersion.value = getDataVersion()
  } finally {
    isLoading.value = false
    nextTick(() => { isLoaded.value = true })
  }
})

onActivated(() => {
  // 检测数据版本是否变化（其他页面修改了数据）
  const currentVersion = getDataVersion()
  if (currentVersion > lastDataVersion.value) {
    lastDataVersion.value = currentVersion
    loadStudents()
  }
  // 刷新规则（可能在规则管理页面添加了新规则）
  loadRules()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex flex-col">
    <!-- Loading -->
    <LoadingScreen :show="isLoading" />

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

    <!-- Header -->
    <Header
      :classes="classes"
      :current-class="currentClass"
      :is-guest="isGuest"
      :username="username"
      :batch-mode="batchMode"
      @login="showAuthModal = true"
      @logout="logout(); loadClasses(); loadRules(); toast.success('已退出登录')"
    />

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-6">
      <!-- 工具栏：班级选择、搜索、排序、批量评价 -->
      <div v-if="!batchMode" class="mb-4 flex flex-wrap items-center gap-3">
        <!-- 班级选择（自定义下拉） -->
        <div class="relative" v-if="classes.length > 0">
          <button 
            @click="showClassSelect = !showClassSelect"
            class="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm bg-white shadow-sm hover:border-orange-400 transition-colors font-medium"
          >
            <span>📚</span>
            <span>{{ currentClass?.name || '选择班级' }}</span>
            <span class="text-gray-400">▾</span>
          </button>
          <div v-if="showClassSelect" @click="showClassSelect = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showClassSelect" class="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-56 z-50 overflow-hidden">
              <!-- 班级列表 -->
              <div class="max-h-48 overflow-auto">
                <button
                  v-for="cls in classes"
                  :key="cls.id"
                  @click="selectClass(cls); showClassSelect = false"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors flex items-center gap-2"
                  :class="cls.id === currentClass?.id ? 'bg-orange-50 text-orange-600 font-medium' : ''"
                >
                  <span>{{ cls.id === currentClass?.id ? '✓' : '' }}</span>
                  <span>{{ cls.name }}</span>
                </button>
              </div>
              <!-- 分隔线和管理操作 -->
              <div class="border-t border-gray-100 mt-1 pt-1">
                <button @click="showClassSelect = false; openCreateClassModal()" class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">➕ 新建班级</button>
                <button v-if="currentClass" @click="showClassSelect = false; openEditClassModal()" class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">✏️ 重命名班级</button>
                <button v-if="currentClass" @click="showClassSelect = false; handleDeleteClass()" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">🗑️ 删除班级</button>
              </div>
            </div>
          </Transition>
        </div>
        <span v-if="students.length > 0" class="text-sm text-gray-500">
          {{ students.length }} 人
        </span>

        <!-- 弹性空间，让后面的内容居中 -->
        <div class="flex-1"></div>

        <!-- 搜索和排序（居中） -->
        <div v-if="students.length > 0" class="flex items-center gap-3">
          <!-- 搜索 -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 搜索学生..."
            class="w-48 border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:border-orange-400 transition-colors"
          />

          <!-- 排序按钮组 -->
          <div class="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            <button 
              @click="sortBy = 'name'; sortOrder = 'asc'" 
              class="px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === 'name' && sortOrder === 'asc' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'"
            >A-Z</button>
            <button 
              @click="sortBy = 'name'; sortOrder = 'desc'" 
              class="px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === 'name' && sortOrder === 'desc' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'"
            >Z-A</button>
            <button 
              @click="sortBy = 'studentNo'; sortOrder = 'asc'" 
              class="px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === 'studentNo' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'"
            >学号</button>
            <button 
              @click="sortBy = 'progress'; sortOrder = 'desc'" 
              class="px-2 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === 'progress' ? 'bg-orange-100 text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'"
            >进度</button>
          </div>
        </div>

        <!-- 弹性空间 -->
        <div class="flex-1"></div>

        <!-- 批量评价按钮 -->
        <button
          v-if="students.length > 0"
          @click="startBatchMode"
          class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-sm shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          ✅ 批量评价
        </button>
      </div>

      <Transition name="fade" mode="out-in">
        <!-- 无班级状态 -->
        <div v-if="classes.length === 0" key="no-class" class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="text-8xl mb-6 animate-float">🏫</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-3">还没有班级</h3>
          <p class="text-gray-500 mb-6 text-lg">创建一个班级，开启你的宠物园之旅吧！</p>
          <button @click="showClassModal = true" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold text-lg">
            ✨ 创建第一个班级
          </button>
        </div>

        <!-- 无学生状态 -->
        <div v-else-if="students.length === 0" key="no-student" class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="text-8xl mb-6 animate-float">👨‍🎓</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-3">还没有学生</h3>
          <p class="text-gray-500 mb-6 text-lg">添加学生，让他们领养可爱的宠物吧！</p>
          <div class="flex gap-3">
            <button @click="showStudentModal = true" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold">➕ 添加学生</button>
            <button @click="showImportModal = true" class="bg-white text-gray-700 px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold border border-gray-200">📥 批量导入</button>
          </div>
        </div>

        <!-- 学生列表 -->
        <div v-else key="students" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          <StudentCard
            v-for="student in filteredStudents"
            :key="student.id"
            :student="student"
            :is-selected="batchMode && selectedStudents.has(student.id)"
            :is-delete-mode="showDeleteStudentMode"
            :is-delete-selected="showDeleteStudentMode && deleteStudentList.includes(student.id)"
            :score-animation="scoreAnimations.get(student.id)"
            @click="batchMode ? toggleStudentSelect(student.id) : showDeleteStudentMode ? toggleDeleteStudent(student.id) : openDetailPanel(student)"
          />
        </div>
      </Transition>

      <!-- Batch Action Bar -->
      <BatchActionBar
        v-if="batchMode"
        :selected-count="selectedStudents.size"
        mode="batch"
        @add-points="selectedEvalTab = '学习'; selectedStudent = null; showEvalModal = true"
        @sub-points="selectedEvalTab = '行为'; selectedStudent = null; showEvalModal = true"
      />

      <BatchActionBar
        v-if="showDeleteStudentMode"
        :selected-count="deleteStudentList.length"
        mode="delete"
        @confirm-delete="batchDeleteStudents"
        @cancel="cancelDeleteMode"
      />
    </main>

    <!-- Modals -->
    <ClassModal :show="showClassModal" :editing="editingClass" @close="showClassModal = false; editingClass = null" @submit="editingClass ? updateClass($event) : createClass($event)" />
    <StudentModal :show="showStudentModal" @close="showStudentModal = false" @submit="addStudent" />
    <ImportModal :show="showImportModal" @close="showImportModal = false" @submit="importStudents" />
    <EvaluationModal :show="showEvalModal" :student="selectedStudent" :selected-count="selectedStudents.size" :rules="rules" @close="showEvalModal = false" @evaluate="handleEvaluate" />
    <PetModal :show="showPetModal" :student="selectedStudent" @close="showPetModal = false; selectedStudent = null" @select="selectPet" />
    <RecordsModal :show="showRecordsModal" :records="evaluationRecords" :total-records="totalRecords" :page="recordsPage" :total-pages="totalPages" @close="showRecordsModal = false" @undo="handleUndoLastEvaluation" @prev-page="recordsPage--; loadEvaluationRecords()" @next-page="recordsPage++; loadEvaluationRecords()" @go-to-page="recordsPage = $event; loadEvaluationRecords()" />
    <DetailPanel :show="showDetailPanel" :student="detailStudent" :rules="rules" :student-records="studentRecords" @close="closeDetailPanel" @change-pet="showDetailPanel = false; selectedStudent = detailStudent; showPetModal = true" @evaluate="handleDetailEvaluate" />
    <ConfirmDialog :show="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :type="confirmDialog.type" @confirm="confirmDialog.onConfirm" @cancel="closeConfirm" />
    <AuthModal :show="showAuthModal" @close="showAuthModal = false" @login="toast.success(`欢迎，${$event.username}！`); loadClasses(); loadRules()" />
  </div>
</template>

<style scoped>
/* 过渡动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.9); }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-10px); }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translate(-50%, 100%); }

.pop-enter-active, .pop-leave-active { transition: all 0.2s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.5); }

.score-pop-enter-active { animation: scorePopIn 0.5s ease-out; }
.score-pop-leave-active { transition: all 0.3s ease; }
.score-pop-leave-to { opacity: 0; transform: scale(0.5); }

@keyframes scorePopIn {
  0% { opacity: 0; transform: scale(0.5); }
  50% { transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes sparkle {
  0% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.5) rotate(180deg); }
  100% { opacity: 0; transform: scale(0) rotate(360deg); }
}

.animate-sparkle { animation: sparkle 0.8s ease-out forwards; }
.animate-bounce-in { animation: bounceIn 0.5s ease-out; }

@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #fb923c, #f472b6); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #f97316, #ec4899); }
</style>