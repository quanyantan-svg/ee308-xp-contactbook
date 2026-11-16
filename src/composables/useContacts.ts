import { computed, ref } from 'vue'
import {
  createContact,
  deleteContact,
  filterContacts,
  toggleContactFavorite,
  updateContact,
  type ContactDraft,
} from '../services/contactService'
import { loadContacts, saveContacts } from '../services/contactStorage'
import type { ApplyImportResult } from '../services/contactExcel'
import type { Contact } from '../types/contact'

export type FeedbackKind = 'success' | 'error'

export interface FeedbackMessage {
  kind: FeedbackKind
  text: string
}

export function useContacts() {
  const contacts = ref<Contact[]>([])
  const searchQuery = ref('')
  const favoritesOnly = ref(false)
  const feedback = ref<FeedbackMessage | null>(null)
  const storage = ref<Storage | null>(null)

  const filteredContacts = computed(() =>
    filterContacts(contacts.value, searchQuery.value, favoritesOnly.value),
  )

  const favoriteCount = computed(
    () => contacts.value.filter((contact) => contact.favorite).length,
  )

  function showFeedback(kind: FeedbackKind, text: string): void {
    feedback.value = { kind, text }
  }

  function clearFeedback(): void {
    feedback.value = null
  }

  function initialize(): void {
    try {
      storage.value = window.localStorage
      const result = loadContacts(storage.value)
      contacts.value = result.contacts

      if (result.error) {
        showFeedback('error', result.error)
      }
    } catch {
      storage.value = null
      contacts.value = []
      showFeedback('error', '浏览器禁止访问本地存储，本次修改将无法保存。')
    }
  }

  function persist(nextContacts: Contact[], successMessage: string): boolean {
    if (!storage.value) {
      showFeedback('error', '无法访问本地存储，本次修改未保存。')
      return false
    }

    try {
      saveContacts(storage.value, nextContacts)
      contacts.value = nextContacts
      showFeedback('success', successMessage)
      return true
    } catch (error) {
      showFeedback(
        'error',
        error instanceof Error ? error.message : '保存失败，请稍后重试',
      )
      return false
    }
  }

  function addContact(draft: ContactDraft): boolean {
    try {
      const contact = createContact(draft)
      return persist([contact, ...contacts.value], `已添加联系人“${contact.name}”`)
    } catch (error) {
      showFeedback(
        'error',
        error instanceof Error ? error.message : '无法添加联系人',
      )
      return false
    }
  }

  function editContact(id: string, draft: ContactDraft): boolean {
    try {
      const nextContacts = updateContact(contacts.value, id, draft)
      return persist(nextContacts, `已保存联系人“${draft.name.trim()}”`)
    } catch (error) {
      showFeedback(
        'error',
        error instanceof Error ? error.message : '无法编辑联系人',
      )
      return false
    }
  }

  function removeContact(contact: Contact): boolean {
    return persist(
      deleteContact(contacts.value, contact.id),
      `已删除联系人“${contact.name}”`,
    )
  }

  function toggleFavorite(contact: Contact): boolean {
    try {
      const nextContacts = toggleContactFavorite(contacts.value, contact.id)
      const action = contact.favorite ? '取消收藏' : '收藏'
      return persist(nextContacts, `已${action}“${contact.name}”`)
    } catch (error) {
      showFeedback(
        'error',
        error instanceof Error ? error.message : '无法更新收藏状态',
      )
      return false
    }
  }

  function applyImportedContacts(result: ApplyImportResult): boolean {
    const appliedCount = result.addedCount + result.replacedCount
    return persist(
      result.contacts,
      `导入完成：应用 ${appliedCount} 条，跳过 ${result.skippedCount} 条冲突记录`,
    )
  }

  initialize()

  return {
    contacts,
    searchQuery,
    favoritesOnly,
    feedback,
    filteredContacts,
    favoriteCount,
    addContact,
    editContact,
    removeContact,
    toggleFavorite,
    applyImportedContacts,
    clearFeedback,
  }
}
