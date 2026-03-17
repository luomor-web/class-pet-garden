<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import axios from 'axios'
import { PET_TYPES, getPetType, getLevelProgress, calculateLevel, getPetLevelImage, getPetLevel1Image } from '@/data/pets'
import PetImage from '@/components/PetImage.vue'

// 配置 axios baseURL
const api = axios.create({
  baseURL: '/pet-garden/api'
})

// Types
interface Class {
  id: string
  name: string
  created_at: number
}

interface Student {
  id: string
  class_id: string
  name: string
  student_no: string | null
  total_points: number
  pet_type: string | null
  pet_level: number
  pet_exp: number
}

interface Rule {
  id: string
  name: string
  points: number
  category: string
  is_custom?: boolean
}

// State
const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const students = ref<Student[]>([])
const rules = ref<Rule[]>([])
const searchQuery = ref('')

// Modals
const showClassModal = ref(false)
const showStudentModal = ref(false)
const showImportModal = ref(false)
const showAddModal = ref(false)
const showRankModal = ref(false)
const showPetModal = ref(false)
const showRecordsModal = ref(false)
const newClassName = ref('')
const editingClass = ref<Class | null>(null)
const newStudentName = ref('')
const newStudentNo = ref('')
const importText = ref('')
const selectedStudent = ref<Student | null>(null)
const evaluationRecords = ref<any[]>([])
const selectedEvalTab = ref('学习')
const showRulesModal = ref(false)
const newRuleName = ref('')
const newRulePoints = ref(1)
const newRuleCategory = ref('学习')
const batchMode = ref(false)
const selectedStudents = ref<Set<string>>(new Set())
const showClassMenu = ref(false)
const showStudentMenu = ref(false)
const showEvalMenu = ref(false)
const showDeleteStudentMode = ref(false)
const deleteStudentList = ref<string[]>([])
const recordsPage = ref(1)
const recordsPageSize = 20
const totalRecords = ref(0)
const sortBy = ref<'name' | 'studentNo' | 'progress'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const showSortMenu = ref(false)
const showPetMenu = ref(false)

// 图片加载状态（用于升级动画）
const levelUpImagesLoaded = ref({ prev: false, current: false })
const levelUpPhase = ref<'show-prev' | 'transition' | 'show-current'>('show-prev')

// 动画状态
const showLevelUpAnimation = ref(false)
const levelUpInfo = ref({ name: '', level: 0, petType: '', prevLevel: 0 })
const isLoaded = ref(false)
const isLoading = ref(true)

// 图片加载状态
const imageLoaded = ref<Record<string, boolean>>({})

// 详情面板
const showDetailPanel = ref(false)
const detailStudent = ref<Student | null>(null)
const detailEvalTab = ref('学习')

// 评分动效
const scoreAnimations = ref<Map<string, { points: number, show: boolean }>>(new Map())

// 学生评价记录
const studentRecords = ref<any[]>([])



function toggleSortMenu() {
  showSortMenu.value = !showSortMenu.value
}

function setSort(by: 'name' | 'studentNo' | 'progress', order: 'asc' | 'desc') {
  sortBy.value = by
  sortOrder.value = order
  showSortMenu.value = false
}

// Computed
const filteredStudents = computed(() => {
  let result = [...students.value]
  if (searchQuery.value) {
    result = result.filter(s => s.name.includes(searchQuery.value))
  }
  
  result.sort((a, b) => {
    let comparison = 0
    switch (sortBy.value) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'studentNo':
        const noA = a.student_no || ''
        const noB = b.student_no || ''
        comparison = noA.localeCompare(noB)
        break
      case 'progress':
        const levelA = a.pet_level || 0
        const levelB = b.pet_level || 0
        if (levelA !== levelB) {
          comparison = levelA - levelB
        } else {
          comparison = (a.pet_exp || 0) - (b.pet_exp || 0)
        }
        break
    }
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
  
  return result
})

const categories = ['学习', '行为', '健康', '其他']

const currentCategoryRules = computed(() => {
  return rules.value.filter(r => r.category === selectedEvalTab.value)
})



const ranking = computed(() => {
  return [...students.value].sort((a, b) => b.total_points - a.total_points)
})

function getLevelBgClass(level: number): string {
  if (level >= 10) return 'from-yellow-400 via-amber-400 to-orange-400'
  if (level >= 7) return 'from-pink-400 via-rose-400 to-red-400'
  if (level >= 5) return 'from-purple-400 via-violet-400 to-indigo-400'
  if (level >= 3) return 'from-blue-400 via-cyan-400 to-teal-400'
  return 'from-gray-400 via-slate-400 to-zinc-400'
}

// 等级边框样式 - 每个等级都不同
function getLevelBorderClass(level: number): string {
  const borders: Record<number, string> = {
    1: 'border border-gray-200', // 浅灰色细边框
    2: 'border-2 border-gray-300', // 灰色
    3: 'border-2 border-blue-400 shadow-md shadow-blue-400/10', // 蓝色
    4: 'border-2 border-cyan-400 shadow-md shadow-cyan-400/15', // 青色
    5: 'border-2 border-purple-400 shadow-lg shadow-purple-400/20', // 紫色
    6: 'border-2 border-pink-400 shadow-lg shadow-pink-400/25', // 粉色
    7: 'border-2 border-rose-400 shadow-xl shadow-rose-400/30', // 红色
    8: 'border-3 border-yellow-400 shadow-xl shadow-yellow-400/40', // 金色
  }
  return borders[level] || ''
}

// 计算显示等级（基于经验值实时计算，修复数据不一致问题）
function getDisplayLevel(student: Student): number {
  return calculateLevel(student.pet_exp)
}

// API calls
async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
    if (classes.value.length > 0) {
      const savedClassId = localStorage.getItem('pet-garden-current-class')
      const savedClass = savedClassId ? classes.value.find(c => c.id === savedClassId) : null
      
      if (savedClass) {
        await selectClass(savedClass)
      } else if (!currentClass.value || !classes.value.find(c => c.id === currentClass.value?.id)) {
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

async function createClass() {
  if (!newClassName.value.trim()) {
    alert('请输入班级名称')
    return
  }
  try {
    await api.post('/classes', { name: newClassName.value.trim() })
    newClassName.value = ''
    showClassModal.value = false
    await loadClasses()
  } catch (error) {
    console.error('创建班级失败:', error)
    alert('创建班级失败，请重试')
  }
}

async function updateClass() {
  if (!newClassName.value.trim()) {
    alert('请输入班级名称')
    return
  }
  const classToEdit = editingClass.value
  if (!classToEdit) return
  try {
    const newName = newClassName.value.trim()
    await api.put(`/classes/${classToEdit.id}`, { name: newName })
    // 如果当前选中的班级被修改，更新当前班级名称
    if (currentClass.value?.id === classToEdit.id) {
      currentClass.value = { ...currentClass.value, name: newName } as Class
    }
    newClassName.value = ''
    editingClass.value = null
    showClassModal.value = false
    await loadClasses()
  } catch (error) {
    console.error('更新班级失败:', error)
    alert('更新班级失败，请重试')
  }
}

function openCreateClassModal() {
  editingClass.value = null
  newClassName.value = ''
  showClassModal.value = true
}

function openEditClassModal() {
  if (!currentClass.value) return
  editingClass.value = currentClass.value
  newClassName.value = currentClass.value.name
  showClassModal.value = true
}

async function deleteClass(id: string) {
  if (!confirm('确定删除该班级？所有学生数据将一并删除！')) return
  await api.delete(`/classes/${id}`)
  if (currentClass.value?.id === id) {
    currentClass.value = null
    students.value = []
  }
  await loadClasses()
}

async function addStudent() {
  if (!newStudentName.value.trim() || !currentClass.value) return
  try {
    await api.post('/students', {
      classId: currentClass.value.id,
      name: newStudentName.value.trim(),
      studentNo: newStudentNo.value.trim() || null
    })
    newStudentName.value = ''
    newStudentNo.value = ''
    showStudentModal.value = false
    await loadStudents()
  } catch (error) {
    console.error('添加学生失败:', error)
    alert('添加学生失败，请重试')
  }
}

function openImportModal() {
  importText.value = ''
  showImportModal.value = true
}

async function importStudents() {
  if (!importText.value.trim() || !currentClass.value) return
  
  const lines = importText.value.trim().split('\n')
  const students = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    const parts = trimmed.split(/[\t,\s;]+/)
    if (parts.length >= 2) {
      students.push({ name: parts[0], studentNo: parts.slice(1).join('') })
    } else if (parts.length === 1) {
      students.push({ name: parts[0], studentNo: '' })
    }
  }
  
  if (students.length === 0) {
    alert('没有识别到学生信息')
    return
  }
  
  try {
    const res = await api.post('/students/import', {
      classId: currentClass.value.id,
      students
    })
    alert(`成功导入 ${res.data.imported} 名学生`)
    showImportModal.value = false
    importText.value = ''
    await loadStudents()
  } catch (error) {
    console.error('导入失败:', error)
    alert('导入失败，请重试')
  }
}

async function openPetSelect(student: Student) {
  selectedStudent.value = student
  showPetModal.value = true
}

async function selectPet(petId: string) {
  if (!selectedStudent.value) return
  try {
    await api.put(`/students/${selectedStudent.value.id}/pet`, { petType: petId })
    const pet = getPetType(petId)
    alert(`🎉 ${selectedStudent.value.name} 领养了一只 ${pet?.name || '宠物'}！`)
    showPetModal.value = false
    selectedStudent.value = null
    await loadStudents()
    // 更新详情面板中的学生信息
    if (detailStudent.value) {
      detailStudent.value = students.value.find(s => s.id === detailStudent.value?.id) || null
    }
  } catch (error) {
    console.error('领养宠物失败:', error)
    alert('领养失败，请重试')
  }
}

// 打开详情面板
async function openDetailPanel(student: Student) {
  if (!student.pet_type) {
    if (confirm(`${student.name} 还没有领养宠物，是否现在领养？`)) {
      selectedStudent.value = student
      showPetModal.value = true
    }
    return
  }
  detailStudent.value = student
  detailEvalTab.value = '学习'
  showDetailPanel.value = true
  
  // 加载该学生的评价记录
  await loadStudentRecords(student.id)
}

// 加载学生评价记录
async function loadStudentRecords(studentId: string) {
  try {
    const res = await api.get(`/evaluations?studentId=${studentId}&pageSize=20`)
    studentRecords.value = res.data.records || []
  } catch (error) {
    console.error('加载记录失败:', error)
    studentRecords.value = []
  }
}

// 关闭详情面板
function closeDetailPanel() {
  showDetailPanel.value = false
  detailStudent.value = null
  studentRecords.value = []
}

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
  if (newSet.has(studentId)) {
    newSet.delete(studentId)
  } else {
    newSet.add(studentId)
  }
  selectedStudents.value = newSet
}

function toggleDeleteStudent(studentId: string) {
  const index = deleteStudentList.value.indexOf(studentId)
  if (index > -1) {
    deleteStudentList.value.splice(index, 1)
  } else {
    deleteStudentList.value.push(studentId)
  }
}

function cancelDeleteMode() {
  showDeleteStudentMode.value = false
  deleteStudentList.value = []
}

async function batchDeleteStudents() {
  if (deleteStudentList.value.length === 0) return
  if (!confirm(`确定删除 ${deleteStudentList.value.length} 名学生？此操作不可恢复！`)) return
  
  let successCount = 0
  for (const studentId of deleteStudentList.value) {
    try {
      await api.delete(`/students/${studentId}`)
      successCount++
    } catch (error) {
      console.error('删除失败:', error)
    }
  }
  
  alert(`已删除 ${successCount} 名学生`)
  cancelDeleteMode()
  await loadStudents()
}

function selectAllStudents() {
  if (selectedStudents.value.size === filteredStudents.value.length) {
    selectedStudents.value = new Set()
  } else {
    selectedStudents.value = new Set(filteredStudents.value.map(s => s.id))
  }
}

async function batchAddPoints() {
  if (selectedStudents.value.size === 0) return
  selectedStudent.value = null
  selectedEvalTab.value = '学习'
  showAddModal.value = true
}

async function batchSubPoints() {
  if (selectedStudents.value.size === 0) return
  selectedStudent.value = null
  selectedEvalTab.value = '行为'
  showAddModal.value = true
}

// 触发评分动效
function triggerScoreAnimation(studentId: string, points: number) {
  scoreAnimations.value.set(studentId, { points, show: true })
  setTimeout(() => {
    scoreAnimations.value.delete(studentId)
  }, 1500)
}

// 详情面板中快速评分
async function detailQuickAdd(rule: Rule) {
  if (!detailStudent.value) return
  
  const student = detailStudent.value
  
  try {
    const res = await api.post('/evaluations', {
      classId: currentClass.value?.id,
      studentId: student.id,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })
    
    // 触发卡片动效
    triggerScoreAnimation(student.id, rule.points)
    
    if (res.data.levelUp) {
      levelUpInfo.value = { 
        name: student.name, 
        level: res.data.petLevel,
        petType: student.pet_type || '',
        prevLevel: res.data.petLevel - 1
      }
      levelUpImagesLoaded.value = { prev: false, current: false }
      levelUpPhase.value = 'show-prev'
      showLevelUpAnimation.value = true
      
      // 动画时序控制
      setTimeout(() => { levelUpPhase.value = 'transition' }, 500)
      setTimeout(() => { levelUpPhase.value = 'show-current' }, 1500)
      setTimeout(() => { showLevelUpAnimation.value = false }, 4000)
    }
    if (res.data.graduated) {
      alert(`🎓 恭喜！${student.name} 的宠物毕业了，获得了专属徽章！`)
    }
    
    await loadStudents()
    
    // 关闭详情面板
    closeDetailPanel()
  } catch (error) {
    console.error('评价失败:', error)
    alert('评价失败，请重试')
  }
}

async function quickAdd(student: Student | null, rule: Rule) {
  if (!student) {
    const studentIds = Array.from(selectedStudents.value)
    let successCount = 0
    
    for (const studentId of studentIds) {
      try {
        await api.post('/evaluations', {
          classId: currentClass.value?.id,
          studentId: studentId,
          points: rule.points,
          reason: rule.name,
          category: rule.category
        })
        successCount++
        // 触发动效
        triggerScoreAnimation(studentId, rule.points)
      } catch (error) {
        console.error('评价失败:', error)
      }
    }
    
    showAddModal.value = false
    alert(`已为 ${successCount} 名学生${rule.points > 0 ? '加' : '扣'}${Math.abs(rule.points)}分`)
    cancelBatchMode()
    await loadStudents()
    return
  }
  
  try {
    const res = await api.post('/evaluations', {
      classId: currentClass.value?.id,
      studentId: student.id,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })
    
    // 触发动效
    triggerScoreAnimation(student.id, rule.points)
    
    if (res.data.levelUp) {
      levelUpInfo.value = { 
        name: student.name, 
        level: res.data.petLevel,
        petType: student.pet_type || '',
        prevLevel: res.data.petLevel - 1
      }
      levelUpImagesLoaded.value = { prev: false, current: false }
      levelUpPhase.value = 'show-prev'
      showLevelUpAnimation.value = true
      
      // 动画时序控制
      setTimeout(() => { levelUpPhase.value = 'transition' }, 500)
      setTimeout(() => { levelUpPhase.value = 'show-current' }, 1500)
      setTimeout(() => { showLevelUpAnimation.value = false }, 4000)
    }
    if (res.data.graduated) {
      alert(`🎓 恭喜！${student.name} 的宠物毕业了，获得了专属徽章！`)
    }
    
    await loadStudents()
  } catch (error) {
    console.error('评价失败:', error)
    alert('评价失败，请重试')
  }
}

async function loadEvaluationRecords() {
  if (!currentClass.value) return
  const res = await api.get(`/evaluations?classId=${currentClass.value.id}&page=${recordsPage.value}&pageSize=${recordsPageSize}`)
  evaluationRecords.value = res.data.records
  totalRecords.value = res.data.total
}

const paginatedRecords = computed(() => {
  return evaluationRecords.value
})

const totalPages = computed(() => {
  return Math.ceil(totalRecords.value / recordsPageSize)
})

function prevPage() {
  if (recordsPage.value > 1) {
    recordsPage.value--
    loadEvaluationRecords()
  }
}

function nextPage() {
  if (recordsPage.value < totalPages.value) {
    recordsPage.value++
    loadEvaluationRecords()
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    recordsPage.value = page
    loadEvaluationRecords()
  }
}

async function undoLastEvaluation(recordId?: string) {
  if (!currentClass.value) return
  if (!confirm('确定要撤回这条评价吗？')) return
  
  try {
    let res
    if (recordId) {
      // 撤回指定记录
      res = await api.delete(`/evaluations/${recordId}`)
    } else {
      // 撤回最新记录
      res = await api.delete(`/evaluations/latest?classId=${currentClass.value.id}`)
    }
    
    if (res.data.success) {
      alert(`已撤回：${res.data.undone.student_name} ${res.data.undone.points > 0 ? '+' : ''}${res.data.undone.points}分`)
      await loadStudents()
      await loadEvaluationRecords()
    }
  } catch (error) {
    console.error('撤回失败:', error)
    alert('撤回失败')
  }
}

async function addRule() {
  if (!newRuleName.value.trim()) {
    alert('请输入规则名称')
    return
  }
  try {
    await api.post('/rules', {
      name: newRuleName.value.trim(),
      points: newRulePoints.value,
      category: newRuleCategory.value
    })
    newRuleName.value = ''
    newRulePoints.value = 1
    alert('添加成功！')
    await loadRules()
  } catch (error) {
    console.error('添加规则失败:', error)
    alert('添加失败，请重试')
  }
}

async function deleteRule(id: string) {
  if (!confirm('确定删除该规则？')) return
  try {
    await api.delete(`/rules/${id}`)
    await loadRules()
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败')
  }
}

async function exportBackup() {
  try {
    const res = await api.get('/backup', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pet-garden-backup-${Date.now()}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    alert('备份导出成功！')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

async function importBackup(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  if (!confirm('导入将覆盖现有数据，确定继续？')) {
    (event.target as HTMLInputElement).value = ''
    return
  }
  
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    await api.post('/restore', data)
    alert('数据恢复成功！')
    await loadClasses()
    await loadRules()
  } catch (error) {
    console.error('导入失败:', error)
    alert('导入失败，请确保文件格式正确')
  }
  (event.target as HTMLInputElement).value = ''
}

function getStudentPetImage(student: Student): string {
  if (!student.pet_type) return ''
  // 根据学生当前等级显示对应等级的宠物图片
  return getPetLevelImage(student.pet_type, student.pet_level)
}

// Initialize
onMounted(async () => {
  isLoading.value = true
  try {
    await loadClasses()
    await loadRules()
  } finally {
    isLoading.value = false
    nextTick(() => {
      isLoaded.value = true
    })
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex flex-col">
    
    <!-- 加载动画 -->
    <Transition name="fade">
      <div v-if="isLoading" class="fixed inset-0 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center z-[200]">
        <div class="text-center">
          <div class="text-8xl mb-6 animate-bounce">🐕</div>
          <div class="text-xl font-bold text-gray-600">加载中...</div>
          <div class="mt-4 flex justify-center gap-2">
            <span class="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- 升级动画 -->
    <Transition name="fade">
      <div v-if="showLevelUpAnimation" class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200]">
        <div class="relative">
          <!-- 背景光晕 -->
          <div class="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 rounded-full blur-3xl opacity-60 animate-pulse"></div>
          
          <!-- 主内容 -->
          <div class="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 text-center shadow-2xl border-4 max-w-md"
            :class="levelUpInfo.level >= 8 ? 'border-yellow-400 shadow-yellow-400/50' : levelUpInfo.level >= 5 ? 'border-purple-400 shadow-purple-400/50' : 'border-orange-400 shadow-orange-400/50'"
          >
            <!-- 标题 -->
            <h2 class="text-3xl font-bold mb-2"
              :class="levelUpInfo.level >= 8 ? 'text-gradient bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent' : 'text-gradient'"
            >
              {{ levelUpInfo.level >= 8 ? '恭喜毕业！' : '升级啦！' }}
            </h2>
            
            <!-- 宠物进化动画区域 -->
            <div class="relative w-48 h-48 mx-auto my-6">
              <!-- 进化光环 - 改为圆角矩形与图片风格一致 -->
              <div class="absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 opacity-50 animate-spin" style="animation-duration: 3s"></div>
              <div class="absolute inset-2 rounded-3xl bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 opacity-40 animate-spin" style="animation-duration: 2s; animation-direction: reverse"></div>
              
              <!-- 宠物图片容器 - 圆角矩形与宠物图片风格一致 -->
              <div class="absolute inset-4 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100 shadow-inner">
                <!-- 升级前图片 - 初始显示，过渡阶段淡出 -->
                <img 
                  :src="getPetLevelImage(levelUpInfo.petType, levelUpInfo.prevLevel)" 
                  class="absolute inset-0 w-full h-full object-contain p-2 transition-all duration-1000"
                  :class="levelUpPhase === 'show-prev' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
                />
                <!-- 升级后图片 - 过渡阶段淡入，最终显示 -->
                <img 
                  :src="getPetLevelImage(levelUpInfo.petType, levelUpInfo.level)" 
                  class="absolute inset-0 w-full h-full object-contain p-2 transition-all duration-1000"
                  :class="levelUpPhase === 'show-current' ? 'opacity-100 scale-100' : 'opacity-0 scale-150'"
                />
              </div>
              
              <!-- 等级变化指示 -->
              <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-full px-4 py-1 shadow-lg">
                <span class="text-sm text-gray-400">Lv.{{ levelUpInfo.prevLevel }}</span>
                <span class="text-lg">➜</span>
                <span class="text-xl font-bold"
                  :class="levelUpInfo.level >= 8 ? 'text-yellow-500' : levelUpInfo.level >= 5 ? 'text-purple-500' : 'text-orange-500'"
                >
                  Lv.{{ levelUpInfo.level }}
                </span>
              </div>
            </div>
            
            <!-- 信息 -->
            <p class="text-lg text-gray-600 mb-1">
              <span class="font-bold text-purple-500">{{ levelUpInfo.name }}</span> 的宠物
            </p>
            
            <!-- 等级称号 -->
            <div class="text-base">
              <span v-if="levelUpInfo.level >= 10" class="text-yellow-500 font-bold">🏆 传说级宠物</span>
              <span v-else-if="levelUpInfo.level >= 8" class="text-pink-500 font-bold">🌟 史诗级宠物</span>
              <span v-else-if="levelUpInfo.level >= 5" class="text-purple-500 font-bold">⭐ 稀有宠物</span>
              <span v-else-if="levelUpInfo.level >= 3" class="text-blue-500 font-bold">💎 优秀宠物</span>
              <span v-else class="text-green-500 font-bold">🌱 成长中</span>
            </div>
          </div>
          
          <!-- 装饰星星 -->
          <div class="absolute -top-4 -left-4 text-4xl animate-pulse">✨</div>
          <div class="absolute -top-4 -right-4 text-4xl animate-pulse" style="animation-delay: 0.2s">✨</div>
          <div class="absolute -bottom-4 -left-4 text-4xl animate-pulse" style="animation-delay: 0.4s">✨</div>
          <div class="absolute -bottom-4 -right-4 text-4xl animate-pulse" style="animation-delay: 0.6s">✨</div>
        </div>
      </div>
    </Transition>

    <!-- 顶部导航栏 -->
    <header class="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 shadow-lg px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <!-- Left -->
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-white drop-shadow-lg flex items-center gap-2">
          <span class="text-2xl animate-bounce-slow">🐕</span>
          <span class="text-gradient">班级宠物园</span>
        </h1>
        <select 
          v-if="classes.length > 0"
          class="border-0 rounded-xl px-4 py-2 text-sm bg-white/95 hover:bg-white shadow-md backdrop-blur cursor-pointer font-medium"
          :value="currentClass?.id"
          @change="selectClass(classes.find(c => c.id === ($event.target as HTMLSelectElement).value)!)"
        >
          <option v-for="cls in classes" :key="cls.id" :value="cls.id">
            {{ cls.name }}
          </option>
        </select>
        <span class="text-sm text-white/90 font-medium bg-white/20 px-3 py-1 rounded-full">
          {{ students.length }} 人
        </span>
      </div>
      
      <!-- Right -->
      <div class="flex items-center gap-1.5">
        <!-- Search -->
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="🔍 搜索..."
          class="border-0 rounded-lg px-3 py-1.5 text-sm w-28 bg-white/95 hover:bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
        />
        
        <!-- Pet Menu -->
        <div class="relative" v-if="!batchMode">
          <button @click="showPetMenu = !showPetMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/95 hover:bg-white shadow-md transition-all font-medium">
            🐕 宠物 ▾
          </button>
          <div v-if="showPetMenu" @click="showPetMenu = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showPetMenu" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-40 z-50 overflow-hidden">
              <router-link to="/preview" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors flex items-center gap-2">
                📖 图鉴
              </router-link>
            </div>
          </Transition>
        </div>
        
        <!-- Sort Menu -->
        <div class="relative" v-if="!batchMode">
          <button @click="toggleSortMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/95 hover:bg-white shadow-md transition-all font-medium">
            📊 排序 ▾
          </button>
          <div v-if="showSortMenu" @click="showSortMenu = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showSortMenu" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-40 z-50 overflow-hidden">
              <button @click="setSort('name', 'asc')" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors" :class="sortBy === 'name' && sortOrder === 'asc' ? 'bg-gradient-to-r from-orange-50 to-pink-50 text-orange-600 font-medium' : ''">🔤 A-Z</button>
              <button @click="setSort('name', 'desc')" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors" :class="sortBy === 'name' && sortOrder === 'desc' ? 'bg-gradient-to-r from-orange-50 to-pink-50 text-orange-600 font-medium' : ''">🔤 Z-A</button>
              <button @click="setSort('studentNo', 'asc')" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors" :class="sortBy === 'studentNo' ? 'bg-gradient-to-r from-orange-50 to-pink-50 text-orange-600 font-medium' : ''">🔢 学号</button>
              <button @click="setSort('progress', 'desc')" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors" :class="sortBy === 'progress' ? 'bg-gradient-to-r from-orange-50 to-pink-50 text-orange-600 font-medium' : ''">⭐ 进度</button>
            </div>
          </Transition>
        </div>
        
        <!-- Class Menu -->
        <div class="relative" v-if="!batchMode">
          <button @click="showClassMenu = !showClassMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/95 hover:bg-white shadow-md transition-all font-medium">
            📚 班级 ▾
          </button>
          <div v-if="showClassMenu" @click="showClassMenu = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showClassMenu" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-40 z-50 overflow-hidden">
              <button @click="openCreateClassModal" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">➕ 新建</button>
              <button v-if="currentClass" @click="openEditClassModal" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">✏️ 重命名</button>
              <button v-if="currentClass" @click="deleteClass(currentClass.id)" class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">🗑️ 删除</button>
              <hr class="my-1.5 border-gray-100">
              <button @click="exportBackup" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">💾 导出</button>
              <label class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors cursor-pointer block">
                📥 导入
                <input type="file" accept=".json" @change="importBackup" class="hidden" />
              </label>
            </div>
          </Transition>
        </div>
        
        <!-- Student Menu -->
        <div class="relative" v-if="currentClass && !batchMode">
          <button @click="showStudentMenu = !showStudentMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/95 hover:bg-white shadow-md transition-all font-medium">
            👤 学生 ▾
          </button>
          <div v-if="showStudentMenu" @click="showStudentMenu = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showStudentMenu" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-40 z-50 overflow-hidden">
              <button @click="showStudentModal = true" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">➕ 添加</button>
              <button @click="openImportModal" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">📥 导入</button>
              <button @click="showDeleteStudentMode = true; deleteStudentList = []" class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">🗑️ 删除</button>
            </div>
          </Transition>
        </div>
        
        <!-- Eval Menu -->
        <div class="relative" v-if="!batchMode">
          <button @click="showEvalMenu = !showEvalMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/95 hover:bg-white shadow-md transition-all font-medium">
            ⭐ 评价 ▾
          </button>
          <div v-if="showEvalMenu" @click="showEvalMenu = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showEvalMenu" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-40 z-50 overflow-hidden">
              <button @click="startBatchMode" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">✅ 批量</button>
              <button @click="showRankModal = true" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">🏆 排行</button>
              <button @click="loadEvaluationRecords(); showRecordsModal = true" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">📋 记录</button>
              <hr class="my-1.5 border-gray-100">
              <button @click="showRulesModal = true" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">⚙️ 规则</button>
            </div>
          </Transition>
        </div>
        
        <!-- Batch Mode Actions -->
        <template v-if="batchMode">
          <span class="text-sm text-white font-bold bg-white/20 px-3 py-1.5 rounded-lg">
            {{ selectedStudents.size }}
          </span>
          <button @click="selectAllStudents" class="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 shadow-md transition-all font-medium">
            全选
          </button>
          <button @click="cancelBatchMode" class="px-3 py-1.5 rounded-lg text-sm bg-gray-500 text-white hover:bg-gray-600 shadow-md transition-all font-medium">
            取消
          </button>
        </template>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-6">
      <Transition name="fade" mode="out-in">
        <!-- 无班级状态 -->
        <div v-if="classes.length === 0" key="no-class" class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="text-8xl mb-6 animate-float">🏫</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-3">还没有班级</h3>
          <p class="text-gray-500 mb-6 text-lg">创建一个班级，开启你的宠物园之旅吧！</p>
          <button 
            @click="showClassModal = true"
            class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold text-lg"
          >
            ✨ 创建第一个班级
          </button>
        </div>

        <!-- 无学生状态 -->
        <div v-else-if="students.length === 0" key="no-student" class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="text-8xl mb-6 animate-float">👨‍🎓</div>
          <h3 class="text-2xl font-bold text-gray-700 mb-3">还没有学生</h3>
          <p class="text-gray-500 mb-6 text-lg">添加学生，让他们领养可爱的宠物吧！</p>
          <div class="flex gap-3">
            <button 
              @click="showStudentModal = true"
              class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold"
            >
              ➕ 添加学生
            </button>
            <button 
              @click="openImportModal"
              class="bg-white text-gray-700 px-6 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all font-bold border border-gray-200"
            >
              📥 批量导入
            </button>
          </div>
        </div>

        <!-- 学生列表 -->
        <div v-else key="students" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          <TransitionGroup name="card">
            <div 
              v-for="(student, index) in filteredStudents" 
              :key="student.id"
              class="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300 cursor-pointer relative group card-hover"
              :class="[getLevelBorderClass(getDisplayLevel(student)), { 
                'ring-2 ring-purple-400 ring-offset-2': batchMode && selectedStudents.has(student.id),
                'ring-2 ring-red-400 ring-offset-2': showDeleteStudentMode && deleteStudentList.includes(student.id)
              }]"
              :style="{ animationDelay: `${index * 50}ms` }"
              @click="
                batchMode ? toggleStudentSelect(student.id) : 
                showDeleteStudentMode ? toggleDeleteStudent(student.id) : 
                openDetailPanel(student)
              "
            >
              <!-- 评分动效 -->
              <Transition name="score-pop">
                <div 
                  v-if="scoreAnimations.has(student.id)"
                  class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                >
                  <div 
                    class="text-4xl font-bold animate-bounce-in"
                    :class="scoreAnimations.get(student.id)!.points > 0 ? 'text-green-500' : 'text-red-500'"
                  >
                    {{ scoreAnimations.get(student.id)!.points > 0 ? '+' : '' }}{{ scoreAnimations.get(student.id)!.points }}
                  </div>
                  <div class="absolute inset-0 overflow-hidden">
                    <span v-for="i in 6" :key="i" class="absolute text-2xl animate-sparkle" :style="{ left: `${Math.random() * 80 + 10}%`, top: `${Math.random() * 80 + 10}%`, animationDelay: `${i * 100}ms` }">
                      {{ scoreAnimations.get(student.id)!.points > 0 ? '⭐' : '💫' }}
                    </span>
                  </div>
                </div>
              </Transition>
              
              <!-- 选中标记 -->
              <Transition name="pop">
                <div 
                  v-if="batchMode || showDeleteStudentMode"
                  class="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-md transition-all"
                  :class="batchMode 
                    ? (selectedStudents.has(student.id) ? 'bg-gradient-to-r from-purple-400 to-pink-400' : 'bg-white border-2 border-gray-300')
                    : (deleteStudentList.includes(student.id) ? 'bg-gradient-to-r from-red-400 to-pink-400' : 'bg-white border-2 border-gray-300')
                  "
                >
                  <span v-if="(batchMode && selectedStudents.has(student.id)) || (showDeleteStudentMode && deleteStudentList.includes(student.id))" class="text-white text-sm font-bold">✓</span>
                </div>
              </Transition>
              
              <!-- 宠物图片区域 -->
              <div class="aspect-square flex items-center justify-center overflow-hidden relative"
                :class="student.pet_type ? 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100' : 'bg-gradient-to-br from-gray-100 via-slate-50 to-gray-100'"
              >
                <!-- 有宠物时使用 PetImage 组件 -->
                <template v-if="student.pet_type">
                  <PetImage
                    :src="getStudentPetImage(student)"
                    :alt="getPetType(student.pet_type)?.name"
                    size="full"
                    :rounded="false"
                    :show-loading="true"
                    class="w-full h-full"
                  />
                </template>
                <!-- 未领养宠物 -->
                <div v-else class="flex flex-col items-center">
                  <span class="text-6xl pet-unknown">❓</span>
                  <span class="text-xs text-gray-400 mt-2 group-hover:text-orange-400 transition-colors">点击领养</span>
                </div>
                
                <!-- 等级徽章 -->
                <div 
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
                    :class="student.pet_type ? 'bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600' : 'bg-gray-100 text-gray-400'">
                    {{ student.pet_type ? getPetType(student.pet_type)?.name : '未领养' }}
                  </span>
                </div>
                
                <!-- 成长值 + 积分 -->
                <div class="flex items-center justify-between text-sm mb-3">
                  <span class="text-gray-500 flex items-center gap-1">
                    <span class="text-purple-400">💜</span>
                    <span class="font-medium text-purple-600">{{ getLevelProgress(student.pet_exp).current }}</span>
                    <span class="text-gray-300">/</span>
                    <span>{{ getLevelProgress(student.pet_exp).required }}</span>
                  </span>
                  <span class="font-bold text-lg flex items-center gap-1">
                    <span class="text-yellow-400">⭐</span>
                    <span class="text-orange-500">{{ student.total_points }}</span>
                  </span>
                </div>
                
                <!-- 进度条 -->
                <div class="bg-gray-100 rounded-full h-2.5 overflow-hidden progress-glow">
                  <div 
                    class="rounded-full h-2.5 transition-all duration-500"
                    :class="getDisplayLevel(student) >= 5 ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400' : 'bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400'"
                    :style="{ width: `${getLevelProgress(student.pet_exp).percentage}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </Transition>
      
      <!-- 批量操作栏 -->
      <Transition name="slide-up">
        <div v-if="batchMode && selectedStudents.size > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 flex gap-4 z-40 border border-gray-100">
          <button 
            @click="batchAddPoints"
            class="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <span class="text-xl">⬆️</span> 统一加分
          </button>
          <button 
            @click="batchSubPoints"
            class="bg-gradient-to-r from-red-400 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <span class="text-xl">⬇️</span> 统一扣分
          </button>
        </div>
      </Transition>
      
      <!-- 删除学生操作栏 -->
      <Transition name="slide-up">
        <div v-if="showDeleteStudentMode" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 flex gap-4 z-40 border border-gray-100">
          <span class="text-gray-600 py-3 font-medium">已选 <span class="text-red-500 font-bold">{{ deleteStudentList.length }}</span> 人</span>
          <button 
            @click="batchDeleteStudents"
            :disabled="deleteStudentList.length === 0"
            class="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            <span class="text-xl">🗑️</span> 确认删除
          </button>
          <button 
            @click="cancelDeleteMode"
            class="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            取消
          </button>
        </div>
      </Transition>
    </main>

    <!-- 创建/编辑班级模态框 -->
    <Transition name="modal">
      <div v-if="showClassModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span class="text-2xl">🏫</span> {{ editingClass ? '编辑班级' : '创建班级' }}
          </h3>
          <input 
            v-model="newClassName"
            type="text" 
            placeholder="输入班级名称..."
            class="w-full border-2 border-gray-200 rounded-xl px-5 py-3 mb-6 text-lg focus:outline-none focus:border-orange-400 transition-colors"
            @keyup.enter="editingClass ? updateClass() : createClass()"
          />
          <div class="flex gap-3 justify-end">
            <button @click="showClassModal = false; editingClass = null; newClassName = ''" class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors">取消</button>
            <button @click="editingClass ? updateClass() : createClass()" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
              {{ editingClass ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 添加学生模态框 -->
    <Transition name="modal">
      <div v-if="showStudentModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scale-in">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span class="text-2xl">👨‍🎓</span> 添加学生
          </h3>
          <input 
            v-model="newStudentName"
            type="text" 
            placeholder="学生姓名"
            class="w-full border-2 border-gray-200 rounded-xl px-5 py-3 mb-4 text-lg focus:outline-none focus:border-orange-400 transition-colors"
          />
          <input 
            v-model="newStudentNo"
            type="text" 
            placeholder="学号（可选）"
            class="w-full border-2 border-gray-200 rounded-xl px-5 py-3 mb-6 focus:outline-none focus:border-orange-400 transition-colors"
          />
          <div class="flex gap-3 justify-end">
            <button @click="showStudentModal = false" class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors">取消</button>
            <button @click="addStudent" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
              添加
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 批量导入模态框 -->
    <Transition name="modal">
      <div v-if="showImportModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl animate-scale-in">
          <h3 class="text-xl font-bold mb-2 flex items-center gap-2">
            <span class="text-2xl">📥</span> 批量导入学生
          </h3>
          <p class="text-sm text-gray-500 mb-4">
            一行一个学生，姓名和学号用空格、逗号、Tab或分号分隔
          </p>
          <textarea 
            v-model="importText"
            placeholder="张三 20240001&#10;李四, 20240002&#10;王五；20240003"
            class="w-full border-2 border-gray-200 rounded-xl px-5 py-4 mb-4 h-48 text-sm font-mono focus:outline-none focus:border-orange-400 transition-colors"
          ></textarea>
          <div class="bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
            <p class="font-medium mb-2 flex items-center gap-2"><span>💡</span> 示例格式：</p>
            <code class="text-xs bg-white px-3 py-2 rounded-lg block text-gray-500">
              张三 20240001<br>
              李四,20240002<br>
              王五；20240003
            </code>
          </div>
          <div class="flex gap-3 justify-end">
            <button @click="showImportModal = false" class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors">取消</button>
            <button @click="importStudents" class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
              导入
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 评价模态框 -->
    <Transition name="modal">
      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-3xl max-h-[85vh] overflow-auto shadow-2xl animate-scale-in">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span class="text-2xl">⭐</span>
            <template v-if="selectedStudent">
              为 <span class="text-gradient">{{ selectedStudent?.name }}</span> 评价
            </template>
            <template v-else>
              批量评价 <span class="text-purple-500">{{ selectedStudents.size }}</span> 名学生
            </template>
          </h3>
          
          <!-- 分类标签 -->
          <div class="flex gap-2 mb-6 flex-wrap">
            <button 
              v-for="cat in categories" 
              :key="cat"
              @click="selectedEvalTab = cat"
              class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              :class="selectedEvalTab === cat 
                ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              {{ cat }}
            </button>
          </div>
          
          <!-- 规则网格 - 固定5行高度，超出显示滚动条 -->
          <div class="h-[540px] overflow-y-auto pr-2 custom-scrollbar">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 content-start">
              <button 
                v-for="rule in currentCategoryRules" 
                :key="rule.id"
                @click="quickAdd(selectedStudent, rule); showAddModal = false"
                class="rounded-2xl p-4 text-left transition-all border-2 hover:scale-105 hover:shadow-lg active:scale-95 h-[100px]"
                :class="rule.points > 0 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400' 
                  : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:border-red-400'"
              >
                <div class="flex items-center justify-between mb-2">
                  <span 
                    class="font-bold text-2xl"
                    :class="rule.points > 0 ? 'text-green-500' : 'text-red-500'"
                  >
                    {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
                  </span>
                  <span 
                    class="text-xs px-2 py-1 rounded-full font-medium"
                    :class="rule.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
                  >
                    {{ rule.points > 0 ? '加分' : '扣分' }}
                  </span>
                </div>
                <div class="text-sm text-gray-700 font-medium">{{ rule.name }}</div>
              </button>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button @click="showAddModal = false" class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors">取消</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 选择宠物模态框 -->
    <Transition name="modal">
      <div v-if="showPetModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl animate-scale-in">
          <h3 class="text-2xl font-bold mb-6 flex items-center gap-3">
            <span class="text-3xl">🐾</span>
            <span>为 <span class="text-gradient bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">{{ selectedStudent?.name }}</span> 选择宠物伙伴</span>
          </h3>
          
          <!-- 宠物网格 - 所有宠物混合显示 -->
          <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <button 
              v-for="pet in PET_TYPES" 
              :key="pet.id"
              @click="selectPet(pet.id)"
              class="relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-3 hover:shadow-xl hover:scale-105 transition-all text-center group border-2 border-transparent hover:border-orange-300 hover:from-orange-50 hover:to-pink-50 overflow-hidden"
            >
              <!-- 装饰性边框 -->
              <div class="absolute inset-0 rounded-2xl border-2 border-dashed border-gray-200 group-hover:border-orange-200 transition-colors"></div>
              
              <!-- 图片容器 -->
              <div class="relative w-full aspect-square mx-auto mb-2">
                <!-- 加载动画 - 图片加载完成前显示 -->
                <div 
                  v-if="!imageLoaded[pet.id]" 
                  class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-100/80 to-pink-100/80 rounded-xl"
                >
                  <div class="flex gap-1.5">
                    <span class="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                    <span class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                    <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                  </div>
                </div>
                <!-- 宠物图片 - 加载完成后淡入显示 -->
                <img 
                  :src="getPetLevel1Image(pet.id)" 
                  class="w-full h-full object-contain group-hover:scale-110 transition-all duration-300 rounded-xl p-1"
                  :class="imageLoaded[pet.id] ? 'opacity-100' : 'opacity-0'"
                  @load="imageLoaded[pet.id] = true"
                />
              </div>
              
              <!-- 宠物名称 - 放大 -->
              <div class="text-base font-bold mt-2 text-gray-800 group-hover:text-orange-600 transition-colors leading-tight">{{ pet.name }}</div>
            </button>
          </div>

          <div class="mt-6 p-4 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 rounded-xl text-sm text-gray-600 text-center border border-orange-100">
            <span class="text-lg">💡</span> 点击宠物即可领养，宠物会陪伴学生一起成长！
          </div>

          <div class="flex justify-end mt-6">
            <button @click="showPetModal = false" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors">取消</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 排行榜模态框 -->
    <Transition name="modal">
      <div v-if="showRankModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-lg max-h-[85vh] overflow-auto shadow-2xl animate-scale-in">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span class="text-2xl">🏆</span> 积分排行榜
          </h3>
          
          <div v-if="ranking.length === 0" class="text-center py-12 text-gray-500">
            暂无数据
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="(student, index) in ranking" 
              :key="student.id"
              class="flex items-center gap-4 p-4 rounded-2xl transition-all"
              :class="index < 3 ? 'bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50 shadow-md' : 'bg-gray-50'"
            >
              <!-- 排名 -->
              <div class="w-10 h-10 flex items-center justify-center font-bold text-2xl">
                <span v-if="index === 0" class="text-3xl animate-bounce-slow">🥇</span>
                <span v-else-if="index === 1" class="text-3xl">🥈</span>
                <span v-else-if="index === 2" class="text-3xl">🥉</span>
                <span v-else class="text-gray-400">{{ index + 1 }}</span>
              </div>
              
              <!-- 宠物头像 -->
              <div class="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100 shadow-inner">
                <img 
                  v-if="student.pet_type" 
                  :src="getStudentPetImage(student)" 
                  class="w-10 h-10 object-contain"
                />
                <span v-else class="text-2xl">❓</span>
              </div>
              
              <!-- 信息 -->
              <div class="flex-1">
                <div class="font-bold text-gray-800">{{ student.name }}</div>
                <div class="text-xs text-gray-500">Lv.{{ getDisplayLevel(student) }}</div>
              </div>
              
              <!-- 积分 -->
              <div class="text-right">
                <div class="font-bold text-xl text-orange-500">+{{ student.total_points }}</div>
                <div class="text-xs text-gray-400">积分</div>
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button @click="showRankModal = false" class="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">关闭</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 评价记录模态框 -->
    <Transition name="modal">
      <div v-if="showRecordsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-4xl max-h-[85vh] overflow-auto shadow-2xl animate-scale-in">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold flex items-center gap-2">
              <span class="text-2xl">📋</span> 评价记录
            </h3>
            <button 
              @click="undoLastEvaluation(); loadEvaluationRecords()"
              class="px-4 py-2 text-sm text-orange-500 hover:bg-orange-50 rounded-xl font-medium transition-colors flex items-center gap-1"
            >
              ↩️ 撤回最新
            </button>
          </div>
          
          <div v-if="evaluationRecords.length === 0" class="text-center py-16 text-gray-500">
            <div class="text-5xl mb-4">📝</div>
            暂无记录
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="record in paginatedRecords" 
              :key="record.id"
              class="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <!-- 头部 -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center text-sm font-bold">
                    {{ record.student_name.charAt(0) }}
                  </span>
                  <span class="font-bold text-gray-800">{{ record.student_name }}</span>
                </div>
                <span 
                  class="px-3 py-1 rounded-full text-sm font-bold"
                  :class="record.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
                >
                  {{ record.points > 0 ? '+' : '' }}{{ record.points }}
                </span>
              </div>
              
              <!-- 原因 -->
              <div class="text-sm text-gray-600 mb-3 line-clamp-2">
                {{ record.reason }}
              </div>
              
              <!-- 底部 -->
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span class="px-2 py-1 bg-gray-100 rounded-lg">{{ record.category }}</span>
                <div class="flex items-center gap-2">
                  <span>{{ new Date(record.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                  <button 
                    @click="undoLastEvaluation(record.id)"
                    class="text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-2 py-1 rounded transition-colors"
                    title="撤回"
                  >
                    ↩️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="totalPages > 1" class="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <div class="text-sm text-gray-500">
              共 <span class="font-medium">{{ totalRecords }}</span> 条记录
            </div>
            <div class="flex gap-2">
              <button 
                @click="prevPage"
                :disabled="recordsPage <= 1"
                class="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                ← 上一页
              </button>
              <div class="flex gap-1">
                <button 
                  v-for="page in Math.min(totalPages, 5)" 
                  :key="page"
                  @click="goToPage(page)"
                  class="px-4 py-2 rounded-xl text-sm min-w-[40px] font-medium transition-all"
                  :class="recordsPage === page ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg' : 'border border-gray-200 hover:bg-gray-50'"
                >
                  {{ page }}
                </button>
              </div>
              <button 
                @click="nextPage"
                :disabled="recordsPage >= totalPages"
                class="px-4 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                下一页 →
              </button>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button @click="showRecordsModal = false" class="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">关闭</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 管理规则模态框 -->
    <Transition name="modal">
      <div v-if="showRulesModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-8 w-full max-w-4xl max-h-[85vh] overflow-auto shadow-2xl animate-scale-in">
          <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
            <span class="text-2xl">⚙️</span> 管理评价规则
          </h3>
          
          <!-- 添加规则表单 -->
          <div class="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-6 mb-6">
            <h4 class="font-bold mb-4 flex items-center gap-2">
              <span>➕</span> 添加自定义规则
            </h4>
            <div class="flex flex-wrap gap-3 mb-4">
              <input 
                v-model="newRuleName"
                type="text" 
                placeholder="规则名称"
                class="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400 transition-colors"
              />
              <select v-model="newRuleCategory" class="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400 transition-colors cursor-pointer">
                <option>学习</option>
                <option>行为</option>
                <option>健康</option>
                <option>其他</option>
              </select>
              <input 
                v-model.number="newRulePoints"
                type="number" 
                placeholder="分值"
                class="w-24 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <button 
              @click="addRule"
              class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              添加规则
            </button>
          </div>
          
          <!-- 规则列表 -->
          <div class="space-y-6">
            <template v-for="cat in categories" :key="cat">
              <div v-if="rules.filter(r => r.category === cat).length > 0">
                <h4 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>{{ cat === '学习' ? '📚' : cat === '行为' ? '🎯' : cat === '健康' ? '💪' : '📌' }}</span>
                  {{ cat }}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div 
                    v-for="rule in rules.filter(r => r.category === cat)" 
                    :key="rule.id"
                    class="flex items-center justify-between p-4 rounded-xl border-2"
                    :class="rule.points > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
                  >
                    <div class="flex items-center gap-2">
                      <span 
                        class="font-bold text-lg"
                        :class="rule.points > 0 ? 'text-green-500' : 'text-red-500'"
                      >
                        {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
                      </span>
                      <span class="text-sm font-medium">{{ rule.name }}</span>
                    </div>
                    <button 
                      v-if="rule.is_custom"
                      @click="deleteRule(rule.id)"
                      class="text-red-400 hover:text-red-600 text-sm font-medium transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="flex justify-end mt-6">
            <button @click="showRulesModal = false" class="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">关闭</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 学生详情面板 -->
    <Transition name="modal">
      <div v-if="showDetailPanel && detailStudent" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeDetailPanel">
        <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl animate-scale-in">
          <!-- 头部 -->
          <div class="relative bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 p-6 rounded-t-3xl">
            <!-- 顶部操作按钮 -->
            <div class="absolute top-4 right-4 flex gap-2">
              <button @click="showDetailPanel = false; openPetSelect(detailStudent!)" class="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-sm transition-colors" title="换宠物">
                🔄
              </button>
              <button @click="closeDetailPanel" class="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors" title="关闭">
                ×
              </button>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-20 h-20 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <img 
                  v-if="detailStudent.pet_type" 
                  :src="getStudentPetImage(detailStudent)" 
                  class="w-16 h-16 object-contain"
                />
                <span v-else class="text-4xl">❓</span>
              </div>
              <div class="text-white">
                <h3 class="text-2xl font-bold">{{ detailStudent.name }}</h3>
                <p class="text-white/80 text-sm">
                  {{ detailStudent.pet_type ? getPetType(detailStudent.pet_type)?.name : '未领养' }}
                  · Lv.{{ getDisplayLevel(detailStudent) }}
                  · ⭐ {{ detailStudent.total_points }}
                </p>
              </div>
            </div>
            <!-- 进度条 -->
            <div class="mt-4">
              <div class="flex justify-between text-white/90 text-sm mb-1">
                <span>成长值</span>
                <span>{{ getLevelProgress(detailStudent.pet_exp).current }}/{{ getLevelProgress(detailStudent.pet_exp).required }}</span>
              </div>
              <div class="bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300"
                  :style="{ width: `${getLevelProgress(detailStudent.pet_exp).percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- 快速评分 -->
          <div class="p-6 border-b border-gray-100">
            <h4 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>⚡</span> 快速评价
            </h4>
            <!-- 分类标签 -->
            <div class="flex gap-2 mb-4 flex-wrap">
              <button 
                v-for="cat in categories" 
                :key="cat"
                @click="detailEvalTab = cat"
                class="px-4 py-1.5 rounded-xl text-sm font-bold transition-all"
                :class="detailEvalTab === cat 
                  ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              >
                {{ cat }}
              </button>
            </div>
            <!-- 规则按钮 - 每行5个，固定5行高度 -->
            <div class="h-[345px] overflow-y-auto pr-1 custom-scrollbar">
              <div class="grid grid-cols-5 gap-2 content-start">
                <button 
                  v-for="rule in rules.filter(r => r.category === detailEvalTab)" 
                  :key="rule.id"
                  @click="detailQuickAdd(rule)"
                  class="rounded-xl p-2 text-center transition-all border-2 hover:scale-105 active:scale-95 h-[65px]"
                  :class="rule.points > 0 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400' 
                    : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:border-red-400'"
                >
                  <div 
                    class="text-base font-bold"
                    :class="rule.points > 0 ? 'text-green-500' : 'text-red-500'"
                  >
                    {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
                  </div>
                  <div class="text-xs text-gray-600 truncate">{{ rule.name }}</div>
                </button>
              </div>
            </div>
          </div>
          
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
                    {{ new Date(record.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.card-enter-active,
.card-leave-active {
  transition: all 0.5s ease;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 100%);
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.2s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* 评分动效 */
.score-pop-enter-active {
  animation: scorePopIn 0.5s ease-out;
}

.score-pop-leave-active {
  transition: all 0.3s ease;
}

.score-pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

@keyframes scorePopIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes sparkle {
  0% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.5) rotate(180deg);
  }
  100% {
    opacity: 0;
    transform: scale(0) rotate(360deg);
  }
}

.animate-sparkle {
  animation: sparkle 0.8s ease-out forwards;
}

.animate-bounce-in {
  animation: bounceIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounceIn 0.5s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #fb923c, #f472b6);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, #f97316, #ec4899);
}
</style>