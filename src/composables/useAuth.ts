import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: string
  username: string
  isGuest: boolean
}

const user = ref<User | null>(null)
const token = ref<string>(localStorage.getItem('token') || '')

// 初始化用户状态
const savedUser = localStorage.getItem('user')
if (savedUser) {
  try {
    user.value = JSON.parse(savedUser)
  } catch {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }
}

// 如果没有用户，自动设置为游客
if (!user.value) {
  const guestUser = { id: 'guest', username: '游客', isGuest: true }
  user.value = guestUser
  token.value = 'guest'
  localStorage.setItem('token', 'guest')
  localStorage.setItem('user', JSON.stringify(guestUser))
}

// 创建带认证的 axios 实例
export function useAuth() {
  const api = axios.create({
    baseURL: '/pet-garden/api'
  })
  
  // 添加请求拦截器
  api.interceptors.request.use((config) => {
    if (token.value) {
      config.headers.Authorization = `Bearer ${token.value}`
    }
    return config
  })
  
  const isLoggedIn = computed(() => !!user.value && !user.value.isGuest)
  const isGuest = computed(() => user.value?.isGuest ?? true)
  const username = computed(() => user.value?.username || '游客')
  
  function setUser(userData: User, userToken: string) {
    user.value = userData
    token.value = userToken
    localStorage.setItem('token', userToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }
  
  function logout() {
    // 退出登录后回到游客模式
    const guestUser = { id: 'guest', username: '游客', isGuest: true }
    user.value = guestUser
    token.value = 'guest'
    localStorage.setItem('token', 'guest')
    localStorage.setItem('user', JSON.stringify(guestUser))
  }
  
  async function fetchUserInfo() {
    if (isGuest.value) return // 游客不需要获取用户信息
    try {
      const res = await api.get('/auth/me')
      user.value = res.data.user
    } catch {
      // Token 无效，回到游客模式
      logout()
    }
  }
  
  return {
    user,
    token,
    isLoggedIn,
    isGuest,
    username,
    api,
    setUser,
    logout,
    fetchUserInfo
  }
}
