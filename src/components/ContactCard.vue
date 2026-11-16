<script setup lang="ts">
import { Building2, MapPin, Pencil, Star, Trash2 } from 'lucide-vue-next'
import type { Contact, ContactMethodType } from '../types/contact'

defineProps<{
  contact: Contact
}>()

defineEmits<{
  edit: [contact: Contact]
  remove: [contact: Contact]
  toggleFavorite: [contact: Contact]
}>()

const methodTypeLabels: Record<ContactMethodType, string> = {
  phone: '电话',
  email: '邮箱',
  social: '社交账号',
  address: '地址',
  other: '其他',
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase() || '联'
}
</script>

<template>
  <article class="contact-card">
    <div class="contact-card__topline">
      <div class="contact-card__identity">
        <div class="contact-card__avatar" aria-hidden="true">
          {{ getInitial(contact.name) }}
        </div>
        <div class="contact-card__title">
          <h2>{{ contact.name }}</h2>
          <p v-if="contact.company">
            <Building2 :size="15" aria-hidden="true" />
            {{ contact.company }}
          </p>
          <p v-else class="contact-card__muted">未填写公司</p>
        </div>
      </div>

      <button
        class="icon-button icon-button--favorite"
        :class="{ 'is-active': contact.favorite }"
        type="button"
        :aria-label="contact.favorite ? `取消收藏 ${contact.name}` : `收藏 ${contact.name}`"
        :title="contact.favorite ? '取消收藏' : '收藏'"
        @click="$emit('toggleFavorite', contact)"
      >
        <Star :size="19" :fill="contact.favorite ? 'currentColor' : 'none'" aria-hidden="true" />
      </button>
    </div>

    <div v-if="contact.methods.length" class="contact-card__methods">
      <div
        v-for="method in contact.methods"
        :key="method.id"
        class="contact-card__method"
      >
        <span>{{ method.label || methodTypeLabels[method.type] }}</span>
        <strong>{{ method.value }}</strong>
      </div>
    </div>
    <div v-else class="contact-card__placeholder">
      <MapPin :size="16" aria-hidden="true" />
      联系方式待补充
    </div>

    <p v-if="contact.note" class="contact-card__note">{{ contact.note }}</p>

    <footer class="contact-card__footer">
      <span>更新于 {{ new Date(contact.updatedAt).toLocaleDateString('zh-CN') }}</span>
      <div class="contact-card__actions">
        <button type="button" class="text-button" @click="$emit('edit', contact)">
          <Pencil :size="16" aria-hidden="true" />
          编辑
        </button>
        <button
          type="button"
          class="text-button text-button--danger"
          @click="$emit('remove', contact)"
        >
          <Trash2 :size="16" aria-hidden="true" />
          删除
        </button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.contact-card {
  display: flex;
  min-width: 0;
  min-height: 280px;
  flex-direction: column;
  padding: 24px;
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.contact-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-card-hover);
}

.contact-card__topline,
.contact-card__identity,
.contact-card__footer,
.contact-card__actions,
.contact-card__title p,
.contact-card__placeholder {
  display: flex;
  align-items: center;
}

.contact-card__topline {
  justify-content: space-between;
  gap: 16px;
}

.contact-card__identity {
  min-width: 0;
  gap: 14px;
}

.contact-card__avatar {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  place-items: center;
  border-radius: 16px;
  color: #164a3b;
  background: linear-gradient(145deg, #d6f3e7, #b9e7d7);
  font-size: 1.2rem;
  font-weight: 750;
}

.contact-card__title {
  min-width: 0;
}

.contact-card__title h2 {
  overflow: hidden;
  margin: 0 0 4px;
  color: var(--text-strong);
  font-size: 1.08rem;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-card__title p {
  overflow: hidden;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.84rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-card__muted {
  font-style: italic;
}

.icon-button {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 12px;
  color: var(--text-muted);
  background: var(--surface-muted);
  cursor: pointer;
}

.icon-button--favorite:hover,
.icon-button--favorite.is-active {
  color: #9d6900;
  background: #fff3cc;
}

.contact-card__methods {
  display: grid;
  gap: 8px;
  margin-top: 22px;
}

.contact-card__method {
  display: grid;
  grid-template-columns: minmax(72px, auto) 1fr;
  gap: 12px;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--surface-muted);
  font-size: 0.82rem;
}

.contact-card__method span {
  color: var(--text-muted);
}

.contact-card__method strong {
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-weight: 600;
}

.contact-card__placeholder {
  gap: 8px;
  margin-top: 22px;
  padding: 13px;
  border: 1px dashed var(--border-subtle);
  border-radius: 12px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.contact-card__note {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 16px;
  color: var(--text-body);
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.contact-card__footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 22px;
  color: var(--text-faint);
  font-size: 0.75rem;
}

.contact-card__actions {
  gap: 4px;
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  color: var(--text-body);
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.text-button:hover {
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.text-button--danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

@media (max-width: 420px) {
  .contact-card {
    min-height: 250px;
    padding: 20px;
  }

  .contact-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .contact-card__actions {
    width: 100%;
  }

  .text-button {
    flex: 1;
    justify-content: center;
  }
}
</style>
