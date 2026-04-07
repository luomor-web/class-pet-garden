<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import PageLayout from '@/components/layout/PageLayout.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { user, isGuest, isAdmin, api } = useAuth()
const toast = useToast()
const { confirmDialog, showConfirm, closeConfirm } = useConfirm()

interface Post {
  id: string
  title: string
  content: string
  created_at: number
  updated_at: number
  author_name: string
  author_id: string
  author_is_admin: boolean
  upvotes: number
  downvotes: number
  comment_count: number
  myVote?: number  // 1=赞, -1=踩, 0=无
}

interface Comment {
  id: string
  content: string
  created_at: number
  author_name: string
  author_id: string
  author_is_admin: boolean
}

const posts = ref<Post[]>([])
const isLoading = ref(true)
const showPostModal = ref(false)
const showDetailModal = ref(false)
const selectedPost = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const newTitle = ref('')
const newContent = ref('')
const newComment = ref('')
const isSubmitting = ref(false)
const isLoadingDetail = ref(false)

onMounted(async () => {
  await loadPosts()
})

async function loadPosts() {
  isLoading.value = true
  try {
    const res = await api.get('/posts')
    posts.value = res.data.posts
    // 如果已登录，获取投票状态
    if (user.value && !isGuest.value) {
      await loadVoteStatus()
    }
  } catch (e: any) {
    toast.error('加载失败')
  } finally {
    isLoading.value = false
  }
}

async function loadVoteStatus() {
  try {
    const res = await api.get('/posts')
    const postsData = res.data.posts as Post[]
    // 并行获取每个帖子的投票状态
    await Promise.all(postsData.map(async (post) => {
      try {
        const voteRes = await api.get(`/posts/${post.id}/vote`)
        const p = posts.value.find(p => p.id === post.id)
        if (p) p.myVote = voteRes.data.voteType
      } catch {
        // 忽略
      }
    }))
  } catch {
    // 忽略
  }
}

function formatDate(timestamp: number) {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function showAuthorName(authorName: string, isAdmin: boolean): string {
  return isAdmin ? '作者' : authorName
}

function openCreateModal() {
  if (isGuest.value) {
    toast.error('游客无法发帖，请登录')
    return
  }
  newTitle.value = ''
  newContent.value = ''
  showPostModal.value = true
}

async function createPost() {
  if (!newTitle.value.trim() || !newContent.value.trim()) {
    toast.error('标题和内容不能为空')
    return
  }
  isSubmitting.value = true
  try {
    await api.post('/posts', {
      title: newTitle.value.trim(),
      content: newContent.value.trim()
    })
    toast.success('发布成功')
    showPostModal.value = false
    await loadPosts()
  } catch (e: any) {
    toast.error(e.response?.data?.error || '发布失败')
  } finally {
    isSubmitting.value = false
  }
}

async function openDetail(post: Post) {
  selectedPost.value = post
  showDetailModal.value = true
  isLoadingDetail.value = true
  newComment.value = ''
  
  try {
    const res = await api.get(`/posts/${post.id}`)
    selectedPost.value = res.data.post
    comments.value = res.data.comments
    
    // 获取投票状态
    if (user.value && !isGuest.value && selectedPost.value) {
      const voteRes = await api.get(`/posts/${post.id}/vote`)
      selectedPost.value.myVote = voteRes.data.voteType
    }
  } catch (e: any) {
    toast.error('加载失败')
    showDetailModal.value = false
  } finally {
    isLoadingDetail.value = false
  }
}

async function vote(post: Post, voteType: number) {
  if (isGuest.value) {
    toast.error('游客无法投票')
    return
  }
  try {
    const res = await api.post(`/posts/${post.id}/vote`, { voteType })
    // 更新投票状态
    const actualVote = res.data.voteType
    const oldVote = post.myVote || 0
    
    // 更新计数
    if (oldVote === 1) post.upvotes--
    if (oldVote === -1) post.downvotes--
    if (actualVote === 1) post.upvotes++
    if (actualVote === -1) post.downvotes++
    
    post.myVote = actualVote
  } catch (e: any) {
    toast.error(e.response?.data?.error || '操作失败')
  }
}

async function addComment() {
  if (!newComment.value.trim()) {
    toast.error('评论内容不能为空')
    return
  }
  if (!selectedPost.value) return
  
  isSubmitting.value = true
  try {
    const res = await api.post(`/posts/${selectedPost.value.id}/comments`, {
      content: newComment.value.trim()
    })
    comments.value.push({
      id: res.data.id,
      content: res.data.content,
      created_at: res.data.created_at,
      author_name: res.data.author_name,
      author_id: res.data.author_id,
      author_is_admin: res.data.author_is_admin
    })
    newComment.value = ''
    // 更新评论数
    selectedPost.value.comment_count++
    const post = posts.value.find(p => p.id === selectedPost.value!.id)
    if (post) post.comment_count++
  } catch (e: any) {
    toast.error(e.response?.data?.error || '评论失败')
  } finally {
    isSubmitting.value = false
  }
}

async function deletePost() {
  if (!selectedPost.value) return
  
  showConfirm({
    title: '删除帖子',
    message: '确定要删除这篇帖子吗？',
    confirmText: '删除',
    type: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/posts/${selectedPost.value!.id}`)
        toast.success('删除成功')
        posts.value = posts.value.filter(p => p.id !== selectedPost.value!.id)
        showDetailModal.value = false
      } catch (e: any) {
        toast.error(e.response?.data?.error || '删除失败')
      }
    }
  })
}

async function deleteComment(commentId: string) {
  if (!selectedPost.value) return
  
  showConfirm({
    title: '删除评论',
    message: '确定要删除这条评论吗？',
    confirmText: '删除',
    type: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/posts/${selectedPost.value!.id}/comments/${commentId}`)
        comments.value = comments.value.filter(c => c.id !== commentId)
        selectedPost.value!.comment_count--
        const post = posts.value.find(p => p.id === selectedPost.value!.id)
        if (post) post.comment_count--
        toast.success('删除成功')
      } catch (e: any) {
        toast.error(e.response?.data?.error || '删除失败')
      }
    }
  })
}

const canPost = computed(() => user.value && !isGuest.value)
</script>

<template>
  <PageLayout>
    <div class="max-w-3xl mx-auto w-full">
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">💬 公共留言板</h1>
        <button 
          @click="openCreateModal"
          :disabled="!canPost"
          class="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          发帖
        </button>
      </div>

      <!-- 提示 -->
      <div v-if="isGuest" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p class="text-sm text-amber-700">💡 游客可以浏览帖子，但无法发帖、评论或投票。请登录后参与讨论。</p>
      </div>

      <!-- 加载中 -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent"></div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="posts.length === 0" class="text-center py-20 text-gray-400">
        <div class="text-6xl mb-4">📭</div>
        <p>还没有帖子，来发第一个吧！</p>
      </div>

      <!-- 帖子列表 -->
      <div v-else class="space-y-4">
        <div 
          v-for="post in posts" 
          :key="post.id"
          @click="openDetail(post)"
          class="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
               :class="post.author_is_admin ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'">
              {{ post.author_is_admin ? '🐾' : post.author_name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-800 truncate">{{ post.title }}</h3>
              <p class="text-sm text-gray-500 line-clamp-2 mt-1 whitespace-pre-wrap">{{ post.content }}</p>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span :class="post.author_is_admin ? 'text-orange-500 font-medium' : ''">{{ showAuthorName(post.author_name, post.author_is_admin) }}</span>
                <span>{{ formatDate(post.created_at) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 操作栏 -->
          <div class="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <button 
              @click.stop="vote(post, 1)"
              :disabled="isGuest"
              class="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
              :class="[
                post.myVote === 1 ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500',
                isGuest ? 'opacity-50 cursor-not-allowed' : ''
              ]"
            >
              <span>{{ post.myVote === 1 ? '👍' : '👍' }}</span>
              <span>{{ post.upvotes }}</span>
            </button>
            <button 
              @click.stop="vote(post, -1)"
              :disabled="isGuest"
              class="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
              :class="[
                post.myVote === -1 ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-500',
                isGuest ? 'opacity-50 cursor-not-allowed' : ''
              ]"
            >
              <span>{{ post.myVote === -1 ? '👎' : '👎' }}</span>
              <span>{{ post.downvotes }}</span>
            </button>
            <span class="text-gray-400">💬 {{ post.comment_count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 发帖弹窗 -->
    <div v-if="showPostModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showPostModal = false">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div class="bg-orange-500 px-6 py-4">
          <h3 class="text-xl font-bold text-white">✏️ 发帖</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p class="text-sm text-amber-700">📢 帖子所有人可见，请注意保护个人信息，不要在内容中透露敏感信息，不要散布不良言论。</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input 
              v-model="newTitle"
              type="text"
              placeholder="帖子标题"
              class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea 
              v-model="newContent"
              placeholder="写下你的建议或想法..."
              rows="3"
              maxlength="300"
              class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            ></textarea>
            <div class="text-right text-xs mt-1" :class="newContent.length > 300 ? 'text-red-500' : 'text-gray-400'">
              {{ newContent.length }}/300
            </div>
          </div>
          <div class="flex gap-3">
            <button 
              @click="showPostModal = false"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button 
              @click="createPost"
              :disabled="isSubmitting || !newTitle.trim() || !newContent.trim()"
              class="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {{ isSubmitting ? '发布中...' : '发布' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showDetailModal = false">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div v-if="isLoadingDetail" class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-400 border-t-transparent"></div>
        </div>
        <template v-else-if="selectedPost">
          <!-- 帖子内容 -->
          <div class="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
            <h3 class="text-xl font-bold text-white">{{ selectedPost.title }}</h3>
            <div class="flex items-center gap-4 mt-2 text-white/80 text-sm">
              <span :class="selectedPost.author_is_admin ? 'text-white font-bold' : ''">{{ showAuthorName(selectedPost.author_name, selectedPost.author_is_admin) }}</span>
              <span>{{ formatDate(selectedPost.created_at) }}</span>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto">
            <!-- 帖子正文 -->
            <div class="p-6 border-b border-gray-100">
              <p class="text-gray-700 whitespace-pre-wrap">{{ selectedPost.content }}</p>
              
              <!-- 操作栏 -->
              <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center gap-4">
                  <button 
                    @click="vote(selectedPost, 1)"
                    :disabled="isGuest"
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                    :class="[
                      selectedPost.myVote === 1 ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500',
                      isGuest ? 'opacity-50 cursor-not-allowed' : ''
                    ]"
                  >
                    <span>👍</span>
                    <span>{{ selectedPost.upvotes }}</span>
                  </button>
                  <button 
                    @click="vote(selectedPost, -1)"
                    :disabled="isGuest"
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                    :class="[
                      selectedPost.myVote === -1 ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-500',
                      isGuest ? 'opacity-50 cursor-not-allowed' : ''
                    ]"
                  >
                    <span>👎</span>
                    <span>{{ selectedPost.downvotes }}</span>
                  </button>
                </div>
                <button 
                  v-if="user?.id === selectedPost.author_id || isAdmin"
                  @click="deletePost"
                  class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  删除
                </button>
              </div>
            </div>

            <!-- 评论列表 -->
            <div class="p-6">
              <h4 class="font-medium text-gray-800 mb-4">💬 评论 ({{ comments.length }})</h4>
              
              <div v-if="comments.length === 0" class="text-center text-gray-400 py-8">
                暂无评论，来说点什么吧~
              </div>
              
              <div v-else class="space-y-4">
                <div v-for="comment in comments" :key="comment.id" class="flex gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    :class="comment.author_is_admin ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-purple-400 to-pink-400'">
                    {{ comment.author_is_admin ? '🐾' : comment.author_name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span :class="comment.author_is_admin ? 'text-orange-500 font-medium' : 'font-medium text-gray-700'" class="text-sm">{{ showAuthorName(comment.author_name, comment.author_is_admin) }}</span>
                      <span class="text-xs text-gray-400">{{ formatDate(comment.created_at) }}</span>
                    </div>
                    <p class="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{{ comment.content }}</p>
                  </div>
                  <button 
                    v-if="user?.id === comment.author_id || isAdmin"
                    @click="deleteComment(comment.id)"
                    class="text-gray-400 hover:text-red-500 text-xs"
                  >
                    删除
                  </button>
                </div>
              </div>

              <!-- 评论输入 -->
              <div v-if="!isGuest" class="mt-6 pt-4 border-t border-gray-100">
                <div class="flex gap-3">
                  <div class="flex-1">
                    <input 
                      v-model="newComment"
                      type="text"
                      placeholder="写下你的评论..."
                      maxlength="300"
                      class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      @keyup.enter="addComment"
                    />
                    <div class="text-right text-xs mt-1" :class="newComment.length > 300 ? 'text-red-500' : 'text-gray-400'">
                      {{ newComment.length }}/300
                    </div>
                  </div>
                  <button 
                    @click="addComment"
                    :disabled="isSubmitting || !newComment.trim() || newComment.length > 300"
                    class="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 self-start"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </PageLayout>
  <ConfirmDialog :show="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :type="confirmDialog.type" @confirm="confirmDialog.onConfirm" @cancel="closeConfirm" />
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>