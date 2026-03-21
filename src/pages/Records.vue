<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import type { EvaluationRecord, Class } from '@/types'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Header from '@/components/layout/Header.vue'

const { api, isGuest, isAdmin, username } = useAuth()
const toast = useToast()
const { confirmDialog, showConfirm, closeConfirm } = useConfirm()

const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const records = ref<EvaluationRecord[]>([])
const isLoading = ref(true)

// 处理退出登录

// 分页
const page = ref(1)
const pageSize = 20
const totalRecords = ref(0)
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize))

// 选中的记录
const selectedIds = ref<Set<string>>(new Set())
const isAllSelected = computed(() => 
  records.value.length > 0 && 
  records.value.every(r => selectedIds.value.has(r.id))
)

// 搜索
const searchQuery = ref('')
const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value
  const query = searchQuery.value.toLowerCase()
  return records.value.filter(r => 
    r.student_name?.toLowerCase().includes(query) ||
    r.reason?.toLowerCase().includes(query) ||
    r.category?.toLowerCase().includes(query)
  )
})

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
    if (classes.value.length > 0) {
      const savedClassId = localStorage.getItem('pet-garden-current-class')
      currentClass.value = savedClassId 
        ? classes.value.find(c => c.id === savedClassId) || classes.value[0]
        : classes.value[0]
    }
  } catch (error) {
    console.error('加载班级失败:', error)
  }
}

async function loadRecords() {
  if (!currentClass.value) return
  isLoading.value = true
  try {
    const res = await api.get(`/evaluations?classId=${currentClass.value.id}&page=${page.value}&pageSize=${pageSize}`)
    // 最新记录在前（API 返回的是旧记录在前，需要反转）
    records.value = (res.data.records || []).reverse()
    totalRecords.value = res.data.total
  } catch (error) {
    console.error('加载记录失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 选择操作
function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    records.value.forEach(r => selectedIds.value.add(r.id))
  }
}

// 撤回单条记录
async function undoRecord(recordId: string) {
  showConfirm({
    title: '撤回评价',
    message: '确定撤回该评价？将恢复学生的积分。',
    confirmText: '撤回',
    type: 'warning',
    onConfirm: async () => {
      try {
        await api.delete(`/evaluations/${recordId}`)
        toast.success('已撤回')
        selectedIds.value.delete(recordId)
        // 通知其他页面数据已变更
        localStorage.setItem('pet-garden-data-version', Date.now().toString())
        loadRecords()
      } catch (error) {
        toast.error('撤回失败')
      }
    }
  })
}

// 批量撤回
async function undoSelected() {
  if (selectedIds.value.size === 0) return
  showConfirm({
    title: '批量撤回',
    message: `确定撤回选中的 ${selectedIds.value.size} 条评价？将恢复相关学生的积分。`,
    confirmText: '撤回',
    type: 'warning',
    onConfirm: async () => {
      let successCount = 0
      for (const recordId of selectedIds.value) {
        try {
          await api.delete(`/evaluations/${recordId}`)
          successCount++
        } catch (error) {
          console.error('撤回失败:', error)
        }
      }
      toast.success(`已撤回 ${successCount} 条评价`)
      selectedIds.value.clear()
      // 通知其他页面数据已变更
      localStorage.setItem('pet-garden-data-version', Date.now().toString())
      loadRecords()
    }
  })
}

// 检查班级是否变化
function syncCurrentClass() {
  const savedClassId = localStorage.getItem('pet-garden-current-class')
  if (savedClassId && savedClassId !== currentClass.value?.id) {
    currentClass.value = classes.value.find(c => c.id === savedClassId) || classes.value[0]
    page.value = 1
    selectedIds.value.clear()
    loadRecords()
  }
}

onMounted(async () => {
  await loadClasses()
  await loadRecords()
})

onActivated(() => {
  syncCurrentClass()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex flex-col">
    <Header 
      :classes="classes" 
      :current-class="currentClass" 
      :is-guest="isGuest"
      :is-admin="isAdmin"
      :username="username"
      :batch-mode="false"
      
      
    />

    <main class="flex-1 p-6">
      <div class="max-w-5xl mx-auto">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span class="text-3xl">📋</span> 评价记录
            </h1>
            <p class="text-gray-500 text-sm mt-1" v-if="totalRecords > 0">
              共 {{ totalRecords }} 条记录
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="selectedIds.size > 0"
              @click="undoSelected"
              class="px-4 py-2 text-sm text-orange-500 hover:bg-orange-50 border border-orange-200 rounded-xl font-medium transition-colors"
            >
              ↩️ 撤回选中 ({{ selectedIds.size }})
            </button>
          </div>
        </div>

        <!-- 搜索 -->
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 搜索学生姓名、原因、分类..."
            class="w-full max-w-sm border-2 border-gray-200 rounded-xl px-4 py-2 text-sm bg-white shadow-sm focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>

        <!-- 加载中 -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="text-center">
            <div class="text-6xl animate-bounce mb-4">📋</div>
            <div class="text-gray-500">加载中...</div>
          </div>
        </div>

        <!-- 无记录 -->
        <div v-else-if="records.length === 0" class="text-center py-20 text-gray-500 bg-white rounded-2xl shadow-sm">
          <div class="text-6xl mb-4">📝</div>
          <div>暂无评价记录</div>
        </div>

        <!-- 记录列表 -->
        <div v-else class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <!-- 表头 -->
          <div class="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
            <div class="col-span-1 flex items-center">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
              />
            </div>
            <div class="col-span-2">学生</div>
            <div class="col-span-2">积分</div>
            <div class="col-span-3">原因</div>
            <div class="col-span-1">分类</div>
            <div class="col-span-2">时间</div>
            <div class="col-span-1 text-right">操作</div>
          </div>

          <!-- 记录行 -->
          <div 
            v-for="record in filteredRecords" 
            :key="record.id"
            class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center"
            :class="{ 'bg-orange-50/30': selectedIds.has(record.id) }"
          >
            <!-- 选择框 -->
            <div class="col-span-1">
              <input 
                type="checkbox" 
                :checked="selectedIds.has(record.id)"
                @change="toggleSelect(record.id)"
                class="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
              />
            </div>

            <!-- 学生 -->
            <div class="col-span-2 flex items-center gap-2">
              <span class="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {{ record.student_name?.charAt(0) || '?' }}
              </span>
              <span class="font-medium text-gray-800 truncate">{{ record.student_name }}</span>
            </div>

            <!-- 积分 -->
            <div class="col-span-2">
              <span
                class="px-2.5 py-1 rounded-full text-sm font-bold"
                :class="record.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
              >
                {{ record.points > 0 ? '+' : '' }}{{ record.points }}
              </span>
            </div>

            <!-- 原因 -->
            <div class="col-span-3 text-sm text-gray-600 truncate" :title="record.reason">
              {{ record.reason }}
            </div>

            <!-- 分类 -->
            <div class="col-span-1">
              <span class="text-xs px-2 py-1 bg-gray-100 rounded-lg text-gray-500">{{ record.category }}</span>
            </div>

            <!-- 时间 -->
            <div class="col-span-2 text-sm text-gray-400">
              {{ formatDate(record.timestamp) }}
            </div>

            <!-- 操作 -->
            <div class="col-span-1 text-right">
              <button 
                @click="undoRecord(record.id)" 
                class="text-orange-500 hover:text-orange-600 text-sm font-medium"
              >
                撤回
              </button>
            </div>
          </div>
        </div>

        <!-- 搜索无结果 -->
        <div v-if="!isLoading && records.length > 0 && filteredRecords.length === 0" class="text-center py-12 text-gray-500">
          没有找到匹配的记录
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <button
            @click="page--; loadRecords()"
            :disabled="page === 1"
            class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <div class="flex items-center gap-1">
            <template v-for="p in totalPages" :key="p">
              <button
                v-if="p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)"
                @click="page = p; loadRecords()"
                class="w-10 h-10 rounded-xl text-sm font-medium transition-colors"
                :class="page === p ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'"
              >
                {{ p }}
              </button>
              <span v-else-if="p === page - 2 || p === page + 2" class="px-1 text-gray-400">...</span>
            </template>
          </div>
          <button
            @click="page++; loadRecords()"
            :disabled="page === totalPages"
            class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>
    </main>

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
  </div>
</template>