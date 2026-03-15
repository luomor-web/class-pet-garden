<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

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
const showEvalModal = ref(false)
const showRankModal = ref(false)
const showPetModal = ref(false)
const newClassName = ref('')
const newStudentName = ref('')
const newStudentNo = ref('')
const selectedStudent = ref<Student | null>(null)
const selectedCategory = ref('学习')
const selectedPoints = ref(0)
const selectedReason = ref('')

// Computed
const filteredStudents = computed(() => {
  let result = [...students.value]
  if (searchQuery.value) {
    result = result.filter(s => s.name.includes(searchQuery.value))
  }
  result.sort((a, b) => sortAsc.value ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
  return result
})

const rulesByCategory = computed(() => {
  const result: Record<string, Rule[]> = {}
  for (const rule of rules.value) {
    if (!result[rule.category]) result[rule.category] = []
    result[rule.category].push(rule)
  }
  return result
})

// API calls
async function loadClasses() {
  const res = await axios.get('/api/classes')
  classes.value = res.data.classes
  if (classes.value.length > 0 && !currentClass.value) {
    selectClass(classes.value[0])
  }
}

async function selectClass(cls: Class) {
  currentClass.value = cls
  await loadStudents()
}

async function loadStudents() {
  if (!currentClass.value) return
  const res = await axios.get(`/api/classes/${currentClass.value.id}/students`)
  students.value = res.data.students
}

async function loadRules() {
  const res = await axios.get('/api/rules')
  rules.value = res.data.rules
}

async function createClass() {
  if (!newClassName.value.trim()) return
  await axios.post('/api/classes', { name: newClassName.value.trim() })
  newClassName.value = ''
  showClassModal.value = false
  await loadClasses()
}

async function deleteClass(id: string) {
  if (!confirm('确定删除该班级？所有学生数据将一并删除！')) return
  await axios.delete(`/api/classes/${id}`)
  if (currentClass.value?.id === id) {
    currentClass.value = null
    students.value = []
  }
  await loadClasses()
}

async function addStudent() {
  if (!newStudentName.value.trim() || !currentClass.value) return
  await axios.post('/api/students', {
    classId: currentClass.value.id,
    name: newStudentName.value.trim(),
    studentNo: newStudentNo.value.trim() || null
  })
  newStudentName.value = ''
  newStudentNo.value = ''
  showStudentModal.value = false
  await loadStudents()
}

async function deleteStudent(id: string) {
  if (!confirm('确定删除该学生？')) return
  await axios.delete(`/api/students/${id}`)
  await loadStudents()
}

async function addEvaluation(student: Student) {
  selectedStudent.value = student
  showEvalModal.value = true
}

async function submitEvaluation() {
  if (!selectedStudent.value || !selectedReason.value || !currentClass.value) return
  await axios.post('/api/evaluations', {
    classId: currentClass.value.id,
    studentId: selectedStudent.value.id,
    points: selectedPoints.value,
    reason: selectedReason.value,
    category: selectedCategory.value
  })
  showEvalModal.value = false
  selectedReason.value = ''
  selectedPoints.value = 0
  selectedCategory.value = '学习'
  await loadStudents()
}

function selectRule(rule: Rule) {
  selectedPoints.value = rule.points
  selectedReason.value = rule.name
  selectedCategory.value = rule.category
}

// Initialize
onMounted(() => {
  loadClasses()
  loadRules()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex">
    <!-- Sidebar -->
    <aside class="w-56 bg-white shadow-lg flex flex-col">
      <div class="p-4 border-b">
        <h1 class="text-lg font-bold text-primary">🐾 班级宠物园</h1>
      </div>
      
      <!-- Tools -->
      <div class="flex-1 p-2 space-y-1">
        <div class="px-3 py-2">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="🔍 搜索学生"
            class="w-full text-sm border rounded px-2 py-1"
          />
        </div>
        
        <button 
          @click="sortAsc = !sortAsc"
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
        >
          📝 姓名排序 {{ sortAsc ? '↑' : '↓' }}
        </button>
        
        <button 
          @click="showRankModal = true"
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
        >
          🏆 排行榜
        </button>
        
        <button 
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
        >
          🛒 小商店
        </button>
        
        <button 
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
        >
          📋 评价记录
        </button>
      </div>
      
      <!-- Class Selector -->
      <div class="p-2 border-t">
        <select 
          v-if="classes.length > 0"
          class="w-full border rounded px-2 py-1 text-sm"
          :value="currentClass?.id"
          @change="selectClass(classes.find(c => c.id === ($event.target as HTMLSelectElement).value)!)"
        >
          <option v-for="cls in classes" :key="cls.id" :value="cls.id">
            {{ cls.name }}
          </option>
        </select>
        <button 
          @click="showClassModal = true"
          class="w-full mt-2 bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-orange-500"
        >
          + 新建班级
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">{{ currentClass?.name || '请选择班级' }}</h2>
          <p class="text-sm text-gray-500">{{ students.length }} 名学生</p>
        </div>
        <div class="flex gap-2">
          <button 
            v-if="currentClass"
            @click="showStudentModal = true"
            class="bg-secondary text-white px-4 py-2 rounded-lg text-sm hover:bg-green-500"
          >
            + 添加学生
          </button>
          <button 
            v-if="currentClass"
            @click="deleteClass(currentClass.id)"
            class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
          >
            删除班级
          </button>
        </div>
      </header>

      <!-- Students Grid -->
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

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div 
            v-for="student in filteredStudents" 
            :key="student.id"
            class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition cursor-pointer group"
            @click="addEvaluation(student)"
          >
            <div class="text-center">
              <div class="text-4xl mb-2">
                {{ student.pet_type ? '🐾' : '❓' }}
              </div>
              <div class="font-bold text-gray-800">{{ student.name }}</div>
              <div v-if="student.student_no" class="text-xs text-gray-400">{{ student.student_no }}</div>
              <div class="flex items-center justify-center gap-2 mt-2">
                <span class="text-sm text-gray-600">Lv.{{ student.pet_level }}</span>
                <span class="text-sm font-medium text-primary">+{{ student.total_points }}</span>
              </div>
              <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-primary rounded-full h-2 transition-all"
                  :style="{ width: `${Math.min(100, (student.pet_exp % 40) * 2.5)}%` }"
                ></div>
              </div>
            </div>
            <button 
              @click.stop="deleteStudent(student.id)"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs"
            >
              ✕
            </button>
          </div>
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

    <!-- Evaluation Modal -->
    <div v-if="showEvalModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-[500px] max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-bold mb-4">
          为 <span class="text-primary">{{ selectedStudent?.name }}</span> 加分/扣分
        </h3>
        
        <!-- Quick Rules -->
        <div class="mb-4">
          <div class="text-sm text-gray-500 mb-2">快速选择：</div>
          <div class="grid grid-cols-3 gap-2">
            <template v-for="(rlist, cat) in rulesByCategory" :key="cat">
              <button 
                v-for="rule in rlist.slice(0, 3)" 
                :key="rule.id"
                @click="selectRule(rule)"
                class="text-left px-3 py-2 rounded border text-sm hover:bg-gray-50"
                :class="rule.points > 0 ? 'border-green-200' : 'border-red-200'"
              >
                <span :class="rule.points > 0 ? 'text-green-600' : 'text-red-600'">
                  {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
                </span>
                {{ rule.name }}
              </button>
            </template>
          </div>
        </div>

        <!-- Custom Input -->
        <div class="border-t pt-4">
          <div class="flex gap-2 mb-3">
            <select v-model="selectedCategory" class="border rounded px-3 py-2">
              <option>学习</option>
              <option>行为</option>
              <option>健康</option>
              <option>其他</option>
            </select>
            <input 
              v-model.number="selectedPoints"
              type="number" 
              placeholder="分值"
              class="w-24 border rounded px-3 py-2"
            />
          </div>
          <input 
            v-model="selectedReason"
            type="text" 
            placeholder="原因"
            class="w-full border rounded px-3 py-2 mb-4"
          />
        </div>

        <div class="flex gap-2 justify-end">
          <button @click="showEvalModal = false" class="px-4 py-2 text-gray-500">取消</button>
          <button @click="submitEvaluation" class="bg-primary text-white px-4 py-2 rounded-lg">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>