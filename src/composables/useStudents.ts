import { ref, watch } from 'vue'
import type { Student } from '@/types'
import { useAuth } from './useAuth'
import { useClasses } from './useClasses'
import { calculateLevel } from '@/data/pets'

// ============ 单例状态（模块级别） ============
const students = ref<Student[]>([])
const isLoading = ref(false)

// ============ Composable ============
export function useStudents() {
  const { api } = useAuth()
  const { currentClass } = useClasses()

  // ---------- 数据加载 ----------
  async function loadStudents() {
    if (!currentClass.value) {
      students.value = []
      return
    }
    if (isLoading.value) return
    
    isLoading.value = true
    try {
      const res = await api.get(`/classes/${currentClass.value.id}/students`)
      students.value = res.data.students || []
    } catch (error) {
      console.error('加载学生失败:', error)
      students.value = []
    } finally {
      isLoading.value = false
    }
  }

  // ---------- 学生 CRUD ----------
  async function addStudent(name: string, studentNo?: string | null) {
    if (!currentClass.value || !name.trim()) return
    
    await api.post('/students', {
      classId: currentClass.value.id,
      name: name.trim(),
      studentNo: studentNo?.trim() || null
    })
    await loadStudents()
  }

  async function updateStudent(id: string, data: { name?: string; studentNo?: string | null }) {
    await api.put(`/students/${id}`, {
      name: data.name?.trim(),
      studentNo: data.studentNo?.trim() || null
    })
    await loadStudents()
  }

  async function deleteStudent(id: string) {
    await api.delete(`/students/${id}`)
    await loadStudents()
  }

  async function batchDeleteStudents(ids: string[]) {
    if (ids.length === 0) return
    await api.post('/students/batch-delete', { ids })
    await loadStudents()
  }

  // ---------- 导入 ----------
  async function importStudents(studentList: Array<{ name: string; studentNo?: string }>) {
    if (!currentClass.value || studentList.length === 0) return
    
    const res = await api.post('/students/import', {
      classId: currentClass.value.id,
      students: studentList.map(s => ({
        name: s.name.trim(),
        studentNo: s.studentNo?.trim() || null
      }))
    })
    await loadStudents()
    return res.data
  }

  // ---------- 宠物操作 ----------
  async function changePet(studentId: string, petType: string) {
    const res = await api.put(`/students/${studentId}/pet`, { petType })
    await loadStudents()
    return res.data
  }

  // ---------- 转班 ----------
  async function transferStudent(studentId: string, targetClassId: string) {
    const res = await api.put(`/students/${studentId}/transfer`, { targetClassId })
    await loadStudents()
    return res.data
  }

  async function batchTransferStudents(studentIds: string[], targetClassId: string) {
    if (studentIds.length === 0) return
    const res = await api.post('/students/batch-transfer', { ids: studentIds, targetClassId })
    await loadStudents()
    return res.data
  }

  // ---------- 评价操作 ----------
  async function addEvaluation(studentId: string, rule: { points: number; name: string; category?: string }) {
    if (!currentClass.value) return
    
    const res = await api.post('/evaluations', {
      classId: currentClass.value.id,
      studentId,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })
    await loadStudents()
    return res.data
  }

  async function batchEvaluate(studentIds: string[], rule: { points: number; name: string; category?: string }) {
    if (!currentClass.value || studentIds.length === 0) return
    
    for (const studentId of studentIds) {
      await api.post('/evaluations', {
        classId: currentClass.value.id,
        studentId,
        points: rule.points,
        reason: rule.name,
        category: rule.category
      })
    }
    await loadStudents()
  }

  async function undoEvaluation(recordId?: string) {
    if (!currentClass.value) return
    
    let res
    if (recordId) {
      res = await api.delete(`/evaluations/${recordId}`)
    } else {
      res = await api.delete(`/evaluations/latest?classId=${currentClass.value.id}`)
    }
    await loadStudents()
    return res.data
  }

  // ---------- 工具函数 ----------
  function getDisplayLevel(student: Student): number {
    return calculateLevel(student.pet_exp)
  }

  // ---------- 监听班级变化 ----------
  watch(currentClass, (cls) => {
    if (cls) {
      loadStudents()
    } else {
      students.value = []
    }
  }, { immediate: false })

  return {
    // 状态
    students,
    isLoading,
    
    // 数据加载
    loadStudents,
    
    // CRUD
    addStudent,
    updateStudent,
    deleteStudent,
    batchDeleteStudents,
    importStudents,
    
    // 宠物
    changePet,
    
    // 转班
    transferStudent,
    batchTransferStudents,
    
    // 评价
    addEvaluation,
    batchEvaluate,
    undoEvaluation,
    
    // 工具
    getDisplayLevel
  }
}