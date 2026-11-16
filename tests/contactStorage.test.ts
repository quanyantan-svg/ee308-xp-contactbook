import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONTACTS_STORAGE_KEY,
  loadContacts,
  saveContacts,
} from '../src/services/contactStorage'
import type { Contact } from '../src/types/contact'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const contact: Contact = {
  id: 'contact-1',
  name: '林晓',
  company: '星河科技',
  note: '',
  favorite: true,
  methods: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('contactStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('returns an empty list for first use', () => {
    expect(loadContacts(storage)).toEqual({ contacts: [], error: null })
  })

  it('round-trips valid contacts', () => {
    saveContacts(storage, [contact])

    const result = loadContacts(storage)
    expect(result).toEqual({ contacts: [contact], error: null })
    expect(result.contacts).not.toBe([contact])
  })

  it('safely rejects malformed JSON without overwriting it', () => {
    storage.setItem(CONTACTS_STORAGE_KEY, '{broken')

    const result = loadContacts(storage)
    expect(result.contacts).toEqual([])
    expect(result.error).toContain('无法读取')
    expect(storage.getItem(CONTACTS_STORAGE_KEY)).toBe('{broken')
  })

  it('rejects structurally invalid and duplicate contact data', () => {
    storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify([{ name: '缺少字段' }]))
    expect(loadContacts(storage).error).toContain('格式不正确')

    storage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify([contact, contact]))
    expect(loadContacts(storage).error).toContain('重复标识')
  })

  it('reports storage write failures with a user-facing error', () => {
    const failingStorage = new MemoryStorage()
    failingStorage.setItem = () => {
      throw new Error('quota exceeded')
    }

    expect(() => saveContacts(failingStorage, [contact])).toThrow(
      '保存失败，请检查浏览器存储空间或隐私设置后重试',
    )
  })
})
