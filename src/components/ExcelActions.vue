<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertTriangle,
  Download,
  FileDown,
  FileSpreadsheet,
  FileUp,
  X,
} from 'lucide-vue-next'
import {
  MAX_EXCEL_FILE_BYTES,
  applyContactImport,
  createContactsTemplate,
  createContactsWorkbook,
  downloadExcelBuffer,
  parseContactsWorkbook,
  type ApplyImportResult,
  type ExcelImportPreview,
  type ImportConflictStrategy,
} from '../services/contactExcel'
import type { Contact } from '../types/contact'

const props = defineProps<{
  contacts: Contact[]
}>()

const emit = defineEmits<{
  apply: [result: ApplyImportResult]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref<ExcelImportPreview | null>(null)
const selectedFileName = ref('')
const strategy = ref<ImportConflictStrategy>('skip')
const isBusy = ref(false)
const status = ref<{ kind: 'success' | 'error'; text: string } | null>(null)

const hasBlockingErrors = computed(
  () => Boolean(preview.value && preview.value.errors.length > 0),
)
const newRecordCount = computed(() => {
  if (!preview.value) return 0
  return preview.value.records.length - preview.value.conflicts.length
})

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function showStatus(kind: 'success' | 'error', text: string): void {
  status.value = { kind, text }
}

async function exportContacts(): Promise<void> {
  isBusy.value = true
  status.value = null
  try {
    const buffer = await createContactsWorkbook(props.contacts)
    downloadExcelBuffer(buffer, `pairbook-contacts-${today()}.xlsx`)
    showStatus('success', `已导出 ${props.contacts.length} 位联系人`)
  } catch (error) {
    showStatus('error', error instanceof Error ? error.message : '导出失败，请重试')
  } finally {
    isBusy.value = false
  }
}

async function downloadTemplate(): Promise<void> {
  isBusy.value = true
  status.value = null
  try {
    const buffer = await createContactsTemplate()
    downloadExcelBuffer(buffer, 'pairbook-import-template.xlsx')
    showStatus('success', 'Excel 导入模板已下载')
  } catch (error) {
    showStatus('error', error instanceof Error ? error.message : '模板下载失败，请重试')
  } finally {
    isBusy.value = false
  }
}

function chooseImportFile(): void {
  fileInput.value?.click()
}

async function handleFileSelection(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  status.value = null
  preview.value = null
  selectedFileName.value = file.name
  strategy.value = 'skip'

  if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
    showStatus('error', '请选择扩展名为 .xlsx 的 Excel 文件')
    return
  }
  if (file.size === 0) {
    showStatus('error', '所选文件为空')
    return
  }
  if (file.size > MAX_EXCEL_FILE_BYTES) {
    showStatus('error', `Excel 文件不能超过 ${MAX_EXCEL_FILE_BYTES / 1024 / 1024} MB`)
    return
  }

  isBusy.value = true
  try {
    preview.value = await parseContactsWorkbook(
      await file.arrayBuffer(),
      props.contacts,
    )
  } catch (error) {
    showStatus(
      'error',
      error instanceof Error ? error.message : '无法解析 Excel 文件',
    )
  } finally {
    isBusy.value = false
  }
}

function closePreview(): void {
  preview.value = null
  selectedFileName.value = ''
}

function confirmImport(): void {
  if (!preview.value || preview.value.errors.length > 0) return

  const result = applyContactImport(
    props.contacts,
    preview.value.records,
    strategy.value,
  )
  emit('apply', result)
  closePreview()
}
</script>

<template>
  <section class="excel-actions" aria-label="Excel 数据操作">
    <div class="excel-actions__buttons">
      <button type="button" class="excel-button" :disabled="isBusy" @click="chooseImportFile">
        <FileUp :size="17" aria-hidden="true" />
        导入 Excel
      </button>
      <button type="button" class="excel-button" :disabled="isBusy" @click="exportContacts">
        <FileDown :size="17" aria-hidden="true" />
        导出 Excel
      </button>
      <button type="button" class="excel-button excel-button--quiet" :disabled="isBusy" @click="downloadTemplate">
        <Download :size="17" aria-hidden="true" />
        下载模板
      </button>
      <input
        ref="fileInput"
        class="visually-hidden"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        @change="handleFileSelection"
      />
    </div>

    <p
      v-if="status"
      class="excel-status"
      :class="`excel-status--${status.kind}`"
      role="status"
    >
      {{ status.text }}
    </p>

    <div v-if="preview" class="import-backdrop" @mousedown.self="closePreview">
      <section
        class="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
      >
        <header class="import-dialog__header">
          <div class="import-dialog__title">
            <span class="import-dialog__icon" aria-hidden="true">
              <FileSpreadsheet :size="22" />
            </span>
            <div>
              <span>Import preview</span>
              <h2 id="import-preview-title">确认 Excel 导入</h2>
            </div>
          </div>
          <button type="button" class="dialog-close" aria-label="关闭导入预览" @click="closePreview">
            <X :size="19" aria-hidden="true" />
          </button>
        </header>

        <div class="import-dialog__body">
          <p class="file-name">{{ selectedFileName }}</p>

          <div class="import-summary" aria-label="导入统计">
            <div><strong>{{ preview.totalDataRows }}</strong><span>数据行</span></div>
            <div><strong>{{ preview.records.length }}</strong><span>有效记录</span></div>
            <div :class="{ 'has-error': preview.errors.length }">
              <strong>{{ preview.errors.length }}</strong><span>错误</span>
            </div>
            <div :class="{ 'has-warning': preview.conflicts.length }">
              <strong>{{ preview.conflicts.length }}</strong><span>ID 冲突</span>
            </div>
          </div>

          <div v-if="preview.errors.length" class="import-errors">
            <div class="message-heading">
              <AlertTriangle :size="18" aria-hidden="true" />
              <strong>文件存在错误，修正后才能导入</strong>
            </div>
            <ul>
              <li v-for="(error, index) in preview.errors" :key="`${error.row}-${error.field}-${index}`">
                <span>第 {{ error.row }} 行 · {{ error.field }}</span>
                {{ error.message }}
              </li>
            </ul>
          </div>

          <div v-else class="import-plan">
            <p>
              将新增 <strong>{{ newRecordCount }}</strong> 条记录；检测到
              <strong>{{ preview.conflicts.length }}</strong> 个与现有通讯录相同的 ID。
            </p>

            <fieldset v-if="preview.conflicts.length">
              <legend>选择 ID 冲突处理策略</legend>
              <label>
                <input v-model="strategy" type="radio" value="skip" />
                <span><strong>跳过冲突项（推荐）</strong><small>保留当前联系人，不导入相同 ID 的记录</small></span>
              </label>
              <label>
                <input v-model="strategy" type="radio" value="replace" />
                <span><strong>替换现有联系人</strong><small>仅替换预览中列出的相同 ID 联系人</small></span>
              </label>
            </fieldset>

            <details v-if="preview.conflicts.length" class="conflict-list">
              <summary>查看 {{ preview.conflicts.length }} 个冲突</summary>
              <ul>
                <li v-for="conflict in preview.conflicts" :key="`${conflict.id}-${conflict.row}`">
                  第 {{ conflict.row }} 行 · {{ conflict.name }} · {{ conflict.id }}
                </li>
              </ul>
            </details>

            <p class="atomic-note">确认后将一次性写入全部变更；取消不会修改现有通讯录。</p>
          </div>
        </div>

        <footer class="import-dialog__footer">
          <button type="button" class="button button--secondary" @click="closePreview">取消</button>
          <button
            type="button"
            class="button button--primary"
            :disabled="hasBlockingErrors"
            @click="confirmImport"
          >
            确认导入
          </button>
        </footer>
      </section>
    </div>
  </section>
</template>

<style scoped>
.excel-actions__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.excel-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  color: var(--text-body);
  background: var(--surface);
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
}

.excel-button:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.excel-button--quiet {
  border-color: transparent;
  color: var(--text-muted);
  background: transparent;
}

.excel-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.excel-status {
  margin-top: 8px;
  font-size: 0.76rem;
}

.excel-status--success {
  color: var(--brand-strong);
}

.excel-status--error {
  color: var(--danger);
}

.import-backdrop {
  position: fixed;
  z-index: 70;
  inset: 0;
  display: grid;
  overflow-y: auto;
  padding: 24px;
  place-items: center;
  background: rgb(18 35 30 / 58%);
  backdrop-filter: blur(5px);
}

.import-dialog {
  width: min(100%, 680px);
  max-height: calc(100svh - 48px);
  overflow-y: auto;
  border: 1px solid rgb(255 255 255 / 60%);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: 0 28px 70px rgb(20 48 39 / 28%);
}

.import-dialog__header,
.import-dialog__footer,
.import-dialog__title,
.message-heading {
  display: flex;
  align-items: center;
}

.import-dialog__header {
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  border-bottom: 1px solid var(--border-subtle);
}

.import-dialog__title {
  gap: 12px;
}

.import-dialog__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 13px;
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.import-dialog__title span:not(.import-dialog__icon) {
  color: var(--brand-strong);
  font-size: 0.65rem;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.import-dialog h2 {
  margin: 3px 0 0;
  color: var(--text-strong);
  font-size: 1.25rem;
}

.dialog-close {
  display: grid;
  width: 36px;
  height: 36px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: var(--text-muted);
  background: var(--surface-muted);
  cursor: pointer;
}

.import-dialog__body {
  padding: 24px 28px;
}

.file-name {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 16px 0 22px;
}

.import-summary > div {
  padding: 13px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--surface-muted);
}

.import-summary strong,
.import-summary span {
  display: block;
}

.import-summary strong {
  color: var(--text-strong);
  font-size: 1.15rem;
}

.import-summary span {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.import-summary .has-error strong {
  color: var(--danger);
}

.import-summary .has-warning strong {
  color: #9d6900;
}

.import-errors {
  padding: 16px;
  border: 1px solid #efc7c3;
  border-radius: 14px;
  background: var(--danger-soft);
}

.message-heading {
  gap: 8px;
  color: var(--danger);
  font-size: 0.85rem;
}

.import-errors ul,
.conflict-list ul {
  max-height: 230px;
  overflow-y: auto;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.import-errors li {
  padding: 8px 0;
  border-top: 1px solid rgb(184 66 66 / 13%);
  color: var(--text-body);
  font-size: 0.78rem;
}

.import-errors li span {
  display: block;
  margin-bottom: 2px;
  color: var(--danger);
  font-weight: 700;
}

.import-plan > p {
  color: var(--text-body);
  font-size: 0.84rem;
  line-height: 1.6;
}

.import-plan fieldset {
  display: grid;
  gap: 9px;
  margin: 18px 0;
  padding: 0;
  border: 0;
}

.import-plan legend {
  margin-bottom: 8px;
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 700;
}

.import-plan label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
}

.import-plan label:has(input:checked) {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.import-plan input {
  margin-top: 3px;
  accent-color: var(--brand);
}

.import-plan label strong,
.import-plan label small {
  display: block;
}

.import-plan label strong {
  color: var(--text-strong);
  font-size: 0.82rem;
}

.import-plan label small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 0.73rem;
}

.conflict-list {
  margin-top: 14px;
  font-size: 0.78rem;
}

.conflict-list summary {
  color: var(--brand-strong);
  cursor: pointer;
}

.conflict-list li {
  padding: 6px 0;
  color: var(--text-muted);
}

.import-plan .atomic-note {
  margin-top: 18px;
  padding: 11px 13px;
  border-radius: 10px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  font-size: 0.76rem;
}

.import-dialog__footer {
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 28px 24px;
  border-top: 1px solid var(--border-subtle);
}

.import-dialog__footer .button:disabled {
  opacity: 0.45;
  transform: none;
  cursor: not-allowed;
}

@media (max-width: 680px) {
  .excel-actions__buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .excel-button--quiet {
    grid-column: 1 / -1;
  }

  .import-backdrop {
    padding: 12px;
    place-items: end center;
  }

  .import-dialog {
    max-height: calc(100svh - 24px);
    border-radius: 20px;
  }

  .import-dialog__header,
  .import-dialog__body,
  .import-dialog__footer {
    padding-right: 18px;
    padding-left: 18px;
  }

  .import-summary {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 380px) {
  .excel-actions__buttons {
    grid-template-columns: 1fr;
  }

  .excel-button--quiet {
    grid-column: auto;
  }

  .import-dialog__footer .button {
    flex: 1;
  }
}
</style>
