import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        show: true,
        title: '确认删除',
        message: '确定要删除吗？'
      }
    })

    expect(wrapper.text()).toContain('确认删除')
    expect(wrapper.text()).toContain('确定要删除吗？')
  })

  it('does not render when show is false', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        show: false,
        title: '确认删除',
        message: '确定要删除吗？'
      }
    })

    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
  })

  it('emits confirm when confirm button clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        show: true,
        title: '确认',
        message: '测试'
      }
    })

    await wrapper.find('button.bg-gradient-to-r').trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits cancel when cancel button clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        show: true,
        title: '确认',
        message: '测试'
      }
    })

    await wrapper.find('button.text-gray-500').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('shows danger type with red button', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        show: true,
        title: '删除',
        message: '确定删除？',
        type: 'danger'
      }
    })

    expect(wrapper.find('button.bg-gradient-to-r').classes().some(c => c.includes('red'))).toBe(true)
  })
})