<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ContactMethod, ContactMethodType } from '../types/contact'
import {
  contactMethodTypes,
  validateContactMethod,
} from '../utils/contactValidation'
import type { ContactMethodValidationErrors } from '../utils/contactValidation'

const props = withDefaults(
  defineProps<{
    modelValue: ContactMethod[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [methods: ContactMethod[]]
}>()

const typeLabels: Record<ContactMethodType, string> = {
  phone: '电话',
  email: '邮箱',
  social: '社交账号',
  address: '地址',
  other: '其他',
}

interface MethodDraft {
  type: ContactMethodType
  label: string
  value: string
}

type DraftField = keyof MethodDraft

const emptyDraft = (): MethodDraft => ({ type: 'phone', label: '', value: '' })

const editingId = ref<string | null>(null)
const newDraft = reactive<MethodDraft>(emptyDraft())
const editDraft = reactive<MethodDraft>(emptyDraft())

const newTouched = reactive<Record<DraftField, boolean>>({
  type: false,
  label: false,
  value: false,
})
const editTouched = reactive<Record<DraftField, boolean>>({
  type: false,
  label: false,
  value: false,
})
const newSubmitAttempted = ref(false)
const editSubmitAttempted = ref(false)

const newErrors = computed(() =>
  validateContactMethod({ id: 'new-draft', ...newDraft }),
)
const editErrors = computed(() =>
  validateContactMethod({
    id: editingId.value ?? 'edit-draft',
    ...editDraft,
  }),
)

const newVisibleErrors = computed<ContactMethodValidationErrors>(() => {
  const visible: ContactMethodValidationErrors = {}
  if (newErrors.value.type && (newSubmitAttempted.value || newTouched.type)) {
    visible.type = newErrors.value.type
  }
  if (newErrors.value.label && (newSubmitAttempted.value || newTouched.label)) {
    visible.label = newErrors.value.label
  }
  if (newErrors.value.value && (newSubmitAttempted.value || newTouched.value)) {
    visible.value = newErrors.value.value
  }
  return visible
})

const editVisibleErrors = computed<ContactMethodValidationErrors>(() => {
  const visible: ContactMethodValidationErrors = {}
  if (editErrors.value.type && (editSubmitAttempted.value || editTouched.type)) {
    visible.type = editErrors.value.type
  }
  if (editErrors.value.label && (editSubmitAttempted.value || editTouched.label)) {
    visible.label = editErrors.value.label
  }
  if (editErrors.value.value && (editSubmitAttempted.value || editTouched.value)) {
    visible.value = editErrors.value.value
  }
  return visible
})

let fallbackSequence = 0

/** Create an id that is non-empty and unique within the current list. */
function createMethodId(existing: readonly ContactMethod[]): string {
  const used = new Set(existing.map((method) => method.id))
  let id = ''
  do {
    id =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `cm-${Date.now().toString(36)}-${(fallbackSequence += 1).toString(36)}`
  } while (used.has(id))
  return id
}

function resetTouched(target: Record<DraftField, boolean>): void {
  target.type = false
  target.label = false
  target.value = false
}

function touchNew(field: DraftField): void {
  newTouched[field] = true
}

function touchEdit(field: DraftField): void {
  editTouched[field] = true
}

function addMethod(): void {
  if (props.disabled) {
    return
  }

  newSubmitAttempted.value = true
  if (Object.keys(newErrors.value).length > 0) {
    return
  }

  const method: ContactMethod = {
    id: createMethodId(props.modelValue),
    type: newDraft.type,
    label: newDraft.label.trim(),
    value: newDraft.value.trim(),
  }

  emit('update:modelValue', [...props.modelValue, method])
  Object.assign(newDraft, emptyDraft())
  newSubmitAttempted.value = false
  resetTouched(newTouched)
}

function startEdit(method: ContactMethod): void {
  if (props.disabled) {
    return
  }

  editingId.value = method.id
  editDraft.type = method.type
  editDraft.label = method.label
  editDraft.value = method.value
  editSubmitAttempted.value = false
  resetTouched(editTouched)
}

function cancelEdit(): void {
  editingId.value = null
  Object.assign(editDraft, emptyDraft())
  editSubmitAttempted.value = false
  resetTouched(editTouched)
}

function saveEdit(): void {
  if (props.disabled) {
    return
  }

  const target = props.modelValue.find((method) => method.id === editingId.value)
  if (!target) {
    cancelEdit()
    return
  }

  editSubmitAttempted.value = true
  if (Object.keys(editErrors.value).length > 0) {
    return
  }

  const updated: ContactMethod = {
    ...target,
    type: editDraft.type,
    label: editDraft.label.trim(),
    value: editDraft.value.trim(),
  }

  emit(
    'update:modelValue',
    props.modelValue.map((method) =>
      method.id === target.id ? updated : method,
    ),
  )
  cancelEdit()
}

function removeMethod(id: string): void {
  if (props.disabled) {
    return
  }
  if (!props.modelValue.some((method) => method.id === id)) {
    return
  }

  if (editingId.value === id) {
    cancelEdit()
  }
  emit(
    'update:modelValue',
    props.modelValue.filter((method) => method.id !== id),
  )
}
</script>

<template>
  <section
    class="methods-editor"
    :class="{ 'methods-editor--disabled': disabled }"
    aria-labelledby="methods-editor-title"
  >
    <div class="methods-editor__header">
      <h3 id="methods-editor-title" class="methods-editor__title">联系方式</h3>
      <span class="methods-editor__count">共 {{ modelValue.length }} 项</span>
    </div>

    <p v-if="modelValue.length === 0" class="methods-editor__empty">
      暂无联系方式。可在下方添加电话、邮箱、社交账号、地址或其他联系方式。
    </p>

    <ul v-else class="methods-editor__list">
      <li
        v-for="method in modelValue"
        :key="method.id"
        class="method-item"
        data-testid="method-item"
      >
        <div v-if="editingId !== method.id" class="method-item__view">
          <div class="method-item__info">
            <span class="method-item__type">{{ typeLabels[method.type] ?? method.type }}</span>
            <span class="method-item__label">{{ method.label }}</span>
            <span class="method-item__value">{{ method.value }}</span>
          </div>
          <div class="method-item__actions">
            <button
              type="button"
              class="method-button"
              :disabled="disabled"
              :aria-label="`编辑联系方式：${method.label}`"
              data-testid="edit-button"
              @click="startEdit(method)"
            >
              编辑
            </button>
            <button
              type="button"
              class="method-button method-button--danger"
              :disabled="disabled"
              :aria-label="`删除联系方式：${method.label}`"
              data-testid="delete-button"
              @click="removeMethod(method.id)"
            >
              删除
            </button>
          </div>
        </div>

        <form
          v-else
          class="method-form"
          novalidate
          data-testid="edit-form"
          :aria-label="`编辑联系方式：${method.label}`"
          @submit.prevent="saveEdit"
        >
          <p class="method-form__title">编辑联系方式</p>
          <div class="method-form__fields">
            <div class="method-field">
              <label
                class="method-field__label"
                :for="`contact-method-edit-${method.id}-type`"
                >类型</label
              >
              <select
                :id="`contact-method-edit-${method.id}-type`"
                v-model="editDraft.type"
                class="method-field__control"
                :disabled="disabled"
                :aria-invalid="editVisibleErrors.type ? 'true' : undefined"
                :aria-describedby="
                  editVisibleErrors.type
                    ? `contact-method-edit-${method.id}-type-error`
                    : undefined
                "
                data-testid="edit-type"
                @blur="touchEdit('type')"
              >
                <option
                  v-for="type in contactMethodTypes"
                  :key="type"
                  :value="type"
                >
                  {{ typeLabels[type] }}
                </option>
              </select>
              <p
                v-if="editVisibleErrors.type"
                :id="`contact-method-edit-${method.id}-type-error`"
                class="method-field__error"
                role="alert"
              >
                {{ editVisibleErrors.type }}
              </p>
            </div>

            <div class="method-field">
              <label
                class="method-field__label"
                :for="`contact-method-edit-${method.id}-label`"
                >标签</label
              >
              <input
                :id="`contact-method-edit-${method.id}-label`"
                v-model="editDraft.label"
                type="text"
                class="method-field__control"
                :disabled="disabled"
                :aria-invalid="editVisibleErrors.label ? 'true' : undefined"
                :aria-describedby="
                  editVisibleErrors.label
                    ? `contact-method-edit-${method.id}-label-error`
                    : undefined
                "
                data-testid="edit-label"
                @blur="touchEdit('label')"
              />
              <p
                v-if="editVisibleErrors.label"
                :id="`contact-method-edit-${method.id}-label-error`"
                class="method-field__error"
                role="alert"
              >
                {{ editVisibleErrors.label }}
              </p>
            </div>

            <div class="method-field">
              <label
                class="method-field__label"
                :for="`contact-method-edit-${method.id}-value`"
                >内容</label
              >
              <input
                :id="`contact-method-edit-${method.id}-value`"
                v-model="editDraft.value"
                type="text"
                class="method-field__control"
                :disabled="disabled"
                :aria-invalid="editVisibleErrors.value ? 'true' : undefined"
                :aria-describedby="
                  editVisibleErrors.value
                    ? `contact-method-edit-${method.id}-value-error`
                    : undefined
                "
                data-testid="edit-value"
                @blur="touchEdit('value')"
              />
              <p
                v-if="editVisibleErrors.value"
                :id="`contact-method-edit-${method.id}-value-error`"
                class="method-field__error"
                role="alert"
              >
                {{ editVisibleErrors.value }}
              </p>
            </div>
          </div>

          <div class="method-form__actions">
            <button
              type="submit"
              class="method-button method-button--primary"
              :disabled="disabled"
              data-testid="save-button"
            >
              保存
            </button>
            <button
              type="button"
              class="method-button"
              :disabled="disabled"
              data-testid="cancel-button"
              @click="cancelEdit"
            >
              取消
            </button>
          </div>
        </form>
      </li>
    </ul>

    <form
      class="method-form method-form--new"
      novalidate
      data-testid="new-form"
      aria-label="添加联系方式"
      @submit.prevent="addMethod"
    >
      <p class="method-form__title">添加联系方式</p>
      <div class="method-form__fields">
        <div class="method-field">
          <label class="method-field__label" for="contact-method-new-type"
            >类型</label
          >
          <select
            id="contact-method-new-type"
            v-model="newDraft.type"
            class="method-field__control"
            :disabled="disabled"
            :aria-invalid="newVisibleErrors.type ? 'true' : undefined"
            :aria-describedby="
              newVisibleErrors.type
                ? 'contact-method-new-type-error'
                : undefined
            "
            data-testid="new-type"
            @blur="touchNew('type')"
          >
            <option v-for="type in contactMethodTypes" :key="type" :value="type">
              {{ typeLabels[type] }}
            </option>
          </select>
          <p
            v-if="newVisibleErrors.type"
            id="contact-method-new-type-error"
            class="method-field__error"
            role="alert"
          >
            {{ newVisibleErrors.type }}
          </p>
        </div>

        <div class="method-field">
          <label class="method-field__label" for="contact-method-new-label"
            >标签</label
          >
          <input
            id="contact-method-new-label"
            v-model="newDraft.label"
            type="text"
            class="method-field__control"
            placeholder="例如：工作手机"
            autocomplete="off"
            :disabled="disabled"
            :aria-invalid="newVisibleErrors.label ? 'true' : undefined"
            :aria-describedby="
              newVisibleErrors.label
                ? 'contact-method-new-label-error'
                : undefined
            "
            data-testid="new-label"
            @blur="touchNew('label')"
          />
          <p
            v-if="newVisibleErrors.label"
            id="contact-method-new-label-error"
            class="method-field__error"
            role="alert"
          >
            {{ newVisibleErrors.label }}
          </p>
        </div>

        <div class="method-field">
          <label class="method-field__label" for="contact-method-new-value"
            >内容</label
          >
          <input
            id="contact-method-new-value"
            v-model="newDraft.value"
            type="text"
            class="method-field__control"
            placeholder="例如：138 0013 8000"
            autocomplete="off"
            :disabled="disabled"
            :aria-invalid="newVisibleErrors.value ? 'true' : undefined"
            :aria-describedby="
              newVisibleErrors.value
                ? 'contact-method-new-value-error'
                : undefined
            "
            data-testid="new-value"
            @blur="touchNew('value')"
          />
          <p
            v-if="newVisibleErrors.value"
            id="contact-method-new-value-error"
            class="method-field__error"
            role="alert"
          >
            {{ newVisibleErrors.value }}
          </p>
        </div>
      </div>

      <div class="method-form__actions">
        <button
          type="submit"
          class="method-button method-button--primary"
          :disabled="disabled"
          data-testid="add-button"
        >
          添加
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.methods-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.methods-editor__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.methods-editor__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
}

.methods-editor__count {
  font-size: 13px;
  color: var(--text);
}

.methods-editor__empty {
  margin: 0;
  padding: 12px 14px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text);
}

.methods-editor__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.method-item {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
}

.method-item__view {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.method-item__info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.method-item__type {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
}

.method-item__label {
  font-weight: 600;
  color: var(--text-h);
  font-size: 15px;
  word-break: break-word;
}

.method-item__value {
  font-size: 15px;
  color: var(--text);
  word-break: break-all;
}

.method-item__actions {
  display: flex;
  gap: 8px;
}

.method-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-form--new {
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--social-bg);
}

.method-form__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-h);
}

.method-form__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: start;
}

.method-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.method-field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.method-field__control {
  width: 100%;
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 15px;
}

.method-field__control:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: var(--accent);
}

.method-field__control[aria-invalid='true'] {
  border-color: #c0392b;
}

.method-field__control:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.method-field__error {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: #c0392b;
}

.method-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.method-button {
  min-height: 40px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.method-button:hover:not(:disabled) {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.method-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.method-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.method-button--primary {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-bg);
  font-weight: 600;
}

.method-button--danger {
  color: #c0392b;
}

.method-button--danger:hover:not(:disabled) {
  border-color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
}

@media (max-width: 480px) {
  .method-item__actions {
    width: 100%;
  }

  .method-item__actions .method-button {
    flex: 1 1 0;
  }

  .method-form__actions .method-button {
    flex: 1 1 auto;
  }
}

@media (prefers-color-scheme: dark) {
  .method-field__error,
  .method-button--danger {
    color: #ff9b90;
  }

  .method-field__control[aria-invalid='true'],
  .method-button--danger:hover:not(:disabled) {
    border-color: #ff9b90;
  }
}
</style>
