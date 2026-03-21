<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import Header from '@/components/layout/Header.vue'

const { isAdmin, isGuest, api, username } = useAuth()
const toast = useToast()
const router = useRouter()

// 处理退出登录

interface TeacherClass {
  id: string
  name: string
  student_count: number
  eval_count: number
}

interface Teacher {
  id: string
  username: string
  isAdmin: boolean
  createdAt: number
  classCount: number
  totalStudents: number
  totalEvals: number
  classes: TeacherClass[]
}

interface Stats {
  teachers: number
  classes: number
  students: number
  evaluations: number
  todayEvaluations: number
}

interface DailyStat {
  date: string
  count: number
}

const teachers = ref<Teacher[]>([])
const stats = ref<Stats | null>(null)
const dailyStats = ref<DailyStat[]>([])
const isLoading = ref(true)
const expandedTeacher = ref<string | null>(null)

// 权限检查
onMounted(async () => {
  if (isGuest.value || !isAdmin.value) {
    toast.error('需要管理员权限')
    router.push('/')
    return
  }
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
    dailyStats.value = statsRes.data.dailyStats
  } catch (e: any) {
    toast.error(e.response?.data?.error || '加载失败')
  } finally {
    isLoading.value = false
  }
}

function toggleTeacher(id: string) {
  expandedTeacher.value = expandedTeacher.value === id ? null : id
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

const totalStudents = computed(() => {
  return teachers.value.reduce((sum, t) => sum + t.totalStudents, 0)
})

const totalEvals = computed(() => {
  return teachers.value.reduce((sum, t) => sum + t.totalEvals, 0)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex flex-col">
    <!-- Header -->
    <Header
      :classes="[]"
      :current-class="null"
      :is-guest="isGuest"
      :is-admin="isAdmin"
      :username="username"
      :batch-mode="false"
      
      
    />

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent"></div>
    </div>

    <!-- Content -->
    <main v-else class="flex-1 max-w-4xl mx-auto p-4 space-y-6 w-full">
      <!-- 统计卡片 -->
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

      <!-- 最近7天统计 -->
      <div class="bg-white rounded-xl shadow-sm p-4">
        <h3 class="font-bold text-gray-700 mb-3">📊 最近7天评价</h3>
        <div class="flex gap-2 overflow-x-auto pb-2">
          <div 
            v-for="day in dailyStats" 
            :key="day.date"
            class="flex-shrink-0 bg-gradient-to-b from-orange-50 to-amber-50 rounded-lg p-3 text-center min-w-[80px]"
          >
            <div class="text-xs text-gray-500">{{ day.date.slice(5) }}</div>
            <div class="text-lg font-bold text-orange-500">{{ day.count }}</div>
          </div>
        </div>
      </div>

      <!-- 老师列表 -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-700">👨‍🏫 老师列表 ({{ teachers.length }} 人)</h3>
        </div>
        
        <div v-if="teachers.length === 0" class="p-8 text-center text-gray-400">
          暂无老师数据
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div 
            v-for="teacher in teachers" 
            :key="teacher.id"
            class="hover:bg-gray-50"
          >
            <!-- 老师行 -->
            <div 
              class="p-4 flex items-center justify-between cursor-pointer"
              @click="toggleTeacher(teacher.id)"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                  {{ teacher.username.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="font-medium text-gray-800 flex items-center gap-2">
                    {{ teacher.username }}
                    <span v-if="teacher.isAdmin" class="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">管理员</span>
                  </div>
                  <div class="text-sm text-gray-500">
                    注册于 {{ formatDate(teacher.createdAt) }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-4 text-sm">
                <div class="text-center">
                  <div class="font-bold text-blue-500">{{ teacher.classCount }}</div>
                  <div class="text-gray-400">班级</div>
                </div>
                <div class="text-center">
                  <div class="font-bold text-green-500">{{ teacher.totalStudents }}</div>
                  <div class="text-gray-400">学生</div>
                </div>
                <div class="text-center">
                  <div class="font-bold text-purple-500">{{ teacher.totalEvals }}</div>
                  <div class="text-gray-400">评价</div>
                </div>
                <div class="text-gray-400">
                  <span 
                    class="inline-block transition-transform duration-200"
                    :class="expandedTeacher === teacher.id ? 'rotate-180' : ''"
                  >▼</span>
                </div>
              </div>
            </div>

            <!-- 展开的班级列表 -->
            <Transition name="expand">
              <div v-if="expandedTeacher === teacher.id && teacher.classes.length > 0" class="bg-gray-50 px-4 pb-4">
                <div class="pt-2 space-y-2">
                  <div 
                    v-for="cls in teacher.classes" 
                    :key="cls.id"
                    class="bg-white rounded-lg p-3 flex items-center justify-between"
                  >
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

      <!-- 汇总 -->
      <div class="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4">
        <h3 class="font-bold text-gray-700 mb-2">📈 汇总</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>总学生数: <span class="font-bold text-green-600">{{ totalStudents }} 人</span></div>
          <div>总评价数: <span class="font-bold text-purple-600">{{ totalEvals }} 条</span></div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}
</style>