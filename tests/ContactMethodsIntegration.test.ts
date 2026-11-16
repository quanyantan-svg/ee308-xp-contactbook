// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App.vue'
import ContactForm from '../src/components/ContactForm.vue'
import {
  createContactsWorkbook,
  parseContactsWorkbook,
} from '../src/services/contactExcel'
import { CONTACTS_STORAGE_KEY } from '../src/services/contactStorage'
import type { Contact, ContactMethod, ContactMethodType } from '../src/types/contact'

const methods: ContactMethod[] = [
  {
    id: 'method-phone-1',
    type: 'phone',
    label: '工作手机',
    value: '138 0013 8000',
  },
  {
    id: 'method-phone-2',
    type: 'phone',
    label: '备用电话',
    value: '020-8888-6666',
  },
  {
    id: 'method-email-1',
    type: 'email',
    label: '个人邮箱',
    value: 'lin@example.com',
  },
]

const existingContact: Contact = {
  id: 'contact-1',
  name: '林晓',
  company: '星河科技',
  note: '集成测试联系人',
  favorite: true,
  methods,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

async function addMethod(
  wrapper: VueWrapper,
  type: ContactMethodType,
  label: string,
  value: string,
): Promise<void> {
  await wrapper.get('[data-testid="new-type"]').setValue(type)
  await wrapper.get('[data-testid="new-label"]').setValue(label)
  await wrapper.get('[data-testid="new-value"]').setValue(value)
  await wrapper.get('[data-testid="new-form"]').trigger('submit')
}

function storedContacts(): Contact[] {
  return JSON.parse(localStorage.getItem(CONTACTS_STORAGE_KEY) ?? '[]') as Contact[]
}

describe('contact methods integration', () => {
  const mountedApps: VueWrapper[] = []

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    mountedApps.splice(0).forEach((wrapper) => wrapper.unmount())
    localStorage.clear()
  })

  it('adds two phones and one email, then submits them without child forms submitting the contact', async () => {
    const wrapper = mount(ContactForm, { props: { contact: null } })
    await wrapper.get('#contact-name').setValue('林晓')

    await addMethod(wrapper, 'phone', '工作手机', '138 0013 8000')
    expect(wrapper.emitted('save')).toBeUndefined()
    await addMethod(wrapper, 'phone', '备用电话', '020-8888-6666')
    expect(wrapper.emitted('save')).toBeUndefined()
    await addMethod(wrapper, 'email', '个人邮箱', 'lin@example.com')
    expect(wrapper.emitted('save')).toBeUndefined()

    expect(wrapper.findAll('[data-testid="method-item"]')).toHaveLength(3)
    expect(wrapper.get('[data-testid="contact-save"]').attributes('form')).toBe(
      'contact-core-form',
    )
    await wrapper.get('[data-testid="contact-core-form"]').trigger('submit')

    const savedDraft = wrapper.emitted('save')?.[0]?.[0] as
      | { methods: ContactMethod[] }
      | undefined
    expect(savedDraft?.methods).toMatchObject([
      { type: 'phone', label: '工作手机', value: '138 0013 8000' },
      { type: 'phone', label: '备用电话', value: '020-8888-6666' },
      { type: 'email', label: '个人邮箱', value: 'lin@example.com' },
    ])
    expect(new Set(savedDraft?.methods.map((method) => method.id)).size).toBe(3)
    wrapper.unmount()
  })

  it('refills, edits and deletes methods while preserving ids and relative order', async () => {
    const wrapper = mount(ContactForm, { props: { contact: existingContact } })
    expect(wrapper.findAll('[data-testid="method-item"]')).toHaveLength(3)

    await wrapper.findAll('[data-testid="edit-button"]')[1]!.trigger('click')
    await wrapper.get('[data-testid="edit-label"]').setValue('家庭电话')
    await wrapper.get('[data-testid="edit-value"]').setValue('010-1234-5678')
    await wrapper.get('[data-testid="edit-form"]').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()

    await wrapper.get('[data-testid="contact-core-form"]').trigger('submit')
    const edited = wrapper.emitted('save')?.[0]?.[0] as
      | { methods: ContactMethod[] }
      | undefined
    expect(edited?.methods.map((method) => method.id)).toEqual([
      'method-phone-1',
      'method-phone-2',
      'method-email-1',
    ])
    expect(edited?.methods[1]).toMatchObject({
      id: 'method-phone-2',
      label: '家庭电话',
      value: '010-1234-5678',
    })
    expect(existingContact.methods[1]?.label).toBe('备用电话')

    const deleteWrapper = mount(ContactForm, { props: { contact: existingContact } })
    await deleteWrapper.findAll('[data-testid="delete-button"]')[1]!.trigger('click')
    expect(deleteWrapper.emitted('save')).toBeUndefined()
    await deleteWrapper.get('[data-testid="contact-core-form"]').trigger('submit')
    const afterDelete = deleteWrapper.emitted('save')?.[0]?.[0] as
      | { methods: ContactMethod[] }
      | undefined
    expect(afterDelete?.methods).toEqual([methods[0], methods[2]])

    wrapper.unmount()
    deleteWrapper.unmount()
  })

  it('rejects invalid email and phone drafts and blocks overall save while a draft is unconfirmed', async () => {
    const wrapper = mount(ContactForm, { props: { contact: null } })
    await wrapper.get('#contact-name').setValue('错误示例')

    await addMethod(wrapper, 'email', '邮箱', 'not-an-email')
    expect(wrapper.find('[data-testid="method-item"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('有效的邮箱地址')

    await addMethod(wrapper, 'phone', '手机', '123')
    expect(wrapper.find('[data-testid="method-item"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('至少包含 7 位数字')

    await wrapper.get('[data-testid="contact-core-form"]').trigger('submit')
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.text()).toContain('请先在联系方式区域点击')
    wrapper.unmount()
  })

  it('blocks overall save while an existing method edit remains unconfirmed', async () => {
    const wrapper = mount(ContactForm, { props: { contact: existingContact } })
    await wrapper.findAll('[data-testid="edit-button"]')[0]!.trigger('click')
    await wrapper.get('[data-testid="edit-value"]').setValue('139 0013 9000')

    await wrapper.get('[data-testid="contact-core-form"]').trigger('submit')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.text()).toContain('请先在联系方式区域点击')
    expect(existingContact.methods[0]?.value).toBe('138 0013 8000')
    wrapper.unmount()
  })

  it('cancels the entire contact edit without changing localStorage', async () => {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify([existingContact]))
    const before = localStorage.getItem(CONTACTS_STORAGE_KEY)
    const wrapper = mount(App)
    mountedApps.push(wrapper)

    const editButton = wrapper.findAll('button').find((button) => button.text().includes('编辑'))
    await editButton!.trigger('click')
    const form = wrapper.getComponent(ContactForm)
    await form.get('#contact-name').setValue('不会保存的姓名')
    await form.findAll('[data-testid="delete-button"]')[0]!.trigger('click')
    await form.get('.contact-form__actions .button--secondary').trigger('click')

    expect(localStorage.getItem(CONTACTS_STORAGE_KEY)).toBe(before)
    expect(wrapper.findComponent(ContactForm).exists()).toBe(false)
  })

  it('persists methods on save and restores all of them after remounting', async () => {
    const wrapper = mount(App)
    mountedApps.push(wrapper)
    const createButton = wrapper.findAll('button').find((button) =>
      button.text().includes('新建联系人'),
    )
    await createButton!.trigger('click')
    const form = wrapper.getComponent(ContactForm)
    await form.get('#contact-name').setValue('林晓')
    await addMethod(form, 'phone', '工作手机', '138 0013 8000')
    await addMethod(form, 'phone', '备用电话', '020-8888-6666')
    await addMethod(form, 'email', '个人邮箱', 'lin@example.com')
    await form.get('[data-testid="contact-core-form"]').trigger('submit')

    expect(storedContacts()[0]?.methods).toMatchObject([
      { type: 'phone', label: '工作手机' },
      { type: 'phone', label: '备用电话' },
      { type: 'email', label: '个人邮箱' },
    ])

    wrapper.unmount()
    mountedApps.splice(mountedApps.indexOf(wrapper), 1)
    const restoredWrapper = mount(App)
    mountedApps.push(restoredWrapper)
    expect(restoredWrapper.text()).toContain('138 0013 8000')
    expect(restoredWrapper.text()).toContain('lin@example.com')

    const editButton = restoredWrapper.findAll('button').find((button) =>
      button.text().includes('编辑'),
    )
    await editButton!.trigger('click')
    expect(
      restoredWrapper.getComponent(ContactForm).findAll('[data-testid="method-item"]'),
    ).toHaveLength(3)
  })

  it('round-trips every integrated method through Excel', async () => {
    const preview = await parseContactsWorkbook(
      await createContactsWorkbook([existingContact]),
      [],
    )

    expect(preview.errors).toEqual([])
    expect(preview.records[0]?.contact.methods).toEqual(methods)
  })
})
