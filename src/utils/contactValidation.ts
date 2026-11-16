import type { ContactMethod, ContactMethodType } from '../types/contact'

export interface ContactMethodValidationErrors {
  type?: string
  label?: string
  value?: string
}

/**
 * Serialized method types accepted by the shared contact contract.
 *
 * The order is also used by the editor's type selector, so keep it stable.
 */
export const contactMethodTypes: readonly ContactMethodType[] = [
  'phone',
  'email',
  'social',
  'address',
  'other',
]

/** Minimum digit count a phone number needs before it can be dialled. */
export const minPhoneDigits = 7

const emailPattern =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

/** Characters commonly used to format a phone number for display. */
const phonePattern = /^[0-9+\-().\s]+$/

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || !phonePattern.test(trimmed)) {
    return false
  }

  const digitCount = trimmed.replace(/[^0-9]/g, '').length
  return digitCount >= minPhoneDigits
}

/**
 * Validate a contact method without touching the input object.
 *
 * Returns messages only for the fields that failed; an empty object means the
 * method can be stored as-is.
 */
export function validateContactMethod(
  method: ContactMethod,
): ContactMethodValidationErrors {
  const errors: ContactMethodValidationErrors = {}

  if (!contactMethodTypes.includes(method.type)) {
    errors.type = '联系方式类型无效，请选择电话、邮箱、社交账号、地址或其他'
  }

  const label = typeof method.label === 'string' ? method.label.trim() : ''
  if (!label) {
    errors.label = '标签不能为空，请填写如“工作手机”或“GitHub”的说明'
  }

  const value = typeof method.value === 'string' ? method.value.trim() : ''
  if (!value) {
    errors.value = '内容不能为空'
  } else if (method.type === 'email' && !isValidEmail(value)) {
    errors.value = '请输入有效的邮箱地址，例如 name@example.com'
  } else if (method.type === 'phone' && !isValidPhone(value)) {
    errors.value = `请输入有效的电话号码：至少包含 ${minPhoneDigits} 位数字，可包含 +、-、空格和圆括号`
  }

  return errors
}

export function isContactMethodValid(method: ContactMethod): boolean {
  return Object.keys(validateContactMethod(method)).length === 0
}
