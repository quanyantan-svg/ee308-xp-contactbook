// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContactMethodsEditor from '../src/components/ContactMethodsEditor.vue'
import type { ContactMethod } from '../src/types/contact'

function createMethod(overrides: Partial<ContactMethod> = {}): ContactMethod {
  return {
    id: 'method-1',
    type: 'phone',
    label: '工作手机',
    value: '138 0013 8000',
    ...overrides,
  }
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((item) => deepFreeze(item))
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      deepFreeze(item),
    )
  }
  return Object.freeze(value)
}

function mountEditor(
  modelValue: ContactMethod[],
  disabled = false,
) {
  return mount(ContactMethodsEditor, {
    props: { modelValue, disabled },
  })
}

describe('ContactMethodsEditor', () => {
  it('renders existing methods in order with complete field values', () => {
    const methods = [
      createMethod(),
      createMethod({
        id: 'method-2',
        type: 'email',
        label: '个人邮箱',
        value: 'me@example.com',
      }),
    ]
    const wrapper = mountEditor(methods)

    const items = wrapper.findAll('[data-testid="method-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('工作手机')
    expect(items[0].text()).toContain('138 0013 8000')
    expect(items[0].text()).toContain('电话')
    expect(items[1].text()).toContain('个人邮箱')
    expect(items[1].text()).toContain('me@example.com')
    expect(items[1].text()).toContain('邮箱')

    const renderedText = items[0].text() + items[1].text()
    expect(renderedText.indexOf('工作手机')).toBeLessThan(
      renderedText.indexOf('个人邮箱'),
    )
  })

  it('adds a method through a fresh array without mutating props', async () => {
    const methods = deepFreeze([createMethod()])
    const wrapper = mountEditor(methods)

    await wrapper.find('[data-testid="new-type"]').setValue('email')
    await wrapper.find('[data-testid="new-label"]').setValue('  个人邮箱  ')
    await wrapper.find('[data-testid="new-value"]').setValue('  me@example.com  ')
    await wrapper.find('[data-testid="new-form"]').trigger('submit')

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions).toHaveLength(1)

    const payload = emissions![0][0] as ContactMethod[]
    expect(payload).not.toBe(methods)
    expect(payload).toHaveLength(2)
    expect(payload[0]).toBe(methods[0])
    expect(payload[1]).toMatchObject({
      type: 'email',
      label: '个人邮箱',
      value: 'me@example.com',
    })
    expect(payload[1].id).toBeTruthy()
    expect(payload[1].id).not.toBe(methods[0].id)
    expect(methods).toHaveLength(1)

    expect(
      (wrapper.find('[data-testid="new-label"]').element as HTMLInputElement)
        .value,
    ).toBe('')
    expect(
      (wrapper.find('[data-testid="new-value"]').element as HTMLInputElement)
        .value,
    ).toBe('')
  })

  it('generates distinct ids for repeated additions of the same type', async () => {
    const wrapper = mountEditor([])

    const addPhone = async (label: string, value: string) => {
      await wrapper.find('[data-testid="new-label"]').setValue(label)
      await wrapper.find('[data-testid="new-value"]').setValue(value)
      await wrapper.find('[data-testid="new-form"]').trigger('submit')
    }

    await addPhone('公司电话', '020-8888-6666')

    const first = wrapper.emitted('update:modelValue')![0][0] as ContactMethod[]
    expect(first).toHaveLength(1)
    await wrapper.setProps({ modelValue: first })

    await addPhone('备用电话', '139 0013 9000')

    const latest = wrapper.emitted('update:modelValue')![1][0] as ContactMethod[]
    expect(latest).toHaveLength(2)
    expect(latest.every((method) => method.type === 'phone')).toBe(true)
    expect(latest[0].id).not.toBe(latest[1].id)
  })

  it('shows field errors on blur and clears them once corrected', async () => {
    const wrapper = mountEditor([createMethod()])
    const label = wrapper.find('[data-testid="new-label"]')

    await label.setValue('   ')
    await label.trigger('blur')
    expect(wrapper.text()).toContain('标签不能为空')

    await label.setValue('备用手机')
    expect(wrapper.text()).not.toContain('标签不能为空')
  })

  it('rejects invalid input without emitting an update', async () => {
    const wrapper = mountEditor([])

    await wrapper.find('[data-testid="new-type"]').setValue('email')
    await wrapper.find('[data-testid="new-value"]').setValue('not-an-email')
    await wrapper.find('[data-testid="new-form"]').trigger('submit')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('标签不能为空')
    expect(wrapper.text()).toContain('有效的邮箱地址')
  })

  it('fills the edit form with the selected method and keeps its id on save', async () => {
    const methods = deepFreeze([
      createMethod(),
      createMethod({
        id: 'method-2',
        type: 'email',
        label: '个人邮箱',
        value: 'me@example.com',
      }),
    ])
    const wrapper = mountEditor(methods)

    await wrapper.findAll('[data-testid="edit-button"]')[1].trigger('click')

    const type = wrapper.find('[data-testid="edit-type"]')
      .element as HTMLSelectElement
    const label = wrapper.find('[data-testid="edit-label"]')
      .element as HTMLInputElement
    const value = wrapper.find('[data-testid="edit-value"]')
      .element as HTMLInputElement
    expect(type.value).toBe('email')
    expect(label.value).toBe('个人邮箱')
    expect(value.value).toBe('me@example.com')

    await wrapper.find('[data-testid="edit-label"]').setValue('备用邮箱')
    await wrapper.find('[data-testid="edit-value"]').setValue('alt@example.com')
    await wrapper.find('[data-testid="edit-form"]').trigger('submit')

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions).toHaveLength(1)

    const payload = emissions![0][0] as ContactMethod[]
    expect(payload).toHaveLength(2)
    expect(payload[0]).toBe(methods[0])
    expect(payload[1]).not.toBe(methods[1])
    expect(payload[1].id).toBe('method-2')
    expect(payload[1]).toMatchObject({
      type: 'email',
      label: '备用邮箱',
      value: 'alt@example.com',
    })
    expect(methods[1].label).toBe('个人邮箱')
  })

  it('keeps unsaved edits out of the emitted list until saving', async () => {
    const wrapper = mountEditor([createMethod()])

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await wrapper.find('[data-testid="edit-label"]').setValue('临时标签')
    await wrapper.find('[data-testid="cancel-button"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('[data-testid="edit-form"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('工作手机')
    expect(wrapper.text()).not.toContain('临时标签')
  })

  it('rejects an invalid edit and keeps the original entry unchanged', async () => {
    const methods = deepFreeze([
      createMethod({
        id: 'method-2',
        type: 'email',
        label: '个人邮箱',
        value: 'me@example.com',
      }),
    ])
    const wrapper = mountEditor(methods)

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await wrapper.find('[data-testid="edit-value"]').setValue('invalid')
    await wrapper.find('[data-testid="edit-form"]').trigger('submit')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('有效的邮箱地址')
    expect(methods[0].value).toBe('me@example.com')
    expect(wrapper.find('[data-testid="edit-form"]').exists()).toBe(true)
  })

  it('deletes only the targeted method', async () => {
    const methods = deepFreeze([
      createMethod(),
      createMethod({
        id: 'method-2',
        type: 'email',
        label: '个人邮箱',
        value: 'me@example.com',
      }),
    ])
    const wrapper = mountEditor(methods)

    await wrapper.findAll('[data-testid="delete-button"]')[1].trigger('click')

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions).toHaveLength(1)

    const payload = emissions![0][0] as ContactMethod[]
    expect(payload).toHaveLength(1)
    expect(payload[0]).toBe(methods[0])
    expect(methods).toHaveLength(2)
  })

  it('disables every action and emits nothing while disabled', async () => {
    const wrapper = mountEditor([createMethod()], true)

    const editButton = wrapper.find('[data-testid="edit-button"]')
      .element as HTMLButtonElement
    const deleteButton = wrapper.find('[data-testid="delete-button"]')
      .element as HTMLButtonElement
    const addButton = wrapper.find('[data-testid="add-button"]')
      .element as HTMLButtonElement
    expect(editButton.disabled).toBe(true)
    expect(deleteButton.disabled).toBe(true)
    expect(addButton.disabled).toBe(true)
    expect(
      (wrapper.find('[data-testid="new-label"]').element as HTMLInputElement)
        .disabled,
    ).toBe(true)

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    await wrapper.find('[data-testid="delete-button"]').trigger('click')
    await wrapper.find('[data-testid="new-form"]').trigger('submit')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('shows an empty state when there are no methods', () => {
    const wrapper = mountEditor([])

    expect(wrapper.find('[data-testid="method-item"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无联系方式')
  })
})
