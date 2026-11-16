<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Heart, X } from 'lucide-vue-next'
import type { Contact } from '../types/contact'
import type { ContactDraft } from '../services/contactService'

const props = defineProps<{
  contact: Contact | null
}>()

const emit = defineEmits<{
  save: [draft: ContactDraft]
  cancel: []
}>()

const nameError = ref('')
const draft = reactive<ContactDraft>({
  name: props.contact?.name ?? '',
  company: props.contact?.company ?? '',
  note: props.contact?.note ?? '',
  favorite: props.contact?.favorite ?? false,
  methods: props.contact?.methods.map((method) => ({ ...method })) ?? [],
})

const title = computed(() => (props.contact ? '编辑联系人' : '新建联系人'))

function submit(): void {
  nameError.value = draft.name.trim() ? '' : '请输入联系人姓名'

  if (nameError.value) {
    return
  }

  emit('save', {
    ...draft,
    methods: draft.methods.map((method) => ({ ...method })),
  })
}
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="$emit('cancel')">
    <section
      class="contact-form"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`contact-form-title`"
    >
      <header class="contact-form__header">
        <div>
          <span class="eyebrow">Contact details</span>
          <h2 id="contact-form-title">{{ title }}</h2>
        </div>
        <button type="button" class="close-button" aria-label="关闭表单" @click="$emit('cancel')">
          <X :size="20" aria-hidden="true" />
        </button>
      </header>

      <form novalidate @submit.prevent="submit">
        <div class="field">
          <label for="contact-name">姓名 <span aria-hidden="true">*</span></label>
          <input
            id="contact-name"
            v-model="draft.name"
            type="text"
            autocomplete="name"
            placeholder="例如：林晓"
            :aria-invalid="Boolean(nameError)"
            :aria-describedby="nameError ? 'contact-name-error' : undefined"
            autofocus
            @input="nameError = ''"
          />
          <p v-if="nameError" id="contact-name-error" class="field__error" role="alert">
            {{ nameError }}
          </p>
        </div>

        <div class="field">
          <label for="contact-company">公司或组织</label>
          <input
            id="contact-company"
            v-model="draft.company"
            type="text"
            autocomplete="organization"
            placeholder="选填"
          />
        </div>

        <div class="field">
          <label for="contact-note">备注</label>
          <textarea
            id="contact-note"
            v-model="draft.note"
            rows="4"
            placeholder="记录称呼、背景或下次联系事项"
          ></textarea>
        </div>

        <label class="favorite-field">
          <input v-model="draft.favorite" type="checkbox" />
          <span class="favorite-field__icon">
            <Heart :size="18" :fill="draft.favorite ? 'currentColor' : 'none'" aria-hidden="true" />
          </span>
          <span>
            <strong>设为收藏</strong>
            <small>在收藏筛选中快速找到这位联系人</small>
          </span>
        </label>

        <div v-if="draft.methods.length" class="preserved-methods">
          <strong>已有联系方式</strong>
          <p>本次编辑会完整保留 {{ draft.methods.length }} 条联系方式。</p>
        </div>

        <footer class="contact-form__actions">
          <button type="button" class="button button--secondary" @click="$emit('cancel')">
            取消
          </button>
          <button type="submit" class="button button--primary">
            {{ contact ? '保存修改' : '添加联系人' }}
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  overflow-y: auto;
  padding: 24px;
  place-items: center;
  background: rgb(18 35 30 / 55%);
  backdrop-filter: blur(5px);
}

.contact-form {
  width: min(100%, 560px);
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 65%);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: 0 28px 70px rgb(20 48 39 / 28%);
}

.contact-form__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px 22px;
  border-bottom: 1px solid var(--border-subtle);
}

.eyebrow {
  display: block;
  margin-bottom: 7px;
  color: var(--brand-strong);
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.contact-form h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.45rem;
}

.close-button {
  display: grid;
  width: 38px;
  height: 38px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 11px;
  color: var(--text-muted);
  background: var(--surface-muted);
  cursor: pointer;
}

.close-button:hover {
  color: var(--text-strong);
  background: var(--border-subtle);
}

form {
  display: grid;
  gap: 20px;
  padding: 26px 30px 30px;
}

.field {
  display: grid;
  gap: 8px;
}

.field label {
  color: var(--text-strong);
  font-size: 0.85rem;
  font-weight: 680;
}

.field label span {
  color: var(--danger);
}

.field input,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  outline: none;
  color: var(--text-strong);
  background: var(--surface);
  font: inherit;
  font-size: 0.93rem;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.field textarea {
  min-height: 104px;
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-ring);
}

.field input[aria-invalid='true'] {
  border-color: var(--danger);
}

.field__error {
  color: var(--danger);
  font-size: 0.8rem;
}

.favorite-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: var(--surface-muted);
  cursor: pointer;
}

.favorite-field input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
}

.favorite-field__icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 11px;
  color: var(--text-muted);
  background: var(--surface);
}

.favorite-field input:checked + .favorite-field__icon {
  color: #9d6900;
  background: #fff0b8;
}

.favorite-field input:focus-visible + .favorite-field__icon {
  outline: 3px solid var(--brand-ring);
  outline-offset: 2px;
}

.favorite-field strong,
.favorite-field small {
  display: block;
}

.favorite-field strong {
  color: var(--text-strong);
  font-size: 0.88rem;
}

.favorite-field small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 0.76rem;
}

.preserved-methods {
  padding: 12px 14px;
  border-left: 3px solid var(--brand);
  border-radius: 0 10px 10px 0;
  background: var(--brand-soft);
  font-size: 0.82rem;
}

.preserved-methods strong {
  color: var(--text-strong);
}

.preserved-methods p {
  margin: 3px 0 0;
  color: var(--text-muted);
}

.contact-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

@media (max-width: 560px) {
  .modal-backdrop {
    padding: 12px;
    place-items: end center;
  }

  .contact-form {
    max-height: calc(100svh - 24px);
    overflow-y: auto;
    border-radius: 20px;
  }

  .contact-form__header,
  form {
    padding-right: 20px;
    padding-left: 20px;
  }

  .contact-form__actions .button {
    flex: 1;
  }
}
</style>
