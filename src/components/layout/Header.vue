<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Class } from '@/types'
import { useAuth } from '@/composables/useAuth'

defineProps<{
  classes: Class[]
  currentClass: Class | null
  isGuest: boolean
  isAdmin: boolean
  username: string
  batchMode: boolean
}>()

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()
const showUserMenu = ref(false)

function isActive(path: string) {
  return route.path === path
}

function handleLogin() {
  showUserMenu.value = false
  // 如果不在首页，跳转到首页并弹出登录弹窗
  if (route.path !== '/') {
    router.push('/?showLogin=1')
  }
}

function handleLogout() {
  logout()
  showUserMenu.value = false
  window.location.reload()
}
</script>

<template>
  <header class="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 shadow-lg sticky top-0 z-30">
    <!-- 第一行：Logo、用户 -->
    <div class="px-4 py-3 flex items-center justify-between">
      <!-- Left -->
      <router-link to="/" class="text-xl font-bold text-white drop-shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
        <span class="text-2xl animate-bounce-slow">🐾</span>
        <span class="text-gradient">班级宠物园</span>
      </router-link>

      <!-- Right -->
      <div class="flex items-center gap-2">
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
              <div v-if="isGuest" class="px-3 py-2 text-sm text-gray-500 border-b border-gray-100">
                当前为游客模式
              </div>
              <div v-else class="px-3 py-2 text-sm text-gray-500 border-b border-gray-100">
                已登录: {{ username }}
              </div>
              <template v-if="isGuest">
                <button @click="handleLogin" class="w-full text-left px-3 py-2 text-sm hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors">
                  🔑 登录 / 注册
                </button>
              </template>
              <template v-else>
                <button @click="handleLogout" class="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  🚪 退出登录
                </button>
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 第二行：导航 + 操作菜单 -->
    <div class="px-4 py-2 flex items-center justify-between border-t border-white/20 bg-white/10">
      <!-- 左侧：页面导航 -->
      <nav class="flex items-center gap-1">
        <router-link 
          to="/" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          🏠 首页
        </router-link>
        <router-link 
          to="/ranking" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/ranking') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          🏆 排行
        </router-link>
        <router-link 
          to="/records" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/records') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          📋 记录
        </router-link>
        <router-link 
          to="/students" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/students') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          👥 学生
        </router-link>
        <router-link 
          to="/preview" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/preview') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          📖 图鉴
        </router-link>
        <router-link 
          to="/settings" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/settings') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          ⚙️ 设置
        </router-link>
        <router-link 
          v-if="isAdmin"
          to="/admin" 
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          :class="isActive('/admin') ? 'bg-white text-orange-600 shadow-md' : 'text-white/90 hover:bg-white/20'"
        >
          🔐 管理
        </router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.text-gradient {
  background: linear-gradient(to right, #fff, #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>