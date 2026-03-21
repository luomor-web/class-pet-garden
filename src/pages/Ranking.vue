<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import type { Student, Class } from '@/types'
import { useAuth } from '@/composables/useAuth'
import { getPetLevelImage, calculateLevel } from '@/data/pets'
import Header from '@/components/layout/Header.vue'

const { api, isGuest, isAdmin, username } = useAuth()

const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const students = ref<Student[]>([])
const isLoading = ref(true)

// 处理退出登录

// 按积分排序的排行榜
const ranking = computed(() => {
  return [...students.value].sort((a, b) => b.total_points - a.total_points)
})

// 前五名（按领奖台顺序：第4、第2、第1、第3、第5）
const podiumOrder = computed(() => {
  const sorted = ranking.value
  return [
    sorted[3] || null, // 左边 - 第四名
    sorted[1] || null, // 左中 - 第二名
    sorted[0] || null, // 中间 - 第一名
    sorted[2] || null, // 右中 - 第三名
    sorted[4] || null  // 右边 - 第五名
  ]
})

// 其余学生（第6名开始，最多15人）
const crowd = computed(() => ranking.value.slice(5, 20))

function getStudentPetImage(student: Student): string {
  if (!student.pet_type) return ''
  const level = Math.max(1, Math.min(8, student.pet_level || 1))
  return getPetLevelImage(student.pet_type, level)
}

function getDisplayLevel(student: Student): number {
  return calculateLevel(student.pet_exp)
}

async function loadRanking() {
  isLoading.value = true
  try {
    const classRes = await api.get('/classes')
    classes.value = classRes.data.classes
    
    if (classes.value.length > 0) {
      const savedClassId = localStorage.getItem('pet-garden-current-class')
      const targetClass = savedClassId 
        ? classes.value.find(c => c.id === savedClassId) 
        : classes.value[0]
      
      currentClass.value = targetClass || classes.value[0]
      
      const res = await api.get(`/classes/${currentClass.value.id}/students`)
      students.value = res.data.students
    }
  } catch (error) {
    console.error('加载排行榜失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 检查班级是否变化，如有则重新加载
function checkClassAndReload() {
  const savedClassId = localStorage.getItem('pet-garden-current-class')
  if (savedClassId && savedClassId !== currentClass.value?.id) {
    currentClass.value = classes.value.find(c => c.id === savedClassId) || classes.value[0]
    loadStudents()
  }
}

async function loadStudents() {
  if (!currentClass.value) return
  try {
    const res = await api.get(`/classes/${currentClass.value.id}/students`)
    students.value = res.data.students
  } catch (error) {
    console.error('加载学生失败:', error)
  }
}

onMounted(() => {
  loadRanking()
})

onActivated(() => {
  checkClassAndReload()
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
    
    <div class="flex-1 ranking-page p-6">
      <!-- 加载中 -->
      <div v-if="isLoading" class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-7xl animate-bounce mb-4">🐾</div>
          <div class="text-white/80 text-lg">加载中...</div>
        </div>
      </div>

      <!-- 无数据 -->
      <div v-else-if="students.length === 0" class="flex items-center justify-center py-32">
        <div class="text-center">
          <div class="text-7xl mb-4">📊</div>
          <div class="text-white/80 text-lg">暂无学生数据</div>
        </div>
      </div>

      <!-- 排行榜 -->
      <template v-else>
        <!-- 班级名称 -->
        <div class="text-center mb-4" v-if="currentClass">
          <h2 class="text-2xl font-bold text-white drop-shadow-lg">{{ currentClass.name }}</h2>
        </div>

        <!-- 领奖台区域 -->
        <div class="podium-section">
          <div class="podium-container">
            <div class="podium">
              <!-- 第四名 -->
              <div class="podium-place fourth" v-if="podiumOrder[0]">
                <div class="pedestal">
                  <div class="pet-avatar small">
                    <img v-if="podiumOrder[0].pet_type" :src="getStudentPetImage(podiumOrder[0])" class="pet-image" />
                    <span v-else class="pet-placeholder small">🐾</span>
                  </div>
                  <div class="student-name small">{{ podiumOrder[0].name }}</div>
                  <div class="student-points small">⭐ {{ podiumOrder[0].total_points }}</div>
                  <div class="pedestal-block low">
                    <span class="rank-number small">4</span>
                  </div>
                </div>
              </div>

              <!-- 第二名 -->
              <div class="podium-place second" v-if="podiumOrder[1]">
                <div class="pedestal">
                  <div class="rank-badge">🥈</div>
                  <div class="pet-avatar">
                    <img v-if="podiumOrder[1].pet_type" :src="getStudentPetImage(podiumOrder[1])" class="pet-image" />
                    <span v-else class="pet-placeholder">🐾</span>
                  </div>
                  <div class="student-name">{{ podiumOrder[1].name }}</div>
                  <div class="student-level">Lv.{{ getDisplayLevel(podiumOrder[1]) }}</div>
                  <div class="student-points">
                    <span class="points-star">⭐</span>
                    {{ podiumOrder[1].total_points }}
                  </div>
                  <div class="pedestal-block silver">
                    <span class="rank-number">2</span>
                  </div>
                </div>
              </div>

              <!-- 第一名 -->
              <div class="podium-place first" v-if="podiumOrder[2]">
                <div class="pedestal">
                  <div class="crown">👑</div>
                  <div class="rank-badge gold">🥇</div>
                  <div class="pet-avatar large">
                    <img v-if="podiumOrder[2].pet_type" :src="getStudentPetImage(podiumOrder[2])" class="pet-image" />
                    <span v-else class="pet-placeholder large">🐾</span>
                  </div>
                  <div class="student-name champion">{{ podiumOrder[2].name }}</div>
                  <div class="student-level">Lv.{{ getDisplayLevel(podiumOrder[2]) }}</div>
                  <div class="student-points champion-points">
                    <span class="points-star">⭐</span>
                    {{ podiumOrder[2].total_points }}
                  </div>
                  <div class="pedestal-block gold-block">
                    <span class="rank-number">1</span>
                  </div>
                </div>
                <div class="spotlight"></div>
              </div>

              <!-- 第三名 -->
              <div class="podium-place third" v-if="podiumOrder[3]">
                <div class="pedestal">
                  <div class="rank-badge">🥉</div>
                  <div class="pet-avatar">
                    <img v-if="podiumOrder[3].pet_type" :src="getStudentPetImage(podiumOrder[3])" class="pet-image" />
                    <span v-else class="pet-placeholder">🐾</span>
                  </div>
                  <div class="student-name">{{ podiumOrder[3].name }}</div>
                  <div class="student-level">Lv.{{ getDisplayLevel(podiumOrder[3]) }}</div>
                  <div class="student-points">
                    <span class="points-star">⭐</span>
                    {{ podiumOrder[3].total_points }}
                  </div>
                  <div class="pedestal-block bronze">
                    <span class="rank-number">3</span>
                  </div>
                </div>
              </div>

              <!-- 第五名 -->
              <div class="podium-place fifth" v-if="podiumOrder[4]">
                <div class="pedestal">
                  <div class="pet-avatar small">
                    <img v-if="podiumOrder[4].pet_type" :src="getStudentPetImage(podiumOrder[4])" class="pet-image" />
                    <span v-else class="pet-placeholder small">🐾</span>
                  </div>
                  <div class="student-name small">{{ podiumOrder[4].name }}</div>
                  <div class="student-points small">⭐ {{ podiumOrder[4].total_points }}</div>
                  <div class="pedestal-block low">
                    <span class="rank-number small">5</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="stage-floor"></div>
          </div>
        </div>

        <!-- 人群区域 -->
        <div class="crowd-section" v-if="crowd.length > 0">
          <div class="crowd-header">
            <span class="crowd-icon">👀</span>
            <span>吃瓜群众</span>
          </div>
          
          <div class="crowd-container">
            <div 
              v-for="(student, index) in crowd" 
              :key="student.id"
              class="crowd-member"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="crowd-rank">{{ index + 6 }}</div>
              <div class="crowd-avatar">
                <img 
                  v-if="student.pet_type"
                  :src="getStudentPetImage(student)" 
                  class="crowd-pet"
                />
                <span v-else class="crowd-placeholder">🐾</span>
              </div>
              <div class="crowd-info">
                <div class="crowd-name">{{ student.name }}</div>
                <div class="crowd-points">⭐ {{ student.total_points }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ranking-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
}

.podium-section {
  padding: 20px;
  perspective: 1000px;
}

.podium-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 12px;
  padding-bottom: 0;
}

.podium-place {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pedestal {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.rank-badge {
  font-size: 2rem;
  margin-bottom: -8px;
  position: relative;
  z-index: 10;
  animation: float 2s ease-in-out infinite;
}

.rank-badge.gold {
  font-size: 2.5rem;
  animation: float 2s ease-in-out infinite, glow 1.5s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes glow {
  0%, 100% { filter: drop-shadow(0 0 5px #ffd700); }
  50% { filter: drop-shadow(0 0 20px #ffd700); }
}

.crown {
  position: absolute;
  top: -30px;
  font-size: 1.8rem;
  animation: bounce-slow 2s ease-in-out infinite;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-8px) rotate(5deg); }
}

.pet-avatar {
  width: 90px;
  height: 90px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe4c4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25), inset 0 2px 10px rgba(255,255,255,0.8);
  border: 4px solid white;
  position: relative;
  z-index: 5;
  overflow: hidden;
}

.pet-avatar.large {
  width: 120px;
  height: 120px;
  border-width: 5px;
}

.pet-avatar.small {
  width: 65px;
  height: 65px;
  border-width: 3px;
}

.pet-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.pet-placeholder {
  font-size: 2.5rem;
  opacity: 0.6;
}

.pet-placeholder.large {
  font-size: 3.5rem;
}

.pet-placeholder.small {
  font-size: 1.8rem;
}

.student-name {
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
  margin-top: 8px;
  text-align: center;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.student-name.champion {
  font-size: 1.4rem;
}

.student-name.small {
  font-size: 0.9rem;
  margin-top: 5px;
  max-width: 80px;
}

.student-level {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

.student-points {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 1.3rem;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5);
  margin-top: 4px;
}

.student-points.champion-points {
  font-size: 1.6rem;
}

.student-points.small {
  font-size: 0.95rem;
  margin-top: 2px;
}

.pedestal-block {
  width: 90px;
  height: 50px;
  background: linear-gradient(180deg, #8b8b8b 0%, #5a5a5a 100%);
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.2);
  position: relative;
}

.pedestal-block::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: rgba(255,255,255,0.3);
  border-radius: 1px;
}

.pedestal-block.gold-block {
  width: 110px;
  height: 80px;
  background: linear-gradient(180deg, #ffd700 0%, #daa520 50%, #b8860b 100%);
  box-shadow: 0 15px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4), 0 0 30px rgba(255,215,0,0.3);
}

.pedestal-block.silver {
  background: linear-gradient(180deg, #c0c0c0 0%, #a0a0a0 50%, #808080 100%);
}

.pedestal-block.bronze {
  background: linear-gradient(180deg, #cd7f32 0%, #8b4513 100%);
}

.pedestal-block.low {
  width: 70px;
  height: 35px;
}

.first .pedestal-block {
  height: 80px;
}

.second .pedestal-block {
  height: 55px;
}

.third .pedestal-block {
  height: 45px;
}

.fourth .pedestal-block,
.fifth .pedestal-block {
  height: 35px;
}

.rank-number {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.rank-number.small {
  font-size: 1.1rem;
}

.spotlight {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(ellipse at center, rgba(255,215,0,0.2) 0%, transparent 70%);
  pointer-events: none;
  animation: pulse-light 2s ease-in-out infinite;
}

@keyframes pulse-light {
  0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
}

.stage-floor {
  width: 100%;
  height: 30px;
  background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);
  border-radius: 0 0 20px 20px;
  margin-top: -5px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  position: relative;
}

.crowd-section {
  padding: 30px 20px 40px;
  max-width: 900px;
  margin: 0 auto;
}

.crowd-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.crowd-icon {
  font-size: 1.5rem;
  display: inline-block;
  animation: look-around 2s ease-in-out infinite;
}

@keyframes look-around {
  0%, 100% { transform: rotateY(0deg) scaleX(1); }
  20% { transform: rotateY(0deg) scaleX(1); }
  30% { transform: rotateY(20deg) scaleX(1); }
  50% { transform: rotateY(20deg) scaleX(1); }
  60% { transform: rotateY(0deg) scaleX(-1); }
  80% { transform: rotateY(0deg) scaleX(-1); }
  90% { transform: rotateY(0deg) scaleX(1); }
}

.crowd-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.crowd-member {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 12px 16px;
  min-width: 180px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.2);
  transition: all 0.3s ease;
  /* 使用 CSS 变量实现随机动画 */
  --x1: 2px;
  --y1: -3px;
  --x2: -1px;
  --y2: 2px;
  --r1: 0.5deg;
  --r2: -0.3deg;
  animation: float-random 4s ease-in-out infinite;
}

/* 为不同索引的元素设置不同的动画参数 */
.crowd-member:nth-child(5n+1) { --x1: 3px; --y1: -2px; --x2: -2px; --y2: 3px; --r1: 0.8deg; --r2: -0.5deg; animation-delay: 0s; }
.crowd-member:nth-child(5n+2) { --x1: -2px; --y1: 3px; --x2: 2px; --y2: -2px; --r1: -0.6deg; --r2: 0.4deg; animation-delay: 0.5s; }
.crowd-member:nth-child(5n+3) { --x1: 1px; --y1: -4px; --x2: -3px; --y2: 1px; --r1: 0.3deg; --r2: -0.7deg; animation-delay: 1s; }
.crowd-member:nth-child(5n+4) { --x1: -3px; --y1: 2px; --x2: 1px; --y2: -3px; --r1: -0.4deg; --r2: 0.6deg; animation-delay: 1.5s; }
.crowd-member:nth-child(5n+5) { --x1: 2px; --y1: -1px; --x2: -2px; --y2: 4px; --r1: 0.7deg; --r2: -0.3deg; animation-delay: 2s; }

.crowd-member:hover {
  transform: translateY(-5px) scale(1.05);
  background: rgba(255,255,255,0.25);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  animation-play-state: paused;
}

@keyframes float-random {
  0% { transform: translate(0, 0) rotate(0deg); }
  20% { transform: translate(var(--x1), var(--y1)) rotate(var(--r1)); }
  40% { transform: translate(var(--x2), var(--y2)) rotate(var(--r2)); }
  60% { transform: translate(calc(var(--x1) * -0.5), calc(var(--y1) * 0.8)) rotate(calc(var(--r1) * -0.5)); }
  80% { transform: translate(calc(var(--x2) * 0.7), calc(var(--y2) * -0.6)) rotate(calc(var(--r2) * 0.7)); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

.crowd-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 0.85rem;
}

.crowd-avatar {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe4c4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0,0,0,0.2);
  border: 2px solid white;
}

.crowd-pet {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.crowd-placeholder {
  font-size: 1.5rem;
}

.crowd-info {
  flex: 1;
  min-width: 0;
}

.crowd-name {
  font-weight: bold;
  color: white;
  font-size: 0.95rem;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crowd-points {
  font-size: 0.85rem;
  color: #ffd700;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

@media (max-width: 600px) {
  .podium {
    gap: 6px;
  }
  
  .pet-avatar {
    width: 60px;
    height: 60px;
  }
  
  .pet-avatar.large {
    width: 75px;
    height: 75px;
  }
  
  .pet-avatar.small {
    width: 45px;
    height: 45px;
  }
  
  .student-name {
    font-size: 0.8rem;
    max-width: 60px;
  }
  
  .student-name.champion {
    font-size: 0.95rem;
  }
  
  .student-name.small {
    font-size: 0.75rem;
    max-width: 55px;
  }
  
  .pedestal-block {
    width: 55px;
    height: 35px;
  }
  
  .pedestal-block.gold-block {
    width: 70px;
    height: 50px;
  }
  
  .pedestal-block.low {
    width: 50px;
    height: 28px;
  }
  
  .first .pedestal-block {
    height: 50px;
  }
  
  .second .pedestal-block {
    height: 40px;
  }
  
  .third .pedestal-block {
    height: 35px;
  }
  
  .fourth .pedestal-block,
  .fifth .pedestal-block {
    height: 28px;
  }
  
  .crowd-member {
    min-width: 140px;
    padding: 8px 10px;
  }
  
  .crowd-avatar {
    width: 35px;
    height: 35px;
  }
}
</style>