import type {
  Contact,
  ContactMethod,
  ContactMethodType,
} from '../types/contact'

export const CONTACTS_STORAGE_KEY = 'pairbook.contacts.v1'

export interface LoadContactsResult {
  contacts: Contact[]
  error: string | null
}

const allowedMethodTypes: readonly ContactMethodType[] = [
  'phone',
  'email',
  'social',
  'address',
  'other',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isContactMethod(value: unknown): value is ContactMethod {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    allowedMethodTypes.includes(value.type as ContactMethodType) &&
    typeof value.label === 'string' &&
    typeof value.value === 'string'
  )
}

function isContact(value: unknown): value is Contact {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.company === 'string' &&
    typeof value.note === 'string' &&
    typeof value.favorite === 'boolean' &&
    Array.isArray(value.methods) &&
    value.methods.every(isContactMethod) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function cloneContacts(contacts: readonly Contact[]): Contact[] {
  return contacts.map((contact) => ({
    ...contact,
    methods: contact.methods.map((method) => ({ ...method })),
  }))
}

export function loadContacts(storage: Storage): LoadContactsResult {
  try {
    const serializedContacts = storage.getItem(CONTACTS_STORAGE_KEY)

    if (serializedContacts === null) {
      return { contacts: [], error: null }
    }

    const parsedContacts: unknown = JSON.parse(serializedContacts)

    if (!Array.isArray(parsedContacts) || !parsedContacts.every(isContact)) {
      return {
        contacts: [],
        error: '本地联系人数据格式不正确，已进入安全空白状态。原数据未被覆盖。',
      }
    }

    const ids = new Set(parsedContacts.map((contact) => contact.id))
    if (ids.size !== parsedContacts.length) {
      return {
        contacts: [],
        error: '本地联系人存在重复标识，已进入安全空白状态。原数据未被覆盖。',
      }
    }

    return { contacts: cloneContacts(parsedContacts), error: null }
  } catch {
    return {
      contacts: [],
      error: '无法读取本地联系人数据，已进入安全空白状态。原数据未被覆盖。',
    }
  }
}

export function saveContacts(
  storage: Storage,
  contacts: readonly Contact[],
): void {
  try {
    storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts))
  } catch {
    throw new Error('保存失败，请检查浏览器存储空间或隐私设置后重试')
  }
}
