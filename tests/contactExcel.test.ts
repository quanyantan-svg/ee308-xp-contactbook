import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  MAX_EXCEL_FILE_BYTES,
  applyContactImport,
  createContactsTemplate,
  createContactsWorkbook,
  excelFixedHeaders,
  parseContactsWorkbook,
} from '../src/services/contactExcel'
import type { Contact } from '../src/types/contact'

const method1Headers = [
  'method_1_id',
  'method_1_type',
  'method_1_label',
  'method_1_value',
]

const method2Headers = [
  'method_2_id',
  'method_2_type',
  'method_2_label',
  'method_2_value',
]

const contact: Contact = {
  id: 'contact-1',
  name: '林晓 & Alex',
  company: '星河科技 <研发部>',
  note: '第一行\n第二行：特殊字符 & < > "',
  favorite: true,
  methods: [
    {
      id: 'method-1',
      type: 'phone',
      label: '工作手机',
      value: '+86 (138) 0000-0000',
    },
    {
      id: 'method-2',
      type: 'phone',
      label: '备用电话',
      value: '0591-12345678',
    },
  ],
  createdAt: '2026-01-01T08:30:00.000Z',
  updatedAt: '2026-02-02T09:45:00.000Z',
}

async function createWorkbook(
  headers: string[],
  rows: Array<Array<ExcelJS.CellValue>>,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Contacts')
  worksheet.addRow(headers)
  rows.forEach((row) => worksheet.addRow(row))
  return workbook.xlsx.writeBuffer()
}

async function loadWorksheet(buffer: ArrayBuffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.getWorksheet('Contacts')
  if (!worksheet) throw new Error('Contacts worksheet missing')
  return worksheet
}

function contactRow(overrides: Partial<Record<string, ExcelJS.CellValue>> = {}) {
  const values: Record<string, ExcelJS.CellValue> = {
    id: 'import-1',
    name: '导入联系人',
    company: '',
    note: '',
    favorite: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    method_1_id: '',
    method_1_type: '',
    method_1_label: '',
    method_1_value: '',
    ...overrides,
  }

  return [...excelFixedHeaders, ...method1Headers].map((header) => values[header] ?? '')
}

describe('contactExcel export and template', () => {
  it('exports empty data with only the fixed headers', async () => {
    const worksheet = await loadWorksheet(await createContactsWorkbook([]))

    expect(worksheet.actualRowCount).toBe(1)
    expect(worksheet.getRow(1).values).toEqual([undefined, ...excelFixedHeaders])
  })

  it('exports one contact per row and expands same-type methods without truncation', async () => {
    const worksheet = await loadWorksheet(await createContactsWorkbook([contact]))

    expect(worksheet.actualRowCount).toBe(2)
    expect(worksheet.getRow(1).values).toEqual([
      undefined,
      ...excelFixedHeaders,
      ...method1Headers,
      ...method2Headers,
    ])
    expect(worksheet.getCell('H2').value).toBe('method-1')
    expect(worksheet.getCell('I2').value).toBe('phone')
    expect(worksheet.getCell('K2').value).toBe('+86 (138) 0000-0000')
    expect(worksheet.getCell('L2').value).toBe('method-2')
    expect(worksheet.getCell('O2').value).toBe('0591-12345678')
  })

  it('uses the largest method count across multiple contacts', async () => {
    const secondContact: Contact = {
      ...contact,
      id: 'contact-2',
      name: '周宁',
      methods: [contact.methods[0]!],
    }
    const worksheet = await loadWorksheet(
      await createContactsWorkbook([contact, secondContact]),
    )

    expect(worksheet.actualRowCount).toBe(3)
    expect(worksheet.actualColumnCount).toBe(15)
    expect(worksheet.getCell('L3').value).toBeNull()
    expect(worksheet.getCell('O3').value).toBeNull()
  })

  it('creates a standard template with one complete method group and instructions', async () => {
    const buffer = await createContactsTemplate()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    expect(workbook.getWorksheet('Contacts')?.getRow(1).values).toEqual([
      undefined,
      ...excelFixedHeaders,
      ...method1Headers,
    ])
    expect(workbook.getWorksheet('填写说明')?.getCell('A1').value).toBe(
      'PairBook Excel 导入模板',
    )

    const preview = await parseContactsWorkbook(buffer, [])
    expect(preview.errors).toEqual([])
    expect(preview.records).toEqual([])
  })
})

describe('contactExcel import validation', () => {
  it('rejects a workbook with an incorrect template', async () => {
    const headers = [...excelFixedHeaders]
    headers[2] = 'organization'
    const preview = await parseContactsWorkbook(
      await createWorkbook(headers, []),
      [],
    )

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 1, field: 'company' }),
      ]),
    )
    expect(preview.records).toEqual([])
  })

  it('reports a missing required name at its row and field', async () => {
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers],
        [contactRow({ name: '' })],
      ),
      [],
    )

    expect(preview.errors).toContainEqual({
      row: 2,
      field: 'name',
      message: '必填值不能为空',
    })
    expect(preview.records).toEqual([])
  })

  it('validates id, boolean, timestamp and optional text field types', async () => {
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers],
        [
          contactRow({
            id: 123,
            company: 456,
            favorite: 1,
            createdAt: 'not-a-date',
          }),
        ],
      ),
      [],
    )

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, field: 'id' }),
        expect.objectContaining({ row: 2, field: 'company' }),
        expect.objectContaining({ row: 2, field: 'favorite' }),
        expect.objectContaining({ row: 2, field: 'createdAt' }),
      ]),
    )
  })

  it('rejects an incomplete method column group', async () => {
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers.slice(0, 3)],
        [],
      ),
      [],
    )

    expect(preview.errors.some((error) => error.message.includes('列组不完整'))).toBe(true)
  })

  it('rejects a partially filled method row', async () => {
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers],
        [contactRow({ method_1_type: 'phone', method_1_label: '手机' })],
      ),
      [],
      { createId: () => 'generated-method-id' },
    )

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, field: 'method_1_value' }),
      ]),
    )
  })

  it('rejects an unknown contact method type', async () => {
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers],
        [
          contactRow({
            method_1_id: 'method-import',
            method_1_type: 'fax',
            method_1_label: '传真',
            method_1_value: '1234',
          }),
        ],
      ),
      [],
    )

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, field: 'method_1_type' }),
      ]),
    )
  })

  it('reports every occurrence of a duplicate file id', async () => {
    const buffer = await createWorkbook(
      [...excelFixedHeaders, ...method1Headers],
      [contactRow({ id: 'duplicate' }), contactRow({ id: 'duplicate', name: '第二人' })],
    )
    const preview = await parseContactsWorkbook(buffer, [])

    expect(preview.duplicateIds).toEqual([{ id: 'duplicate', rows: [2, 3] }])
    expect(preview.errors.filter((error) => error.field === 'id')).toHaveLength(2)
    expect(preview.records).toEqual([])
  })

  it('rejects formula cells and oversized files', async () => {
    const buffer = await createWorkbook(
      [...excelFixedHeaders, ...method1Headers],
      [contactRow({ name: { formula: '1+1', result: 2 } })],
    )
    const preview = await parseContactsWorkbook(buffer, [])

    expect(preview.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, field: 'name' }),
      ]),
    )
    await expect(
      parseContactsWorkbook(new ArrayBuffer(MAX_EXCEL_FILE_BYTES + 1), []),
    ).rejects.toThrow('不能超过')
  })
})

describe('contactExcel round trip and conflict handling', () => {
  it('round-trips Chinese, special characters, multiline notes, favorite and timestamps', async () => {
    const buffer = await createContactsWorkbook([contact])
    const preview = await parseContactsWorkbook(buffer, [])

    expect(preview.errors).toEqual([])
    expect(preview.records.map((record) => record.contact)).toEqual([contact])
  })

  it('round-trips multiple contacts with different method counts', async () => {
    const secondContact: Contact = {
      ...contact,
      id: 'contact-2',
      name: '无联系方式',
      favorite: false,
      methods: [],
    }
    const sourceContacts = [contact, secondContact]
    const preview = await parseContactsWorkbook(
      await createContactsWorkbook(sourceContacts),
      [],
    )

    expect(preview.errors).toEqual([])
    expect(preview.records.map((record) => record.contact)).toEqual(sourceContacts)
  })

  it('generates missing ids and timestamps for template-style rows', async () => {
    const generatedIds = ['new-contact', 'new-method']
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers],
        [
          contactRow({
            id: '',
            createdAt: '',
            updatedAt: '',
            method_1_id: '',
            method_1_type: 'email',
            method_1_label: '邮箱',
            method_1_value: 'hello@example.com',
          }),
        ],
      ),
      [],
      {
        createId: () => generatedIds.shift() ?? 'unexpected',
        now: () => '2026-05-01T00:00:00.000Z',
      },
    )

    expect(preview.errors).toEqual([])
    expect(preview.records[0]?.contact).toMatchObject({
      id: 'new-contact',
      favorite: false,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      methods: [expect.objectContaining({ id: 'new-method', type: 'email' })],
    })
  })

  it('previews existing id conflicts and applies skip or replace predictably', async () => {
    const importedContact = { ...contact, name: '导入版本' }
    const preview = await parseContactsWorkbook(
      await createContactsWorkbook([importedContact]),
      [contact],
    )

    expect(preview.conflicts).toEqual([
      { id: contact.id, name: '导入版本', row: 2 },
    ])

    const skipped = applyContactImport([contact], preview.records, 'skip')
    expect(skipped.contacts).toEqual([contact])
    expect(skipped.skippedCount).toBe(1)

    const replaced = applyContactImport([contact], preview.records, 'replace')
    expect(replaced.contacts[0]?.name).toBe('导入版本')
    expect(replaced.replacedCount).toBe(1)
  })

  it('does not mutate existing contacts when a file contains errors', async () => {
    const existing = [contact]
    const snapshot = structuredClone(existing)
    const preview = await parseContactsWorkbook(
      await createWorkbook(
        [...excelFixedHeaders, ...method1Headers],
        [contactRow({ favorite: 'yes' })],
      ),
      existing,
    )

    expect(preview.errors.length).toBeGreaterThan(0)
    expect(existing).toEqual(snapshot)
  })
})
