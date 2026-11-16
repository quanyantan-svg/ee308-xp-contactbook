// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContactForm from '../src/components/ContactForm.vue'
import type { Contact } from '../src/types/contact'

describe('ContactForm', () => {
  it('shows an inline error and does not save a blank name', async () => {
    const wrapper = mount(ContactForm, { props: { contact: null } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.get('[role="alert"]').text()).toBe('请输入联系人姓名')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('emits a normalized-compatible draft for a new contact', async () => {
    const wrapper = mount(ContactForm, { props: { contact: null } })

    await wrapper.get('#contact-name').setValue('林晓')
    await wrapper.get('#contact-company').setValue('星河科技')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      name: '林晓',
      company: '星河科技',
      favorite: false,
      methods: [],
    })
  })

  it('refills and preserves existing contact methods while editing', async () => {
    const contact: Contact = {
      id: 'contact-1',
      name: '林晓',
      company: '',
      note: '',
      favorite: true,
      methods: [
        {
          id: 'method-1',
          type: 'phone',
          label: '手机',
          value: '13800000000',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const wrapper = mount(ContactForm, { props: { contact } })

    expect((wrapper.get('#contact-name').element as HTMLInputElement).value).toBe('林晓')
    expect(wrapper.text()).toContain('完整保留 1 条联系方式')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      favorite: true,
      methods: contact.methods,
    })
    expect(wrapper.emitted('save')?.[0]?.[0]).not.toBe(contact)
  })
})
