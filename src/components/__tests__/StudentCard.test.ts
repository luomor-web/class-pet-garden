import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StudentCard from '@/components/StudentCard.vue'
import type { Student } from '@/types'

// Mock PetImage component
const PetImage = {
  template: '<div class="pet-image-mock"><img :src="src" /></div>',
  props: ['src']
}

describe('StudentCard', () => {
  const mockStudent: Student = {
    id: '1',
    class_id: 'class-1',
    name: '张三',
    student_no: '001',
    total_points: 100,
    pet_type: 'cat',
    pet_level: 3,
    pet_exp: 100
  }

  it('renders student name', () => {
    const wrapper = mount(StudentCard, {
      props: { student: mockStudent },
      global: {
        components: { PetImage }
      }
    })

    expect(wrapper.text()).toContain('张三')
  })

  it('shows total points', () => {
    const wrapper = mount(StudentCard, {
      props: { student: mockStudent },
      global: {
        components: { PetImage }
      }
    })

    expect(wrapper.text()).toContain('100')
  })

  it('shows selected state', () => {
    const wrapper = mount(StudentCard, {
      props: {
        student: mockStudent,
        isSelected: true
      },
      global: {
        components: { PetImage }
      }
    })

    expect(wrapper.classes().some(c => c.includes('ring-purple'))).toBe(true)
  })

  it('shows delete selected state', () => {
    const wrapper = mount(StudentCard, {
      props: {
        student: mockStudent,
        isDeleteMode: true,
        isDeleteSelected: true
      },
      global: {
        components: { PetImage }
      }
    })

    expect(wrapper.classes().some(c => c.includes('ring-red'))).toBe(true)
  })

  it('emits click event', async () => {
    const wrapper = mount(StudentCard, {
      props: { student: mockStudent },
      global: {
        components: { PetImage }
      }
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('shows score animation when provided', () => {
    const wrapper = mount(StudentCard, {
      props: {
        student: mockStudent,
        scoreAnimation: { points: 5, show: true }
      },
      global: {
        components: { PetImage }
      }
    })

    expect(wrapper.text()).toContain('+5')
  })
})