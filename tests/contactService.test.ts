import { describe, expect, it } from 'vitest'
import {
  createContact,
  deleteContact,
  filterContacts,
  toggleContactFavorite,
  updateContact,
  type ContactDraft,
} from '../src/services/contactService'
import type { Contact } from '../src/types/contact'

const baseDraft: ContactDraft = {
  name: ' 林晓 ',
  company: ' 星河科技 ',
  note: ' 下周回访 ',
  favorite: false,
  methods: [],
}

const existingContact: Contact = {
  id: 'contact-1',
  name: '林晓',
  company: '星河科技',
  note: '下周回访',
  favorite: false,
  methods: [
    {
      id: 'method-1',
      type: 'email',
      label: '工作邮箱',
      value: 'lin@example.com',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('contactService', () => {
  it('creates a normalized contact with stable metadata', () => {
    const contact = createContact(baseDraft, {
      createId: () => 'contact-new',
      now: () => '2026-02-01T00:00:00.000Z',
    })

    expect(contact).toEqual({
      id: 'contact-new',
      name: '林晓',
      company: '星河科技',
      note: '下周回访',
      favorite: false,
      methods: [],
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    })
  })

  it('rejects a blank name', () => {
    expect(() =>
      createContact({ ...baseDraft, name: '   ' }, { createId: () => 'unused' }),
    ).toThrow('联系人姓名不能为空')
  })

  it('updates one contact while preserving its id and creation time', () => {
    const contacts = [existingContact]
    const updated = updateContact(
      contacts,
      existingContact.id,
      {
        ...baseDraft,
        name: '林晓然',
        favorite: true,
        methods: existingContact.methods,
      },
      () => '2026-03-01T00:00:00.000Z',
    )

    expect(updated[0]).toMatchObject({
      id: 'contact-1',
      name: '林晓然',
      favorite: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    })
    expect(updated).not.toBe(contacts)
    expect(updated[0]).not.toBe(existingContact)
    expect(updated[0]?.methods[0]).not.toBe(existingContact.methods[0])
  })

  it('deletes only the requested contact', () => {
    const secondContact = { ...existingContact, id: 'contact-2', name: '周宁' }

    expect(deleteContact([existingContact, secondContact], 'contact-1')).toEqual([
      secondContact,
    ])
  })

  it('toggles favorite without mutating the original contact', () => {
    const updated = toggleContactFavorite(
      [existingContact],
      existingContact.id,
      () => '2026-04-01T00:00:00.000Z',
    )

    expect(updated[0]?.favorite).toBe(true)
    expect(updated[0]?.updatedAt).toBe('2026-04-01T00:00:00.000Z')
    expect(existingContact.favorite).toBe(false)
  })

  it('searches name, company, method label and value case-insensitively', () => {
    const contacts = [
      existingContact,
      { ...existingContact, id: 'contact-2', name: 'Alex', company: 'Northwind' },
    ]

    expect(filterContacts(contacts, '  northWIND ', false)).toHaveLength(1)
    expect(filterContacts(contacts, '工作邮箱', false)).toEqual(contacts)
    expect(filterContacts(contacts, 'LIN@EXAMPLE.COM', false)).toEqual(contacts)
  })

  it('combines favorite filtering with search', () => {
    const favoriteContact = {
      ...existingContact,
      id: 'contact-2',
      name: '周宁',
      favorite: true,
    }

    expect(
      filterContacts([existingContact, favoriteContact], '周', true),
    ).toEqual([favoriteContact])
    expect(filterContacts([existingContact, favoriteContact], '林', true)).toEqual([])
  })
})
