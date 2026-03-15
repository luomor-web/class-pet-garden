<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { PET_TYPES, getPetType, calculateLevel, getLevelProgress } from '@/data/pets'

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
}

// State
const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const students = ref<Student[]>([])
const rules = ref<Rule[]>([])
const searchQuery = ref('')
const sortAsc = ref(true)

// Modals
const showClassModal = ref(false)
const showStudentModal = ref(false)
const showImportModal = ref(false)
const showAddModal = ref(false)
const showRankModal = ref(false)
const showPetModal = ref(false)
const showRecordsModal = ref(false)
const newClassName = ref('')
const newStudentName = ref('')
const newStudentNo = ref('')
const importText = ref('')
const selectedStudent = ref<Student | null>(null)
const selectedPetCategory = ref<'normal' | 'mythical'>('normal')
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

// Computed
const filteredStudents = computed(() => {
  let result = [...students.value]
  if (searchQuery.value) {
    result = result.filter(s => s.name.includes(searchQuery.value))
  }
  result.sort((a, b) => sortAsc.value ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
  return result
})

const addRules = computed(() => rules.value.filter(r => r.points > 0))
const subRules = computed(() => rules.value.filter(r => r.points < 0))

const categories = ['学习', '行为', '健康', '其他']

const currentCategoryRules = computed(() => {
  return rules.value.filter(r => r.category === selectedEvalTab.value)
})

const filteredPets = computed(() => {
  return PET_TYPES.filter(p => p.category === selectedPetCategory.value)
})

const ranking = computed(() => {
  return [...students.value].sort((a, b) => b.total_points - a.total_points)
})

// API calls
async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
    if (classes.value.length > 0) {
      // 尝试从localStorage恢复上次选择的班级
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
  // 保存到localStorage
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
  
  // Parse text: one student per line, name and studentNo separated by any delimiter
  const lines = importText.value.trim().split('\n')
  const students = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // Try to split by common delimiters: tab, comma, space, semicolon
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

async function deleteStudent(id: string) {
  if (!confirm('确定删除该学生？')) return
  await api.delete(`/students/${id}`)
  await loadStudents()
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
  } catch (error) {
    console.error('领养宠物失败:', error)
    alert('领养失败，请重试')
  }
}

function openAddModal(student: Student) {
  // 如果没有宠物，先提示领养
  if (!student.pet_type) {
    if (confirm(`${student.name} 还没有领养宠物，是否现在领养？`)) {
      selectedStudent.value = student
      showPetModal.value = true
    }
    return
  }
  selectedStudent.value = student
  selectedEvalTab.value = '学习'
  showAddModal.value = true
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
  selectedStudent.value = null // 标记为批量模式
  selectedEvalTab.value = '学习'
  showAddModal.value = true
}

async function batchSubPoints() {
  if (selectedStudents.value.size === 0) return
  selectedStudent.value = null // 标记为批量模式
  selectedEvalTab.value = '行为' // 扣分通常在行为分类
  showAddModal.value = true
}

async function quickAdd(student: Student | null, rule: Rule) {
  // 批量模式
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
  
  // 单个学生模式
  try {
    const res = await api.post('/evaluations', {
      classId: currentClass.value?.id,
      studentId: student.id,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })
    
    if (res.data.levelUp) {
      const pet = getPetType(student.pet_type || '')
      alert(`🎉 ${student.name} 的${pet?.name || '宠物'}升级到了 Lv.${res.data.petLevel}！`)
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

async function undoLastEvaluation() {
  if (!currentClass.value) return
  if (!confirm('确定要撤回最近一次评价吗？')) return
  
  try {
    const res = await api.delete(`/evaluations/latest?classId=${currentClass.value.id}`)
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
  const pet = getPetType(student.pet_type)
  return pet?.image || ''
}

// Initialize
onMounted(() => {
  loadClasses()
  loadRules()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <!-- Top Navigation - 单行 -->
    <header class="bg-gradient-to-r from-orange-400 to-orange-500 shadow-md px-4 py-2.5 flex items-center justify-between">
      <!-- Left -->
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-white drop-shadow">🐾 班级宠物园</h1>
        <select 
          v-if="classes.length > 0"
          class="border-0 rounded-lg px-3 py-1.5 text-sm bg-white/90 hover:bg-white shadow"
          :value="currentClass?.id"
          @change="selectClass(classes.find(c => c.id === ($event.target as HTMLSelectElement).value)!)"
        >
          <option v-for="cls in classes" :key="cls.id" :value="cls.id">
            {{ cls.name }}
          </option>
        </select>
        <span class="text-sm text-white/90">{{ students.length }} 人</span>
      </div>
      
      <!-- Right -->
      <div class="flex items-center gap-2">
        <!-- Search -->
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="🔍 搜索"
          class="border-0 rounded-lg px-3 py-1.5 text-sm w-32 bg-white/90 hover:bg-white shadow focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        
        <!-- Class Menu -->
        <div class="relative" v-if="!batchMode">
          <button @click="showClassMenu = !showClassMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/90 hover:bg-white shadow">
            📚 班级 ▾
          </button>
          <div v-if="showClassMenu" @click="showClassMenu = false" class="fixed inset-0 z-40"></div>
          <div v-if="showClassMenu" class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 w-40 z-50">
            <button @click="showClassModal = true" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">➕ 新建班级</button>
            <button v-if="currentClass" @click="deleteClass(currentClass.id)" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">🗑️ 删除班级</button>
            <hr class="my-1">
            <button @click="exportBackup" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">💾 导出备份</button>
            <label class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 cursor-pointer block">
              📥 导入恢复
              <input type="file" accept=".json" @change="importBackup" class="hidden" />
            </label>
          </div>
        </div>
        
        <!-- Student Menu -->
        <div class="relative" v-if="currentClass && !batchMode">
          <button @click="showStudentMenu = !showStudentMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/90 hover:bg-white shadow">
            👨‍🎓 学生 ▾
          </button>
          <div v-if="showStudentMenu" @click="showStudentMenu = false" class="fixed inset-0 z-40"></div>
          <div v-if="showStudentMenu" class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 w-40 z-50">
            <button @click="showStudentModal = true" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">➕ 添加学生</button>
            <button @click="openImportModal" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">📥 批量导入</button>
            <button @click="showDeleteStudentMode = true; deleteStudentList = []" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">🗑️ 删除学生</button>
          </div>
        </div>
        
        <!-- Eval Menu -->
        <div class="relative" v-if="!batchMode">
          <button @click="showEvalMenu = !showEvalMenu" class="px-3 py-1.5 rounded-lg text-sm bg-white/90 hover:bg-white shadow">
            ⭐ 评价 ▾
          </button>
          <div v-if="showEvalMenu" @click="showEvalMenu = false" class="fixed inset-0 z-40"></div>
          <div v-if="showEvalMenu" class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 w-40 z-50">
            <button @click="startBatchMode" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">✅ 批量评价</button>
            <button @click="showRankModal = true" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">🏆 排行榜</button>
            <button @click="loadEvaluationRecords(); showRecordsModal = true" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">📋 评价记录</button>
            <button @click="undoLastEvaluation()" class="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50">↩️ 撤回评价</button>
            <hr class="my-1">
            <button @click="showRulesModal = true" class="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">⚙️ 管理规则</button>
          </div>
        </div>
        
        <!-- Batch Mode Actions -->
        <template v-if="batchMode">
          <span class="text-sm text-white font-medium">已选 {{ selectedStudents.size }} 人</span>
          <button @click="selectAllStudents" class="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 shadow">全选</button>
          <button @click="cancelBatchMode" class="px-3 py-1.5 rounded-lg text-sm bg-gray-500 text-white hover:bg-gray-600 shadow">取消</button>
        </template>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">

      <!-- Students List -->
      <div class="flex-1 p-6 overflow-auto">
        <div v-if="classes.length === 0" class="text-center py-20">
          <div class="text-6xl mb-4">🏫</div>
          <h3 class="text-xl font-bold text-gray-700 mb-2">还没有班级</h3>
          <p class="text-gray-500 mb-4">创建一个班级开始使用吧！</p>
          <button 
            @click="showClassModal = true"
            class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-500"
          >
            创建第一个班级
          </button>
        </div>

        <div v-else-if="students.length === 0" class="text-center py-20">
          <div class="text-6xl mb-4">👨‍🎓</div>
          <h3 class="text-xl font-bold text-gray-700 mb-2">还没有学生</h3>
          <p class="text-gray-500">点击右上角添加学生</p>
        </div>

        <div v-else class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <div 
            v-for="student in filteredStudents" 
            :key="student.id"
            class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer relative"
            :class="{ 
              'ring-2 ring-purple-500': batchMode && selectedStudents.has(student.id),
              'ring-2 ring-red-500': showDeleteStudentMode && deleteStudentList.includes(student.id)
            }"
            @click="
              batchMode ? toggleStudentSelect(student.id) : 
              showDeleteStudentMode ? toggleDeleteStudent(student.id) : 
              openAddModal(student)
            "
          >
            <!-- Checkbox for batch mode -->
            <div 
              v-if="batchMode"
              class="absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center z-10"
              :class="selectedStudents.has(student.id) ? 'bg-purple-500 border-purple-500' : 'bg-white border-gray-300'"
            >
              <span v-if="selectedStudents.has(student.id)" class="text-white text-sm">✓</span>
            </div>
            
            <!-- Checkbox for delete mode -->
            <div 
              v-if="showDeleteStudentMode"
              class="absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center z-10"
              :class="deleteStudentList.includes(student.id) ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'"
            >
              <span v-if="deleteStudentList.includes(student.id)" class="text-white text-sm">✓</span>
            </div>
            
            <!-- Pet Image Area -->
            <div class="aspect-square bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden relative">
              <img 
                v-if="student.pet_type" 
                :src="getStudentPetImage(student)" 
                class="w-full h-full object-cover"
              />
              <span v-else class="text-6xl">❓</span>
              
              <!-- Change Pet Button -->
              <button 
                @click.stop="openPetSelect(student)"
                class="absolute top-2 left-2 w-7 h-7 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-primary text-xs shadow"
                title="更换宠物"
              >
                🔄
              </button>
              
              <!-- Level Badge -->
              <div class="absolute bottom-2 right-2 bg-purple-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full shadow">
                Lv.{{ student.pet_level }}
              </div>
            </div>
            
            <!-- Info Area -->
            <div class="p-3">
              <!-- Student Name + Pet Name -->
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-base text-gray-800">{{ student.name }}</span>
                <span class="text-xs text-gray-500">{{ student.pet_type ? getPetType(student.pet_type)?.name : '未领养' }}</span>
              </div>
              
              <!-- Growth + Points -->
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="text-gray-600">
                  成长值 <span class="font-medium text-purple-600">{{ getLevelProgress(student.pet_exp).current }}/{{ getLevelProgress(student.pet_exp).required }}</span>
                </span>
                <span class="font-bold text-primary">⭐ {{ student.total_points }}</span>
              </div>
              
              <!-- Progress Bar -->
              <div class="bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-gradient-to-r from-purple-400 to-purple-500 rounded-full h-2 transition-all"
                  :style="{ width: `${getLevelProgress(student.pet_exp).percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Batch Action Bar -->
        <div v-if="batchMode && selectedStudents.size > 0" class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-2xl p-4 flex justify-center gap-4 z-40">
          <button 
            @click="batchAddPoints"
            class="bg-gradient-to-r from-green-400 to-green-500 text-white px-8 py-3 rounded-xl font-bold hover:from-green-500 hover:to-green-600 transition shadow-lg"
          >
            ⬆️ 统一加分
          </button>
          <button 
            @click="batchSubPoints"
            class="bg-gradient-to-r from-red-400 to-red-500 text-white px-8 py-3 rounded-xl font-bold hover:from-red-500 hover:to-red-600 transition shadow-lg"
          >
            ⬇️ 统一扣分
          </button>
        </div>
        
        <!-- Delete Student Action Bar -->
        <div v-if="showDeleteStudentMode" class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-2xl p-4 flex justify-center gap-4 z-40">
          <span class="text-gray-600 py-3">已选 {{ deleteStudentList.length }} 人</span>
          <button 
            @click="batchDeleteStudents"
            :disabled="deleteStudentList.length === 0"
            class="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ 确认删除
          </button>
          <button 
            @click="cancelDeleteMode"
            class="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-300 transition shadow-lg"
          >
            取消
          </button>
        </div>
      </div>
    </main>

    <!-- Class Modal -->
    <div v-if="showClassModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-96">
        <h3 class="text-lg font-bold mb-4">创建班级</h3>
        <input 
          v-model="newClassName"
          type="text" 
          placeholder="班级名称"
          class="w-full border rounded-lg px-4 py-2 mb-4"
          @keyup.enter="createClass"
        />
        <div class="flex gap-2 justify-end">
          <button @click="showClassModal = false" class="px-4 py-2 text-gray-500">取消</button>
          <button @click="createClass" class="bg-primary text-white px-4 py-2 rounded-lg">创建</button>
        </div>
      </div>
    </div>

    <!-- Student Modal -->
    <div v-if="showStudentModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-96">
        <h3 class="text-lg font-bold mb-4">添加学生</h3>
        <input 
          v-model="newStudentName"
          type="text" 
          placeholder="学生姓名"
          class="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <input 
          v-model="newStudentNo"
          type="text" 
          placeholder="学号（可选）"
          class="w-full border rounded-lg px-4 py-2 mb-4"
        />
        <div class="flex gap-2 justify-end">
          <button @click="showStudentModal = false" class="px-4 py-2 text-gray-500">取消</button>
          <button @click="addStudent" class="bg-primary text-white px-4 py-2 rounded-lg">添加</button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[500px]">
        <h3 class="text-lg font-bold mb-2">📥 批量导入学生</h3>
        <p class="text-sm text-gray-500 mb-4">
          一行一个学生，姓名和学号用空格、逗号、Tab或分号分隔
        </p>
        <textarea 
          v-model="importText"
          placeholder="张三 20240001&#10;李四, 20240002&#10;王五；20240003"
          class="w-full border rounded-lg px-4 py-3 mb-4 h-48 text-sm font-mono"
        ></textarea>
        <div class="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
          <p class="font-medium mb-1">示例格式：</p>
          <code class="text-xs bg-gray-200 px-1 rounded">
            张三 20240001<br>
            李四,20240002<br>
            王五；20240003
          </code>
        </div>
        <div class="flex gap-2 justify-end">
          <button @click="showImportModal = false" class="px-4 py-2 text-gray-500">取消</button>
          <button @click="importStudents" class="bg-primary text-white px-4 py-2 rounded-lg">导入</button>
        </div>
      </div>
    </div>

    <!-- Add/Sub Points Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[500px] max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-bold mb-4">
          <template v-if="selectedStudent">
            为 <span class="text-primary">{{ selectedStudent?.name }}</span> 评价
          </template>
          <template v-else>
            批量评价 <span class="text-purple-500">{{ selectedStudents.size }}</span> 名学生
          </template>
        </h3>
        
        <!-- Category Tabs -->
        <div class="flex gap-2 mb-4 border-b pb-2">
          <button 
            v-for="cat in categories" 
            :key="cat"
            @click="selectedEvalTab = cat"
            class="px-4 py-2 rounded-lg text-sm font-medium transition"
            :class="selectedEvalTab === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            {{ cat }}
          </button>
        </div>
        
        <!-- Rules Grid -->
        <div class="grid grid-cols-2 gap-2">
          <button 
            v-for="rule in currentCategoryRules" 
            :key="rule.id"
            @click="quickAdd(selectedStudent, rule); showAddModal = false"
            class="rounded-lg p-3 text-left transition border-2"
            :class="rule.points > 0 ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'"
          >
            <div class="flex items-center justify-between">
              <span 
                class="font-bold text-lg"
                :class="rule.points > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
              </span>
              <span v-if="rule.points > 0" class="text-green-500 text-sm">加分</span>
              <span v-else class="text-red-500 text-sm">扣分</span>
            </div>
            <div class="text-sm text-gray-700 mt-1">{{ rule.name }}</div>
          </button>
        </div>

        <div class="flex justify-end mt-4">
          <button @click="showAddModal = false" class="px-4 py-2 text-gray-500 hover:text-gray-700">取消</button>
        </div>
      </div>
    </div>

    <!-- Pet Select Modal -->
    <div v-if="showPetModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[600px] max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-bold mb-4">
          为 <span class="text-primary">{{ selectedStudent?.name }}</span> 选择宠物伙伴
        </h3>
        
        <!-- Category Tabs -->
        <div class="flex gap-2 mb-4">
          <button 
            @click="selectedPetCategory = 'normal'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition"
            :class="selectedPetCategory === 'normal' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'"
          >
            🐾 普通动物 (18种)
          </button>
          <button 
            @click="selectedPetCategory = 'mythical'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition"
            :class="selectedPetCategory === 'mythical' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'"
          >
            ✨ 神兽 (7种)
          </button>
        </div>

        <!-- Pet Grid -->
        <div class="grid grid-cols-4 gap-3">
          <button 
            v-for="pet in filteredPets" 
            :key="pet.id"
            @click="selectPet(pet.id)"
            class="bg-gray-50 rounded-xl p-3 hover:bg-orange-50 hover:ring-2 hover:ring-primary transition text-center group"
          >
            <img :src="pet.image" class="w-12 h-12 mx-auto object-contain group-hover:scale-110 transition-transform" />
            <div class="text-xs font-medium mt-1 text-gray-700">{{ pet.name }}</div>
          </button>
        </div>

        <div class="mt-4 p-3 bg-orange-50 rounded-lg text-sm text-gray-600">
          💡 点击宠物即可领养，宠物会陪伴学生一起成长！
        </div>

        <div class="flex justify-end mt-4">
          <button @click="showPetModal = false" class="px-4 py-2 text-gray-500 hover:text-gray-700">取消</button>
        </div>
      </div>
    </div>

    <!-- Ranking Modal -->
    <div v-if="showRankModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[500px] max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-bold mb-4">🏆 排行榜</h3>
        
        <div v-if="ranking.length === 0" class="text-center py-8 text-gray-500">
          暂无数据
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="(student, index) in ranking" 
            :key="student.id"
            class="flex items-center gap-3 p-3 rounded-lg"
            :class="index < 3 ? 'bg-yellow-50' : 'bg-gray-50'"
          >
            <div class="w-8 text-center font-bold text-lg">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              <span v-else class="text-gray-400">{{ index + 1 }}</span>
            </div>
            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <img 
                v-if="student.pet_type" 
                :src="getStudentPetImage(student)" 
                class="w-8 h-8 object-contain"
              />
              <span v-else>❓</span>
            </div>
            <div class="flex-1">
              <div class="font-medium">{{ student.name }}</div>
              <div class="text-xs text-gray-500">Lv.{{ student.pet_level }}</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-primary">+{{ student.total_points }}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button @click="showRankModal = false" class="px-4 py-2 text-gray-500">关闭</button>
        </div>
      </div>
    </div>

    <!-- Records Modal -->
    <div v-if="showRecordsModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[500px] max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-bold mb-4">📋 评价记录</h3>
        
        <div v-if="evaluationRecords.length === 0" class="text-center py-8 text-gray-500">
          暂无记录
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="record in paginatedRecords" 
            :key="record.id"
            class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-1">
              <div class="font-medium">{{ record.student_name }}</div>
              <div class="text-sm text-gray-600">{{ record.reason }}</div>
              <div class="text-xs text-gray-400">{{ new Date(record.timestamp).toLocaleString('zh-CN') }}</div>
            </div>
            <div class="text-right">
              <span 
                class="font-bold"
                :class="record.points > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ record.points > 0 ? '+' : '' }}{{ record.points }}
              </span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t">
          <div class="text-sm text-gray-500">
            共 {{ totalRecords }} 条，第 {{ recordsPage }}/{{ totalPages }} 页
          </div>
          <div class="flex gap-2">
            <button 
              @click="prevPage"
              :disabled="recordsPage <= 1"
              class="px-3 py-1 rounded-lg border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <button 
              v-for="page in totalPages" 
              :key="page"
              @click="goToPage(page)"
              class="px-3 py-1 rounded-lg text-sm min-w-[32px]"
              :class="recordsPage === page ? 'bg-primary text-white' : 'border hover:bg-gray-50'"
            >
              {{ page }}
            </button>
            <button 
              @click="nextPage"
              :disabled="recordsPage >= totalPages"
              class="px-3 py-1 rounded-lg border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button @click="showRecordsModal = false" class="px-4 py-2 text-gray-500">关闭</button>
        </div>
      </div>
    </div>

    <!-- Rules Modal -->
    <div v-if="showRulesModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[600px] max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-bold mb-4">⚙️ 管理评价规则</h3>
        
        <!-- Add Rule Form -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 class="font-medium mb-3">添加自定义规则</h4>
          <div class="flex gap-2 mb-3">
            <input 
              v-model="newRuleName"
              type="text" 
              placeholder="规则名称"
              class="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <select v-model="newRuleCategory" class="border rounded-lg px-3 py-2 text-sm">
              <option>学习</option>
              <option>行为</option>
              <option>健康</option>
              <option>其他</option>
            </select>
            <input 
              v-model.number="newRulePoints"
              type="number" 
              placeholder="分值"
              class="w-20 border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button 
            @click="addRule"
            class="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-500"
          >
            添加规则
          </button>
        </div>
        
        <!-- Rules List -->
        <div class="space-y-2">
          <template v-for="cat in categories" :key="cat">
            <div v-if="rules.filter(r => r.category === cat).length > 0" class="mb-4">
              <h4 class="font-medium text-gray-700 mb-2">{{ cat }}</h4>
              <div class="grid grid-cols-2 gap-2">
                <div 
                  v-for="rule in rules.filter(r => r.category === cat)" 
                  :key="rule.id"
                  class="flex items-center justify-between p-3 rounded-lg border"
                  :class="rule.points > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
                >
                  <div>
                    <span 
                      class="font-bold mr-2"
                      :class="rule.points > 0 ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
                    </span>
                    <span class="text-sm">{{ rule.name }}</span>
                    <span v-if="rule.is_custom" class="text-xs text-gray-400 ml-1">(自定义)</span>
                  </div>
                  <button 
                    v-if="rule.is_custom"
                    @click="deleteRule(rule.id)"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="flex justify-end mt-4">
          <button @click="showRulesModal = false" class="px-4 py-2 text-gray-500">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>