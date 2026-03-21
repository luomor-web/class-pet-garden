import { ref, readonly } from 'vue'

// 单例状态
const showModal = ref(false)

export function useLoginModal() {
  function openLoginModal() {
    showModal.value = true
  }

  function closeLoginModal() {
    showModal.value = false
  }

  return {
    showLoginModal: readonly(showModal),
    openLoginModal,
    closeLoginModal
  }
}