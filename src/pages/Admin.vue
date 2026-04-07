<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import PageLayout from '@/components/layout/PageLayout.vue'

const { isAdmin, isGuest, api } = useAuth()
const toast = useToast()
const router = useRouter()

interface TeacherClass { id: string; name: string; student_count: number; eval_count: number }
interface Teacher { id: string; username: string; isAdmin: boolean; isGuest: boolean; createdAt: number; classCount: number; totalStudents: number; totalEvals: number; lastEvalTime: number | null; todayEvals: number; classes: TeacherClass[] }
interface Stats { teachers: number; classes: number; students: number; evaluations: number; todayEvaluations: number }
interface DailyStat { date: string; newUsers: number; newClasses: number; newStudents: number; evaluations: number }

const teachers = ref<Teacher[]>([])
const stats = ref<Stats | null>(null)
const dailyStats = ref<DailyStat[]>([])
const isLoading = ref(true)
const expandedTeacher = ref<string | null>(null)
const activeTab = ref<'teachers' | 'stats'>('teachers')

// 删除确认弹窗状态
const showDeleteConfirm = ref(false)
const teacherToDelete = ref<Teacher | null>(null)
const isDeleting = ref(false)
const deleteConfirmInput = ref('')

// 判断输入的用户名是否匹配
const canConfirmDelete = computed(() => deleteConfirmInput.value === teacherToDelete.value?.username)

onMounted(async () => {
  if (isGuest.value || !isAdmin.value) { toast.error('需要管理员权限'); router.push('/'); return }
  await loadData()
})

async function loadData() {
  isLoading.value = true
  try {
    const [teachersRes, statsRes] = await Promise.all([
      api.get('/admin/teachers'),
      api.get('/admin/stats')
    ])
    teachers.value = teachersRes.data.teachers
    stats.value = statsRes.data.stats
    // 加载详细的每日统计数据
    await loadDailyStats()
  } catch (e: any) {
    toast.error(e.response?.data?.error || '加载失败')
  } finally {
    isLoading.value = false
  }
}

async function loadDailyStats() {
  if (dailyStats.value.length > 0) return // 已经加载过
  try {
    const res = await api.get('/admin/daily-stats')
    dailyStats.value = res.data.dailyStats
  } catch (e: any) {
    console.error('加载统计数据失败', e)
  }
}

function toggleTeacher(id: string) { expandedTeacher.value = expandedTeacher.value === id ? null : id }
function formatDate(timestamp: number) { return new Date(timestamp).toLocaleDateString('zh-CN') }
function formatShortDate(date: string) { return date.slice(5) }

// 判断是否超过15天没有评价（综合考虑注册时间）
function isInactive(teacher: Teacher): boolean {
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000
  const now = Date.now()
  
  if (teacher.lastEvalTime) {
    // 有评价记录，判断最后一次评价是否超过15天
    return now - teacher.lastEvalTime > fifteenDaysMs
  } else {
    // 从未评价，判断注册时间是否超过15天
    return now - teacher.createdAt > fifteenDaysMs
  }
}

const totalStudents = computed(() => teachers.value.reduce((sum, t) => sum + t.totalStudents, 0))
const totalEvals = computed(() => teachers.value.reduce((sum, t) => sum + t.totalEvals, 0))

// 计算最大值用于图表
const maxEvals = computed(() => Math.max(...dailyStats.value.map(d => d.evaluations), 1))
const maxNewStudents = computed(() => Math.max(...dailyStats.value.map(d => d.newStudents), 1))
const maxNewUsers = computed(() => Math.max(...dailyStats.value.map(d => d.newUsers), 1))
const maxNewClasses = computed(() => Math.max(...dailyStats.value.map(d => d.newClasses), 1))

// 周汇总
const weekTotal = computed(() => ({
  newUsers: dailyStats.value.reduce((sum, d) => sum + d.newUsers, 0),
  newClasses: dailyStats.value.reduce((sum, d) => sum + d.newClasses, 0),
  newStudents: dailyStats.value.reduce((sum, d) => sum + d.newStudents, 0),
  evaluations: dailyStats.value.reduce((sum, d) => sum + d.evaluations, 0)
}))

// 折线图路径生成
const chartHeight = 60
const paddingY = 10
const defaultWidth = 300

function generateLinePath(data: number[], max: number): string {
  if (data.length === 0) return ''
  const stepX = defaultWidth / data.length
  const points = data.map((val, i) => {
    const x = (i + 0.5) * stepX  // 在 flex 子元素中心
    const y = chartHeight - paddingY - (val / Math.max(max, 1)) * (chartHeight - paddingY * 2)
    return `${x},${y}`
  })
  return `M ${points.join(' L ')}`
}

function generateAreaPath(data: number[], max: number): string {
  if (data.length === 0) return ''
  const stepX = defaultWidth / data.length
  const linePath = generateLinePath(data, max)
  const firstX = 0.5 * stepX
  const lastX = (data.length - 0.5) * stepX
  return `${linePath} L ${lastX},${chartHeight - paddingY} L ${firstX},${chartHeight - paddingY} Z`
}

// 删除相关
function confirmDelete(teacher: Teacher) {
  teacherToDelete.value = teacher
  deleteConfirmInput.value = ''
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
  teacherToDelete.value = null
  deleteConfirmInput.value = ''
}

async function executeDelete() {
  if (!teacherToDelete.value) return
  
  isDeleting.value = true
  try {
    await api.delete(`/admin/users/${teacherToDelete.value.id}`)
    toast.success(`已删除用户 ${teacherToDelete.value.username}`)
    teachers.value = teachers.value.filter(t => t.id !== teacherToDelete.value!.id)
    showDeleteConfirm.value = false
    teacherToDelete.value = null
  } catch (e: any) {
    toast.error(e.response?.data?.error || '删除失败')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <PageLayout>
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent"></div>
    </div>
    
    <div v-else class="max-w-4xl mx-auto space-y-6 w-full">
      <!-- 概览卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-white rounded-xl shadow-sm p-4 text-center">
          <div class="text-2xl font-bold text-orange-500">{{ stats?.teachers || 0 }}</div>
          <div class="text-sm text-gray-500">老师数</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center">
          <div class="text-2xl font-bold text-blue-500">{{ stats?.classes || 0 }}</div>
          <div class="text-sm text-gray-500">班级数</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center">
          <div class="text-2xl font-bold text-green-500">{{ stats?.students || 0 }}</div>
          <div class="text-sm text-gray-500">学生数</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center">
          <div class="text-2xl font-bold text-purple-500">{{ stats?.evaluations || 0 }}</div>
          <div class="text-sm text-gray-500">评价数</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center">
          <div class="text-2xl font-bold text-rose-500">{{ stats?.todayEvaluations || 0 }}</div>
          <div class="text-sm text-gray-500">今日评价</div>
        </div>
      </div>

      <!-- 页签切换 -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="flex border-b border-gray-100">
          <button 
            @click="activeTab = 'teachers'"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'teachers' ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' : 'text-gray-500 hover:text-gray-700'"
          >
            👨‍🏫 老师列表
          </button>
          <button 
            @click="activeTab = 'stats'; loadDailyStats()"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
            :class="activeTab === 'stats' ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' : 'text-gray-500 hover:text-gray-700'"
          >
            📊 近7天数据
          </button>
        </div>

        <!-- 老师列表 -->
        <div v-if="activeTab === 'teachers'">
          <div v-if="teachers.length === 0" class="p-8 text-center text-gray-400">暂无老师数据</div>
          <div v-else class="divide-y divide-gray-100">
            <div v-for="teacher in teachers" :key="teacher.id" class="hover:bg-gray-50" :class="isInactive(teacher) && !teacher.isAdmin && !teacher.isGuest ? 'bg-red-50/30' : ''">
              <div class="p-4 flex items-center justify-between cursor-pointer" @click="toggleTeacher(teacher.id)">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                    {{ teacher.username.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium text-gray-800 flex items-center gap-2">
                      {{ teacher.username }}
                      <span v-if="teacher.isAdmin" class="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">管理员</span>
                      <span v-if="teacher.isGuest" class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">游客</span>
                      <span v-if="isInactive(teacher) && !teacher.isAdmin && !teacher.isGuest" class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠️ 不活跃</span>
                      <button 
                        v-if="!teacher.isAdmin && !teacher.isGuest"
                        @click.stop="confirmDelete(teacher)"
                        class="ml-1 px-2 py-0.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除用户"
                      >
                        删除
                      </button>
                    </div>
                    <div class="text-sm flex items-center gap-2 text-gray-500">
                      注册于 {{ formatDate(teacher.createdAt) }}
                      <span class="text-gray-400">|</span>
                      <span :class="isInactive(teacher) ? 'text-red-500 font-medium' : 'text-gray-500'">
                        {{ teacher.lastEvalTime ? '最后评价于 ' + formatDate(teacher.lastEvalTime) : '从未评价' }}
                        <span v-if="teacher.todayEvals > 0" class="text-orange-500 font-medium ml-1">
                          (今日 {{ teacher.todayEvals }} 次)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-4 text-sm">
                  <div class="text-center"><div class="font-bold text-blue-500">{{ teacher.classCount }}</div><div class="text-gray-400">班级</div></div>
                  <div class="text-center"><div class="font-bold text-green-500">{{ teacher.totalStudents }}</div><div class="text-gray-400">学生</div></div>
                  <div class="text-center"><div class="font-bold text-purple-500">{{ teacher.totalEvals }}</div><div class="text-gray-400">评价</div></div>
                  <div class="text-gray-400 pl-2">
                    <span class="inline-block transition-transform duration-200" :class="expandedTeacher === teacher.id ? 'rotate-180' : ''">▼</span>
                  </div>
                </div>
              </div>
              <Transition name="expand">
                <div v-if="expandedTeacher === teacher.id && teacher.classes.length > 0" class="bg-gray-50 px-4 pb-4">
                  <div class="pt-2 space-y-2">
                    <div v-for="cls in teacher.classes" :key="cls.id" class="bg-white rounded-lg p-3 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-lg">📚</span>
                        <span class="font-medium text-gray-700">{{ cls.name }}</span>
                      </div>
                      <div class="flex items-center gap-4 text-sm">
                        <span class="text-green-600">{{ cls.student_count }} 人</span>
                        <span class="text-purple-600">{{ cls.eval_count }} 条评价</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- 近7天数据 -->
        <div v-else class="p-4">
          <!-- 周汇总 -->
          <div class="grid grid-cols-4 gap-3 mb-6">
            <div class="bg-orange-50 rounded-lg p-3 text-center">
              <div class="text-lg font-bold text-orange-600">+{{ weekTotal.newUsers }}</div>
              <div class="text-xs text-gray-500">新用户</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-center">
              <div class="text-lg font-bold text-blue-600">+{{ weekTotal.newClasses }}</div>
              <div class="text-xs text-gray-500">新班级</div>
            </div>
            <div class="bg-green-50 rounded-lg p-3 text-center">
              <div class="text-lg font-bold text-green-600">+{{ weekTotal.newStudents }}</div>
              <div class="text-xs text-gray-500">新学生</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-3 text-center">
              <div class="text-lg font-bold text-purple-600">{{ weekTotal.evaluations }}</div>
              <div class="text-xs text-gray-500">评价数</div>
            </div>
          </div>

          <!-- 折线图 -->
          <div class="space-y-4">
            <!-- 新用户 -->
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">🆕 新用户</h4>
                <span class="text-xs text-orange-600 font-medium">+{{ weekTotal.newUsers }}</span>
              </div>
              <svg viewBox="0 0 300 60" class="w-full h-16" preserveAspectRatio="none">
                <defs><linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f97316" /><stop offset="100%" stop-color="#f97316" stop-opacity="0" /></linearGradient></defs>
                <path :d="generateAreaPath(dailyStats.map(d => d.newUsers), Math.max(maxNewUsers, 1))" fill="url(#orangeGradient)" opacity="0.3" />
                <path :d="generateLinePath(dailyStats.map(d => d.newUsers), Math.max(maxNewUsers, 1))" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div class="flex justify-between mt-1">
                <div v-for="day in dailyStats" :key="day.date" class="text-center flex-1">
                  <div class="text-xs font-medium text-orange-600">{{ day.newUsers || '-' }}</div>
                  <div class="text-xs text-gray-400">{{ formatShortDate(day.date) }}</div>
                </div>
              </div>
            </div>

            <!-- 新班级 -->
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">📚 新班级</h4>
                <span class="text-xs text-blue-600 font-medium">+{{ weekTotal.newClasses }}</span>
              </div>
              <svg viewBox="0 0 300 60" class="w-full h-16" preserveAspectRatio="none">
                <defs><linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#3b82f6" /><stop offset="100%" stop-color="#3b82f6" stop-opacity="0" /></linearGradient></defs>
                <path :d="generateAreaPath(dailyStats.map(d => d.newClasses), Math.max(maxNewClasses, 1))" fill="url(#blueGradient)" opacity="0.3" />
                <path :d="generateLinePath(dailyStats.map(d => d.newClasses), Math.max(maxNewClasses, 1))" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div class="flex justify-between mt-1">
                <div v-for="day in dailyStats" :key="day.date" class="text-center flex-1">
                  <div class="text-xs font-medium text-blue-600">{{ day.newClasses || '-' }}</div>
                  <div class="text-xs text-gray-400">{{ formatShortDate(day.date) }}</div>
                </div>
              </div>
            </div>

            <!-- 新增学生 -->
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">👥 新增学生</h4>
                <span class="text-xs text-green-600 font-medium">+{{ weekTotal.newStudents }}</span>
              </div>
              <svg viewBox="0 0 300 60" class="w-full h-16" preserveAspectRatio="none">
                <defs><linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#22c55e" /><stop offset="100%" stop-color="#22c55e" stop-opacity="0" /></linearGradient></defs>
                <path :d="generateAreaPath(dailyStats.map(d => d.newStudents), maxNewStudents)" fill="url(#greenGradient)" opacity="0.3" />
                <path :d="generateLinePath(dailyStats.map(d => d.newStudents), maxNewStudents)" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div class="flex justify-between mt-1">
                <div v-for="day in dailyStats" :key="day.date" class="text-center flex-1">
                  <div class="text-xs font-medium text-green-600">{{ day.newStudents || '-' }}</div>
                  <div class="text-xs text-gray-400">{{ formatShortDate(day.date) }}</div>
                </div>
              </div>
            </div>

            <!-- 评价趋势 -->
            <div class="bg-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">📈 评价趋势</h4>
                <span class="text-xs text-purple-600 font-medium">{{ weekTotal.evaluations }} 条</span>
              </div>
              <svg viewBox="0 0 300 60" class="w-full h-16" preserveAspectRatio="none">
                <defs><linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#a855f7" /><stop offset="100%" stop-color="#a855f7" stop-opacity="0" /></linearGradient></defs>
                <path :d="generateAreaPath(dailyStats.map(d => d.evaluations), maxEvals)" fill="url(#purpleGradient)" opacity="0.3" />
                <path :d="generateLinePath(dailyStats.map(d => d.evaluations), maxEvals)" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div class="flex justify-between mt-1">
                <div v-for="day in dailyStats" :key="day.date" class="text-center flex-1">
                  <div class="text-xs font-medium text-purple-600">{{ day.evaluations || '-' }}</div>
                  <div class="text-xs text-gray-400">{{ formatShortDate(day.date) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 汇总 -->
      <div class="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4">
        <h3 class="font-bold text-gray-700 mb-2">📈 汇总</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>总学生数: <span class="font-bold text-green-600">{{ totalStudents }} 人</span></div>
          <div>总评价数: <span class="font-bold text-purple-600">{{ totalEvals }} 条</span></div>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="cancelDelete">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div class="bg-red-500 px-6 py-4">
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            ⚠️ 危险操作
          </h3>
        </div>
        <div class="p-6">
          <p class="text-gray-700 mb-4">
            确定要删除用户 <span class="font-bold text-red-600">{{ teacherToDelete?.username }}</span> 吗？
          </p>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-red-700 font-medium mb-2">此操作将同时删除：</p>
            <ul class="text-sm text-red-600 space-y-1">
              <li>• {{ teacherToDelete?.classCount || 0 }} 个班级</li>
              <li>• {{ teacherToDelete?.totalStudents || 0 }} 名学生</li>
              <li>• {{ teacherToDelete?.totalEvals || 0 }} 条评价记录</li>
            </ul>
            <p class="text-sm text-red-700 mt-3 font-medium">⚠️ 此操作不可恢复！</p>
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              请输入用户名 <span class="text-red-600 font-bold">{{ teacherToDelete?.username }}</span> 以确认删除：
            </label>
            <input 
              type="text"
              v-model="deleteConfirmInput"
              class="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              :class="deleteConfirmInput && !canConfirmDelete ? 'border-red-300 bg-red-50' : 'border-gray-300'"
              placeholder="输入用户名确认"
              @keydown.enter="canConfirmDelete && executeDelete()"
            />
            <p v-if="deleteConfirmInput && !canConfirmDelete" class="text-sm text-red-500 mt-1">
              用户名不匹配
            </p>
          </div>
          <div class="flex gap-3">
            <button 
              @click="cancelDelete"
              :disabled="isDeleting"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button 
              @click="executeDelete"
              :disabled="isDeleting || !canConfirmDelete"
              class="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="isDeleting" class="animate-spin">⏳</span>
              <span v-else>确认删除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to, .expand-leave-from { max-height: 500px; }
</style>