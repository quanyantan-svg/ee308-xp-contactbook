<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import type { Contact } from '../types/contact'

defineProps<{
  contact: Contact
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div class="dialog-backdrop" @mousedown.self="$emit('cancel')">
    <section
      class="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
    >
      <div class="confirm-dialog__icon" aria-hidden="true">
        <AlertTriangle :size="24" />
      </div>
      <h2 id="delete-title">删除联系人？</h2>
      <p id="delete-description">
        确定删除“<strong>{{ contact.name }}</strong>”吗？此操作会同步更新本地数据。
      </p>
      <div class="confirm-dialog__actions">
        <button type="button" class="button button--secondary" @click="$emit('cancel')">
          取消
        </button>
        <button type="button" class="button button--danger" autofocus @click="$emit('confirm')">
          确认删除
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgb(18 35 30 / 55%);
  backdrop-filter: blur(5px);
}

.confirm-dialog {
  width: min(100%, 420px);
  box-sizing: border-box;
  padding: 30px;
  border: 1px solid rgb(255 255 255 / 60%);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: 0 28px 70px rgb(20 48 39 / 28%);
  text-align: center;
}

.confirm-dialog__icon {
  display: grid;
  width: 52px;
  height: 52px;
  margin: 0 auto 17px;
  place-items: center;
  border-radius: 16px;
  color: var(--danger);
  background: var(--danger-soft);
}

.confirm-dialog h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.3rem;
}

.confirm-dialog p {
  margin: 10px 0 0;
  color: var(--text-body);
  font-size: 0.9rem;
  line-height: 1.6;
}

.confirm-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 25px;
}
</style>
