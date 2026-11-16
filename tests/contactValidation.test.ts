import { describe, expect, it } from 'vitest'
import type { ContactMethod, ContactMethodType } from '../src/types/contact'
import {
  contactMethodTypes,
  isContactMethodValid,
  isValidEmail,
  isValidPhone,
  minPhoneDigits,
  validateContactMethod,
} from '../src/utils/contactValidation'

function createMethod(overrides: Partial<ContactMethod> = {}): ContactMethod {
  return {
    id: 'method-1',
    type: 'phone',
    label: '工作手机',
    value: '+86 138 0013 8000',
    ...overrides,
  }
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((item) => deepFreeze(item))
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      deepFreeze(item),
    )
  }
  return Object.freeze(value)
}

describe('contactMethodTypes', () => {
  it('exposes the five serialized types from the shared contract', () => {
    expect(contactMethodTypes).toEqual([
      'phone',
      'email',
      'social',
      'address',
      'other',
    ])
  })
})

describe('validateContactMethod', () => {
  it('accepts every supported method type when required fields are filled', () => {
    const validMethods: ContactMethod[] = [
      createMethod({ type: 'phone', value: '138 0013 8000' }),
      createMethod({ type: 'email', label: '个人邮箱', value: 'me@example.com' }),
      createMethod({
        type: 'social',
        label: 'GitHub',
        value: 'github.com/quanyantan-svg',
      }),
      createMethod({
        type: 'address',
        label: '宿舍',
        value: '福建省福州市大学城',
      }),
      createMethod({ type: 'other', label: '备注方式', value: '每周三下午' }),
    ]

    for (const method of validMethods) {
      expect(validateContactMethod(method)).toEqual({})
    }
  })

  it('rejects a method type outside the shared contract', () => {
    const method = createMethod({ type: 'fax' as ContactMethodType })

    const errors = validateContactMethod(method)

    expect(errors.type).toContain('类型')
    expect(errors.label).toBeUndefined()
    expect(errors.value).toBeUndefined()
  })

  it('requires a non-blank label', () => {
    for (const label of ['', '   ']) {
      const errors = validateContactMethod(createMethod({ label }))
      expect(errors.label).toContain('标签')
    }
  })

  it('requires a non-blank value', () => {
    for (const value of ['', '   ']) {
      const errors = validateContactMethod(createMethod({ value }))
      expect(errors.value).toBe('内容不能为空')
    }
  })

  it('reports only the fields that fail validation', () => {
    const errors = validateContactMethod(createMethod({ label: '', value: '' }))

    expect(Object.keys(errors).sort()).toEqual(['label', 'value'])
  })

  it('accepts realistic email addresses', () => {
    const addresses = [
      'name@example.com',
      'user.name+tag@example.co.uk',
      'a@b.cn',
    ]

    for (const value of addresses) {
      expect(
        validateContactMethod(createMethod({ type: 'email', value })),
      ).toEqual({})
    }
  })

  it('rejects malformed email addresses', () => {
    const addresses = [
      'name',
      'name@',
      '@example.com',
      'name@example',
      'name @example.com',
      'name@example..com',
      'name@.com',
      'name@example.c',
    ]

    for (const value of addresses) {
      const errors = validateContactMethod(createMethod({ type: 'email', value }))
      expect(errors.value).toContain('邮箱')
    }
  })

  it('accepts phone numbers with common display characters', () => {
    const numbers = [
      '13800138000',
      '+86 138 0013 8000',
      '(010) 8888 6666',
      '020-8888-6666',
    ]

    for (const value of numbers) {
      expect(
        validateContactMethod(createMethod({ type: 'phone', value })),
      ).toEqual({})
    }
  })

  it('rejects phone numbers that are unreadable or too short', () => {
    const numbers = [
      '12',
      '123456',
      'phone-number',
      '+++ --- ()',
      '138-0013-8000 ext 12',
    ]

    for (const value of numbers) {
      const errors = validateContactMethod(createMethod({ type: 'phone', value }))
      expect(errors.value).toContain('电话号码')
    }
  })

  it('accepts free-form values for social, address and other types', () => {
    const cases: Array<{ type: ContactMethodType; value: string }> = [
      { type: 'social', value: 'github.com/quanyantan-svg' },
      { type: 'address', value: '福建省福州市闽侯县大学城' },
      { type: 'other', value: '每周三下午三点' },
    ]

    for (const { type, value } of cases) {
      expect(validateContactMethod(createMethod({ type, value }))).toEqual({})
    }
  })

  it('ignores surrounding whitespace without modifying the input', () => {
    const method = deepFreeze(
      createMethod({ label: '  工作手机  ', value: '  138 0013 8000  ' }),
    )

    expect(validateContactMethod(method)).toEqual({})
    expect(method.label).toBe('  工作手机  ')
    expect(method.value).toBe('  138 0013 8000  ')
  })

  it('states the minimum digit requirement in the phone error message', () => {
    const errors = validateContactMethod(createMethod({ value: '12345' }))

    expect(errors.value).toContain(String(minPhoneDigits))
  })

  it('does not mutate a method it rejects', () => {
    const method = deepFreeze(
      createMethod({ type: 'email', label: ' ', value: 'not-an-email' }),
    )

    expect(() => validateContactMethod(method)).not.toThrow()
    expect(method).toEqual({
      id: 'method-1',
      type: 'email',
      label: ' ',
      value: 'not-an-email',
    })
  })
})

describe('isContactMethodValid', () => {
  it('returns true only when no field fails validation', () => {
    expect(isContactMethodValid(createMethod())).toBe(true)
    expect(
      isContactMethodValid(createMethod({ type: 'email', value: 'nope' })),
    ).toBe(false)
    expect(isContactMethodValid(createMethod({ label: '' }))).toBe(false)
  })
})

describe('isValidPhone', () => {
  it('treats the minimum digit count as the boundary', () => {
    expect(isValidPhone('1'.repeat(minPhoneDigits))).toBe(true)
    expect(isValidPhone('1'.repeat(minPhoneDigits - 1))).toBe(false)
  })

  it('rejects letters and symbols that are not display formatting', () => {
    expect(isValidPhone('138#0013#8000')).toBe(false)
    expect(isValidPhone('call me')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('requires a local part, an at sign and a dotted domain', () => {
    expect(isValidEmail('me@example.com')).toBe(true)
    expect(isValidEmail('me@example')).toBe(false)
    expect(isValidEmail('me.example.com')).toBe(false)
  })
})
