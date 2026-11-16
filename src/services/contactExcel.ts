import type ExcelJS from 'exceljs'
import type { Cell, Row, Worksheet } from 'exceljs'
import type { Contact, ContactMethodType } from '../types/contact'

export const excelFixedHeaders = [
  'id',
  'name',
  'company',
  'note',
  'favorite',
  'createdAt',
  'updatedAt',
] as const

export const MAX_EXCEL_FILE_BYTES = 5 * 1024 * 1024
export const MAX_EXCEL_CONTACTS = 5000
export const MAX_EXCEL_METHOD_GROUPS = 50
const MAX_IMPORT_ISSUES = 500

const methodFields = ['id', 'type', 'label', 'value'] as const
const allowedMethodTypes: readonly ContactMethodType[] = [
  'phone',
  'email',
  'social',
  'address',
  'other',
]
const xlsxMimeType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type ScalarCellValue = string | number | boolean | Date | null

export interface ExcelImportIssue {
  row: number
  field: string
  message: string
}

export interface ExcelImportRecord {
  row: number
  contact: Contact
}

export interface ExcelIdConflict {
  id: string
  name: string
  row: number
}

export interface ExcelDuplicateId {
  id: string
  rows: number[]
}

export interface ExcelImportPreview {
  records: ExcelImportRecord[]
  errors: ExcelImportIssue[]
  conflicts: ExcelIdConflict[]
  duplicateIds: ExcelDuplicateId[]
  totalDataRows: number
}

export type ImportConflictStrategy = 'skip' | 'replace'

export interface ApplyImportResult {
  contacts: Contact[]
  addedCount: number
  replacedCount: number
  skippedCount: number
}

interface ParseOptions {
  createId?: () => string
  now?: () => string
}

async function createWorkbookInstance(): Promise<ExcelJS.Workbook> {
  const excelModule = await import('exceljs')
  return new excelModule.default.Workbook()
}

const createRandomId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function methodHeaders(methodCount: number): string[] {
  return Array.from({ length: methodCount }, (_, index) => {
    const groupNumber = index + 1
    return methodFields.map((field) => `method_${groupNumber}_${field}`)
  }).flat()
}

function workbookHeaders(methodCount: number): string[] {
  return [...excelFixedHeaders, ...methodHeaders(methodCount)]
}

function assertExportLimits(contacts: readonly Contact[]): void {
  if (contacts.length > MAX_EXCEL_CONTACTS) {
    throw new Error(`一次最多处理 ${MAX_EXCEL_CONTACTS} 位联系人`)
  }

  const tooManyMethods = contacts.find(
    (contact) => contact.methods.length > MAX_EXCEL_METHOD_GROUPS,
  )
  if (tooManyMethods) {
    throw new Error(
      `联系人“${tooManyMethods.name}”的联系方式超过 ${MAX_EXCEL_METHOD_GROUPS} 条，无法安全导出`,
    )
  }
}

function styleContactsWorksheet(worksheet: Worksheet, columnCount: number): void {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(worksheet.rowCount, 1), column: columnCount },
  }

  const headerRow = worksheet.getRow(1)
  headerRow.height = 24
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF287A60' },
  }
  headerRow.alignment = { vertical: 'middle' }

  worksheet.columns.forEach((column, index) => {
    const header = worksheet.getCell(1, index + 1).text
    if (header === 'note') {
      column.width = 32
    } else if (header.endsWith('_value') || header.endsWith('_label')) {
      column.width = 22
    } else if (header === 'createdAt' || header === 'updatedAt') {
      column.width = 26
    } else {
      column.width = Math.max(13, Math.min(header.length + 3, 20))
    }
  })

  worksheet.getColumn(4).alignment = { wrapText: true, vertical: 'top' }
}

function addContactRows(worksheet: Worksheet, contacts: readonly Contact[]): void {
  contacts.forEach((contact) => {
    const rowValues: Array<string | boolean> = [
      contact.id,
      contact.name,
      contact.company,
      contact.note,
      contact.favorite,
      contact.createdAt,
      contact.updatedAt,
    ]

    contact.methods.forEach((method) => {
      rowValues.push(method.id, method.type, method.label, method.value)
    })

    worksheet.addRow(rowValues)
  })
}

export async function createContactsWorkbook(
  contacts: readonly Contact[],
): Promise<ArrayBuffer> {
  assertExportLimits(contacts)
  const workbook = await createWorkbookInstance()
  workbook.creator = 'PairBook'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Contacts')
  const maxMethods = contacts.reduce(
    (maximum, contact) => Math.max(maximum, contact.methods.length),
    0,
  )
  const headers = workbookHeaders(maxMethods)
  worksheet.addRow(headers)
  addContactRows(worksheet, contacts)
  styleContactsWorksheet(worksheet, headers.length)

  return workbook.xlsx.writeBuffer()
}

export async function createContactsTemplate(): Promise<ArrayBuffer> {
  const workbook = await createWorkbookInstance()
  workbook.creator = 'PairBook'
  const worksheet = workbook.addWorksheet('Contacts')
  const headers = workbookHeaders(1)
  worksheet.addRow(headers)
  styleContactsWorksheet(worksheet, headers.length)

  worksheet.getCell('E2').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"true,false"'],
  }
  worksheet.getCell('I2').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"phone,email,social,address,other"'],
  }

  const instructions = workbook.addWorksheet('填写说明')
  instructions.addRows([
    ['PairBook Excel 导入模板'],
    ['每位联系人填写一行；name 必填，其余固定字段可留空。'],
    ['favorite 只允许 true 或 false；留空按 false 导入。'],
    ['id、createdAt、updatedAt 留空时由 PairBook 自动生成。'],
    ['联系方式必须使用连续的 method_N_id/type/label/value 四列组。'],
    ['联系方式 type 只允许 phone、email、social、address、other。'],
    ['空联系方式列组会被忽略；填写时 type、label、value 必须完整。'],
    ['需要更多联系方式时，按相同命名规则向右添加完整列组。'],
  ])
  instructions.getColumn(1).width = 88
  instructions.getRow(1).font = { bold: true, size: 15 }
  instructions.getColumn(1).alignment = { wrapText: true, vertical: 'top' }

  return workbook.xlsx.writeBuffer()
}

export function downloadExcelBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: xlsxMimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function getHeaderText(cell: Cell): string {
  return typeof cell.value === 'string' ? cell.value.trim() : ''
}

function validateHeaders(worksheet: Worksheet): {
  methodGroupCount: number
  errors: ExcelImportIssue[]
} {
  const errors: ExcelImportIssue[] = []
  const columnCount = worksheet.actualColumnCount
  const maximumColumns =
    excelFixedHeaders.length + MAX_EXCEL_METHOD_GROUPS * methodFields.length

  if (columnCount > maximumColumns) {
    errors.push({
      row: 1,
      field: 'template',
      message: `列数超过安全上限 ${maximumColumns}`,
    })
    return { methodGroupCount: 0, errors }
  }

  excelFixedHeaders.forEach((expectedHeader, index) => {
    const actualHeader = getHeaderText(worksheet.getCell(1, index + 1))
    if (actualHeader !== expectedHeader) {
      errors.push({
        row: 1,
        field: expectedHeader,
        message: `第 ${index + 1} 列必须是“${expectedHeader}”，当前为“${actualHeader || '空'}”`,
      })
    }
  })

  const dynamicColumnCount = Math.max(0, columnCount - excelFixedHeaders.length)
  const methodGroupCount = Math.ceil(dynamicColumnCount / methodFields.length)

  for (let index = 0; index < dynamicColumnCount; index += 1) {
    const groupNumber = Math.floor(index / methodFields.length) + 1
    const field = methodFields[index % methodFields.length]
    const expectedHeader = `method_${groupNumber}_${field}`
    const columnNumber = excelFixedHeaders.length + index + 1
    const actualHeader = getHeaderText(worksheet.getCell(1, columnNumber))

    if (actualHeader !== expectedHeader) {
      errors.push({
        row: 1,
        field: expectedHeader,
        message: `第 ${columnNumber} 列必须是“${expectedHeader}”，当前为“${actualHeader || '空'}”`,
      })
    }
  }

  if (dynamicColumnCount % methodFields.length !== 0) {
    errors.push({
      row: 1,
      field: `method_${methodGroupCount}`,
      message: `联系方式列组不完整，每组必须依次包含 ${methodFields.join('、')}`,
    })
  }

  return { methodGroupCount, errors }
}

function readScalarCell(
  cell: Cell,
  rowNumber: number,
  field: string,
  errors: ExcelImportIssue[],
): ScalarCellValue {
  const value = cell.value

  if (value === null || value === undefined) {
    return null
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  ) {
    return value
  }

  errors.push({
    row: rowNumber,
    field,
    message: '不支持公式、超链接或其他复杂单元格内容，请改为纯文本值',
  })
  return null
}

function parseText(
  value: ScalarCellValue,
  row: number,
  field: string,
  errors: ExcelImportIssue[],
  options: { required?: boolean; maxLength: number },
): string {
  if (value === null || value === '') {
    if (options.required) {
      errors.push({ row, field, message: '必填值不能为空' })
    }
    return ''
  }

  if (typeof value !== 'string') {
    errors.push({ row, field, message: '必须是文本' })
    return ''
  }

  const normalizedValue = value.trim()
  if (options.required && !normalizedValue) {
    errors.push({ row, field, message: '必填值不能为空' })
  }
  if (value.length > options.maxLength) {
    errors.push({
      row,
      field,
      message: `文本长度不能超过 ${options.maxLength} 个字符`,
    })
  }

  return field === 'note' ? value : normalizedValue
}

function parseFavorite(
  value: ScalarCellValue,
  row: number,
  errors: ExcelImportIssue[],
): boolean {
  if (value === null || value === '') {
    return false
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLocaleLowerCase()
    if (normalizedValue === 'true') return true
    if (normalizedValue === 'false') return false
  }

  errors.push({
    row,
    field: 'favorite',
    message: '必须是布尔值 true 或 false',
  })
  return false
}

function parseTimestamp(
  value: ScalarCellValue,
  row: number,
  field: 'createdAt' | 'updatedAt',
  fallback: string,
  errors: ExcelImportIssue[],
): string {
  if (value === null || value === '') {
    return fallback
  }

  const candidate = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  if (!candidate || Number.isNaN(candidate.getTime())) {
    errors.push({ row, field, message: '必须是有效的 ISO 8601 时间' })
    return fallback
  }

  return candidate.toISOString()
}

function isRowEmpty(row: Row, columnCount: number): boolean {
  for (let column = 1; column <= columnCount; column += 1) {
    const value = row.getCell(column).value
    if (value !== null && value !== undefined && value !== '') {
      return false
    }
  }
  return true
}

function createUniqueId(
  createId: () => string,
  reservedIds: Set<string>,
): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = createId().trim()
    if (id && !reservedIds.has(id)) {
      reservedIds.add(id)
      return id
    }
  }

  throw new Error('无法生成唯一联系人标识，请重试')
}

function parseMethodType(
  value: ScalarCellValue,
  row: number,
  field: string,
  errors: ExcelImportIssue[],
): ContactMethodType | null {
  if (typeof value !== 'string') {
    errors.push({ row, field, message: '联系方式类型必须是文本' })
    return null
  }

  const normalizedValue = value.trim() as ContactMethodType
  if (!allowedMethodTypes.includes(normalizedValue)) {
    errors.push({
      row,
      field,
      message: `未知类型“${value}”，只允许 ${allowedMethodTypes.join('、')}`,
    })
    return null
  }

  return normalizedValue
}

function parseDataRow(
  row: Row,
  methodGroupCount: number,
  reservedIds: Set<string>,
  createId: () => string,
  timestamp: string,
): { contact: Contact | null; errors: ExcelImportIssue[] } {
  const rowNumber = row.number
  const errors: ExcelImportIssue[] = []
  const read = (column: number, field: string) =>
    readScalarCell(row.getCell(column), rowNumber, field, errors)

  const rawId = read(1, 'id')
  const name = parseText(read(2, 'name'), rowNumber, 'name', errors, {
    required: true,
    maxLength: 200,
  })
  const company = parseText(read(3, 'company'), rowNumber, 'company', errors, {
    maxLength: 500,
  })
  const note = parseText(read(4, 'note'), rowNumber, 'note', errors, {
    maxLength: 10000,
  })
  const favorite = parseFavorite(read(5, 'favorite'), rowNumber, errors)
  const createdAt = parseTimestamp(
    read(6, 'createdAt'),
    rowNumber,
    'createdAt',
    timestamp,
    errors,
  )
  const updatedAt = parseTimestamp(
    read(7, 'updatedAt'),
    rowNumber,
    'updatedAt',
    timestamp,
    errors,
  )

  let id = ''
  if (rawId === null || (typeof rawId === 'string' && !rawId.trim())) {
    id = createUniqueId(createId, reservedIds)
  } else if (typeof rawId !== 'string' || !rawId.trim()) {
    errors.push({ row: rowNumber, field: 'id', message: 'id 必须是非空文本或留空' })
  } else {
    id = rawId.trim()
    reservedIds.add(id)
  }

  const methods: Contact['methods'] = []
  const methodIds = new Set<string>()

  for (let group = 1; group <= methodGroupCount; group += 1) {
    const startColumn = excelFixedHeaders.length + (group - 1) * methodFields.length + 1
    const values = methodFields.map((field, index) =>
      read(startColumn + index, `method_${group}_${field}`),
    )
    const isEmptyGroup = values.every(
      (value) => value === null || (typeof value === 'string' && !value.trim()),
    )
    if (isEmptyGroup) {
      continue
    }

    const [rawMethodId, rawType, rawLabel, rawValue] = values
    let methodId = ''
    if (
      rawMethodId === null ||
      (typeof rawMethodId === 'string' && !rawMethodId.trim())
    ) {
      methodId = createUniqueId(createId, reservedIds)
    } else if (typeof rawMethodId !== 'string' || !rawMethodId.trim()) {
      errors.push({
        row: rowNumber,
        field: `method_${group}_id`,
        message: '必须是非空文本或留空',
      })
    } else {
      methodId = rawMethodId.trim()
      reservedIds.add(methodId)
    }

    const methodType = parseMethodType(
      rawType,
      rowNumber,
      `method_${group}_type`,
      errors,
    )
    const label = parseText(
      rawLabel,
      rowNumber,
      `method_${group}_label`,
      errors,
      { required: true, maxLength: 200 },
    )
    const methodValue = parseText(
      rawValue,
      rowNumber,
      `method_${group}_value`,
      errors,
      { required: true, maxLength: 2000 },
    )

    if (methodId && methodIds.has(methodId)) {
      errors.push({
        row: rowNumber,
        field: `method_${group}_id`,
        message: `同一联系人内的联系方式 id“${methodId}”重复`,
      })
    }
    if (methodId) {
      methodIds.add(methodId)
    }

    if (methodId && methodType && label && methodValue) {
      methods.push({ id: methodId, type: methodType, label, value: methodValue })
    }
  }

  if (errors.length > 0 || !id) {
    return { contact: null, errors }
  }

  return {
    contact: {
      id,
      name,
      company,
      note,
      favorite,
      methods,
      createdAt,
      updatedAt,
    },
    errors,
  }
}

export async function parseContactsWorkbook(
  buffer: ArrayBuffer,
  existingContacts: readonly Contact[],
  options: ParseOptions = {},
): Promise<ExcelImportPreview> {
  if (buffer.byteLength === 0) {
    throw new Error('Excel 文件为空')
  }
  if (buffer.byteLength > MAX_EXCEL_FILE_BYTES) {
    throw new Error(`Excel 文件不能超过 ${MAX_EXCEL_FILE_BYTES / 1024 / 1024} MB`)
  }

  const workbook = await createWorkbookInstance()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    throw new Error('无法读取 Excel 文件，请确认文件是有效的 .xlsx 工作簿')
  }

  const worksheet = workbook.getWorksheet('Contacts') ?? workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('Excel 工作簿中没有可读取的工作表')
  }

  const { methodGroupCount, errors: headerErrors } = validateHeaders(worksheet)
  if (headerErrors.length > 0) {
    return {
      records: [],
      errors: headerErrors,
      conflicts: [],
      duplicateIds: [],
      totalDataRows: Math.max(0, worksheet.actualRowCount - 1),
    }
  }

  if (worksheet.actualRowCount - 1 > MAX_EXCEL_CONTACTS) {
    return {
      records: [],
      errors: [
        {
          row: 1,
          field: 'workbook',
          message: `联系人行数超过安全上限 ${MAX_EXCEL_CONTACTS}`,
        },
      ],
      conflicts: [],
      duplicateIds: [],
      totalDataRows: worksheet.actualRowCount - 1,
    }
  }

  const createId = options.createId ?? createRandomId
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const reservedIds = new Set(existingContacts.map((contact) => contact.id))
  const parsedRecords: ExcelImportRecord[] = []
  const errors: ExcelImportIssue[] = []
  const columnCount = excelFixedHeaders.length + methodGroupCount * methodFields.length
  let totalDataRows = 0

  for (let rowNumber = 2; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    if (isRowEmpty(row, columnCount)) {
      continue
    }

    totalDataRows += 1
    const result = parseDataRow(
      row,
      methodGroupCount,
      reservedIds,
      createId,
      timestamp,
    )
    errors.push(...result.errors)
    if (result.contact) {
      parsedRecords.push({ row: rowNumber, contact: result.contact })
    }
    if (errors.length >= MAX_IMPORT_ISSUES) {
      errors.splice(MAX_IMPORT_ISSUES)
      errors.push({
        row: rowNumber,
        field: 'workbook',
        message: `错误数量达到 ${MAX_IMPORT_ISSUES} 条，已停止解析；请先修正已列出的错误`,
      })
      break
    }
  }

  const rowsById = new Map<string, number[]>()
  parsedRecords.forEach(({ row, contact }) => {
    const rows = rowsById.get(contact.id) ?? []
    rows.push(row)
    rowsById.set(contact.id, rows)
  })
  const duplicateIds = [...rowsById.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([id, rows]) => ({ id, rows }))
  const duplicateIdSet = new Set(duplicateIds.map(({ id }) => id))

  duplicateIds.forEach(({ id, rows }) => {
    rows.forEach((row) => {
      errors.push({ row, field: 'id', message: `文件内 id“${id}”重复` })
    })
  })

  const records = parsedRecords.filter(
    ({ contact }) => !duplicateIdSet.has(contact.id),
  )
  const existingIds = new Set(existingContacts.map((contact) => contact.id))
  const conflicts = records
    .filter(({ contact }) => existingIds.has(contact.id))
    .map(({ row, contact }) => ({ id: contact.id, name: contact.name, row }))

  return { records, errors, conflicts, duplicateIds, totalDataRows }
}

export function applyContactImport(
  existingContacts: readonly Contact[],
  records: readonly ExcelImportRecord[],
  strategy: ImportConflictStrategy,
): ApplyImportResult {
  const existingIds = new Set(existingContacts.map((contact) => contact.id))
  const importedById = new Map(records.map(({ contact }) => [contact.id, contact]))
  const conflictingRecords = records.filter(({ contact }) => existingIds.has(contact.id))
  const newContacts = records
    .filter(({ contact }) => !existingIds.has(contact.id))
    .map(({ contact }) => ({
      ...contact,
      methods: contact.methods.map((method) => ({ ...method })),
    }))

  if (strategy === 'skip') {
    return {
      contacts: [...existingContacts, ...newContacts],
      addedCount: newContacts.length,
      replacedCount: 0,
      skippedCount: conflictingRecords.length,
    }
  }

  const replacedContacts = existingContacts.map((contact) => {
    const importedContact = importedById.get(contact.id)
    return importedContact
      ? {
          ...importedContact,
          methods: importedContact.methods.map((method) => ({ ...method })),
        }
      : contact
  })

  return {
    contacts: [...replacedContacts, ...newContacts],
    addedCount: newContacts.length,
    replacedCount: conflictingRecords.length,
    skippedCount: 0,
  }
}
