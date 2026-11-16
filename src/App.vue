<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  BookUser,
  CheckCircle2,
  Plus,
  Search,
  Star,
  Users,
  X,
} from 'lucide-vue-next'
import ContactCard from './components/ContactCard.vue'
import ContactForm from './components/ContactForm.vue'
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue'
import ExcelActions from './components/ExcelActions.vue'
import { useContacts } from './composables/useContacts'
import type { ContactDraft } from './services/contactService'
import type { Contact } from './types/contact'

const {
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
} = useContacts()

const isFormOpen = ref(false)
const editingContact = ref<Contact | null>(null)
const pendingDeletion = ref<Contact | null>(null)

function openCreateForm(): void {
  editingContact.value = null
  isFormOpen.value = true
}

function openEditForm(contact: Contact): void {
  editingContact.value = contact
  isFormOpen.value = true
}

function closeForm(): void {
  isFormOpen.value = false
  editingContact.value = null
}

function saveContact(draft: ContactDraft): void {
  const saved = editingContact.value
    ? editContact(editingContact.value.id, draft)
    : addContact(draft)

  if (saved) {
    closeForm()
  }
}

function confirmDeletion(): void {
  if (pendingDeletion.value && removeContact(pendingDeletion.value)) {
    pendingDeletion.value = null
  }
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return
  }

  if (pendingDeletion.value) {
    pendingDeletion.value = null
  } else if (isFormOpen.value) {
    closeForm()
  }
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="#main-content" aria-label="PairBook 通讯录首页">
        <span class="brand__mark" aria-hidden="true">
          <BookUser :size="22" />
        </span>
        <span>
          <strong>PairBook</strong>
          <small>轻量通讯录</small>
        </span>
      </a>
      <p class="site-header__status">
        <span aria-hidden="true"></span>
        数据仅保存在当前浏览器
      </p>
    </header>

    <main id="main-content">
      <section class="hero-panel" aria-labelledby="page-title">
        <div class="hero-panel__content">
          <span class="hero-panel__eyebrow">Your people, thoughtfully organized</span>
          <h1 id="page-title">把重要的人，放在随手可及的地方。</h1>
          <p>简单记录、快速搜索，在本地安心管理每一段联系。</p>
        </div>
        <div class="hero-panel__summary" aria-label="联系人统计">
          <div>
            <span class="summary-icon summary-icon--contacts" aria-hidden="true">
              <Users :size="19" />
            </span>
            <p><strong>{{ contacts.length }}</strong><small>全部联系人</small></p>
          </div>
          <div>
            <span class="summary-icon summary-icon--favorites" aria-hidden="true">
              <Star :size="19" />
            </span>
            <p><strong>{{ favoriteCount }}</strong><small>已收藏</small></p>
          </div>
        </div>
      </section>

      <section class="workspace" aria-labelledby="contacts-title">
        <div class="workspace__heading">
          <div>
            <span class="section-kicker">Contacts</span>
            <h2 id="contacts-title">我的联系人</h2>
          </div>
          <button type="button" class="button button--primary" @click="openCreateForm">
            <Plus :size="18" aria-hidden="true" />
            新建联系人
          </button>
        </div>

        <div class="excel-panel">
          <div>
            <strong>Excel 数据交换</strong>
            <span>导入、备份或下载标准模板</span>
          </div>
          <ExcelActions :contacts="contacts" @apply="applyImportedContacts" />
        </div>

        <div class="toolbar">
          <label class="search-field">
            <span class="visually-hidden">搜索联系人</span>
            <Search :size="19" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索姓名、公司或联系方式"
              autocomplete="off"
            />
          </label>
          <button
            type="button"
            class="filter-button"
            :class="{ 'is-active': favoritesOnly }"
            :aria-pressed="favoritesOnly"
            @click="favoritesOnly = !favoritesOnly"
          >
            <Star :size="17" :fill="favoritesOnly ? 'currentColor' : 'none'" aria-hidden="true" />
            仅看收藏
            <span>{{ favoriteCount }}</span>
          </button>
        </div>

        <div
          v-if="feedback"
          class="feedback"
          :class="`feedback--${feedback.kind}`"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 v-if="feedback.kind === 'success'" :size="19" aria-hidden="true" />
          <span v-else class="feedback__error-mark" aria-hidden="true">!</span>
          <p>{{ feedback.text }}</p>
          <button type="button" aria-label="关闭提示" @click="clearFeedback">
            <X :size="17" aria-hidden="true" />
          </button>
        </div>

        <div v-if="filteredContacts.length" class="contact-grid">
          <ContactCard
            v-for="contact in filteredContacts"
            :key="contact.id"
            :contact="contact"
            @edit="openEditForm"
            @remove="pendingDeletion = $event"
            @toggle-favorite="toggleFavorite"
          />
        </div>

        <section v-else-if="contacts.length === 0" class="empty-state">
          <div class="empty-state__illustration" aria-hidden="true">
            <BookUser :size="34" />
            <span>+</span>
          </div>
          <h3>通讯录还是空的</h3>
          <p>添加第一位联系人，开始建立你的专属联系网络。</p>
          <button type="button" class="button button--primary" @click="openCreateForm">
            <Plus :size="18" aria-hidden="true" />
            添加第一位联系人
          </button>
        </section>

        <section v-else class="empty-state empty-state--compact">
          <div class="empty-state__illustration" aria-hidden="true">
            <Search :size="32" />
          </div>
          <h3>没有找到符合条件的联系人</h3>
          <p>试试其他关键词，或关闭“仅看收藏”筛选。</p>
          <button
            type="button"
            class="button button--secondary"
            @click="searchQuery = ''; favoritesOnly = false"
          >
            清除筛选
          </button>
        </section>
      </section>
    </main>

    <footer class="site-footer">
      <span>PairBook · EE308 Extreme Programming</span>
      <span>Local-first · No account required</span>
    </footer>

    <ContactForm
      v-if="isFormOpen"
      :contact="editingContact"
      @save="saveContact"
      @cancel="closeForm"
    />

    <DeleteConfirmDialog
      v-if="pendingDeletion"
      :contact="pendingDeletion"
      @confirm="confirmDeletion"
      @cancel="pendingDeletion = null"
    />
  </div>
</template>
