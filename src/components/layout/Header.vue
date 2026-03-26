<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useClasses } from '@/composables/useClasses'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useLoginModal } from '@/composables/useLoginModal'
import ClassModal from '@/components/modals/ClassModal.vue'
import RewardModal from '@/components/modals/RewardModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

defineProps<{
  batchMode?: boolean
}>()

const route = useRoute()
const router = useRouter()
const { logout, isGuest, isAdmin, username } = useAuth()
const { classes, currentClass, selectClass, loadClasses, createClass: doCreateClass, updateClass: doUpdateClass, deleteClass: doDeleteClass, init } = useClasses()
const toast = useToast()
const { confirmDialog, showConfirm, closeConfirm } = useConfirm()
const { openLoginModal } = useLoginModal()

const showUserMenu = ref(false)
const showClassSelect = ref(false)
const showClassModal = ref(false)
const showRewardModal = ref(false)
const editingClass = ref<any>(null)

function isActive(path: string) {
  return route.path === path
}

function handleLogin() {
  showUserMenu.value = false
  if (route.path !== '/') {
    router.push('/')
  }
  openLoginModal()
}

function handleLogout() {
  logout()
  showUserMenu.value = false
  window.location.reload()
}

function handleSelectClass(cls: any) {
  selectClass(cls)
  showClassSelect.value = false
}

function openCreateClassModal() {
  editingClass.value = null
  showClassSelect.value = false
  showClassModal.value = true
}

function openRewardModal() {
  showRewardModal.value = true
}

function openEditClassModal() {
  if (!currentClass.value) return
  editingClass.value = currentClass.value
  showClassSelect.value = false
  showClassModal.value = true
}

function handleDeleteClass() {
  if (!currentClass.value) return
  showClassSelect.value = false
  showConfirm({
    title: '删除班级',
    message: '确定删除该班级？所有学生数据将一并删除！',
    confirmText: '删除',
    type: 'danger',
    onConfirm: async () => {
      await doDeleteClass(currentClass.value!.id)
      toast.success('班级删除成功！')
      await loadClasses()
    }
  })
}

async function handleClassSubmit(name: string) {
  if (!name.trim()) {
    toast.warning('请输入班级名称')
    return
  }
  try {
    if (editingClass.value) {
      await doUpdateClass(editingClass.value.id, name.trim())
      toast.success('班级更新成功！')
    } else {
      await doCreateClass(name.trim())
      toast.success('班级创建成功！')
    }
    showClassModal.value = false
    editingClass.value = null
    await loadClasses()
  } catch (error) {
    toast.error(editingClass.value ? '更新班级失败' : '创建班级失败')
  }
}

onMounted(() => {
  init()
})
</script>

<template>
  <header class="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 shadow-lg sticky top-0 z-50">
    <!-- 第一行：Logo、班级选择、用户 -->
    <div class="px-4 py-3 flex items-center justify-between">
      <!-- Left: Logo -->
      <router-link to="/" class="text-xl font-bold text-white drop-shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
        <span class="text-2xl animate-bounce-slow">🐾</span>
        <span class="text-gradient">星光班级宠物园</span>
      </router-link>

      <!-- Right: 游客提示 + 班级选择 + 用户 -->
      <div class="flex items-center gap-3">
        <!-- 游客提示 -->
        <span 
          v-if="isGuest"
          class="text-xs text-white/80"
        >
          当前为游客，点击头像注册登录
        </span>

        <!-- 班级选择 -->
        <div v-if="classes.length > 0" class="relative">
          <button 
            @click="showClassSelect = !showClassSelect"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-white/20 text-white hover:bg-white/30"
          >
            <span>📚</span>
            <span>{{ currentClass?.name || '选择班级' }}</span>
            <span class="text-white/60">▾</span>
          </button>
          <div v-if="showClassSelect" @click="showClassSelect = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showClassSelect" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-56 z-50 overflow-hidden">
              <div class="max-h-48 overflow-auto">
                <button
                  v-for="cls in classes"
                  :key="cls.id"
                  @click="handleSelectClass(cls)"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors flex items-center gap-2"
                  :class="cls.id === currentClass?.id ? 'bg-orange-50 text-orange-600 font-medium' : ''"
                >
                  <span>{{ cls.id === currentClass?.id ? '✓' : '' }}</span>
                  <span>{{ cls.name }}</span>
                </button>
              </div>
              <div class="border-t border-gray-100 mt-1 pt-1">
                <button @click="openCreateClassModal" class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">➕ 新建班级</button>
                <button v-if="currentClass" @click="openEditClassModal" class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">✏️ 重命名班级</button>
                <button v-if="currentClass" @click="handleDeleteClass" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">🗑️ 删除班级</button>
              </div>
            </div>
          </Transition>
        </div>

        <div class="relative">
          <button @click="openCreateClassModal" class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">➕ 新建班级</button>
        </div>
        <div class="relative">
          <button @click="openRewardModal" class="w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">🏫 打赏</button>
        </div>

        <!-- User Menu -->
        <div class="relative">
          <button @click="showUserMenu = !showUserMenu" class="w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow-md transition-all flex items-center justify-center overflow-hidden">
            <span v-if="isGuest" class="text-lg">👤</span>
            <span v-else class="w-full h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              {{ username.charAt(0).toUpperCase() }}
            </span>
          </button>
          <div v-if="showUserMenu" @click="showUserMenu = false" class="fixed inset-0 z-40"></div>
          <Transition name="dropdown">
            <div v-if="showUserMenu" class="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-44 z-50 overflow-hidden">
              <div v-if="isGuest" class="px-3 py-2 text-sm text-gray-500 border-b border-gray-100">游客模式</div>
              <div v-else class="px-3 py-2 text-sm text-gray-500 border-b border-gray-100">已登录: {{ username }}</div>
              <template v-if="isGuest">
                <button @click="handleLogin" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">🔑 登录 / 注册</button>
              </template>
              <template v-else>
                <button @click="handleLogout" class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">🚪 退出登录</button>
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 第二行：导航 -->
    <div class="px-4 py-2 flex items-center border-t border-white/20 bg-white/10">
      <nav class="flex items-center gap-1">
        <router-link to="/" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">🏠 首页</router-link>
        <router-link to="/ranking" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/ranking') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">🏆 排行</router-link>
        <router-link to="/records" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/records') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">📋 记录</router-link>
        <router-link to="/students" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/students') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">👥 学生</router-link>
        <router-link to="/preview" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/preview') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">📖 图鉴</router-link>
        <router-link to="/settings" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/settings') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">⚙️ 设置</router-link>
        <router-link v-if="isAdmin" to="/admin" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" :class="isActive('/admin') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'">🔐 管理</router-link>
      </nav>
    </div>
  </header>

  <ClassModal :show="showClassModal" :editing="editingClass" @close="showClassModal = false; editingClass = null" @submit="handleClassSubmit" />
  <RewardModal :show="showRewardModal" @close="showRewardModal = false" />
  <ConfirmDialog :show="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :type="confirmDialog.type" @confirm="confirmDialog.onConfirm" @cancel="closeConfirm" />
</template>

<style scoped>
.text-gradient {
  background: linear-gradient(to right, #fff, #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px); }
</style>