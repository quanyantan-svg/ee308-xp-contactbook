import type { Contact, ContactMethod } from '../types/contact'

export interface ContactDraft {
  name: string
  company: string
  note: string
  favorite: boolean
  methods: ContactMethod[]
}

interface ContactFactoryOptions {
  createId?: () => string
  now?: () => string
}

const defaultCreateId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
const defaultNow = (): string => new Date().toISOString()

function normalizeDraft(draft: ContactDraft): ContactDraft {
  return {
    name: draft.name.trim(),
    company: draft.company.trim(),
    note: draft.note.trim(),
    favorite: draft.favorite,
    methods: draft.methods.map((method) => ({ ...method })),
  }
}

function assertValidDraft(draft: ContactDraft): void {
  if (!draft.name.trim()) {
    throw new Error('联系人姓名不能为空')
  }
}

export function createContact(
  draft: ContactDraft,
  options: ContactFactoryOptions = {},
): Contact {
  assertValidDraft(draft)
  const normalizedDraft = normalizeDraft(draft)
  const timestamp = (options.now ?? defaultNow)()

  return {
    ...normalizedDraft,
    id: (options.createId ?? defaultCreateId)(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function updateContact(
  contacts: readonly Contact[],
  id: string,
  draft: ContactDraft,
  now: () => string = defaultNow,
): Contact[] {
  assertValidDraft(draft)
  const existingContact = contacts.find((contact) => contact.id === id)

  if (!existingContact) {
    throw new Error('找不到要编辑的联系人')
  }

  const normalizedDraft = normalizeDraft(draft)

  return contacts.map((contact) =>
    contact.id === id
      ? {
          ...contact,
          ...normalizedDraft,
          id: contact.id,
          createdAt: contact.createdAt,
          updatedAt: now(),
        }
      : contact,
  )
}

export function deleteContact(
  contacts: readonly Contact[],
  id: string,
): Contact[] {
  return contacts.filter((contact) => contact.id !== id)
}

export function toggleContactFavorite(
  contacts: readonly Contact[],
  id: string,
  now: () => string = defaultNow,
): Contact[] {
  const existingContact = contacts.find((contact) => contact.id === id)

  if (!existingContact) {
    throw new Error('找不到要收藏的联系人')
  }

  return contacts.map((contact) =>
    contact.id === id
      ? {
          ...contact,
          favorite: !contact.favorite,
          updatedAt: now(),
        }
      : contact,
  )
}

export function filterContacts(
  contacts: readonly Contact[],
  query: string,
  favoritesOnly: boolean,
): Contact[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  return contacts.filter((contact) => {
    if (favoritesOnly && !contact.favorite) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const searchableValues = [
      contact.name,
      contact.company,
      ...contact.methods.flatMap((method) => [method.label, method.value]),
    ]

    return searchableValues.some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    )
  })
}
