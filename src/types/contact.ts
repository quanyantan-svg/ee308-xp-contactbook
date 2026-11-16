/**
 * Supported categories for a contact method.
 *
 * Keep these serialized values stable because they are shared by the UI,
 * local persistence, and Excel import/export.
 */
export type ContactMethodType =
  | 'phone'
  | 'email'
  | 'social'
  | 'address'
  | 'other'

export interface ContactMethod {
  id: string
  type: ContactMethodType
  label: string
  value: string
}

export interface Contact {
  id: string
  name: string
  company: string
  note: string
  favorite: boolean
  methods: ContactMethod[]
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
}
