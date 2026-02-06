export type CsvParser<T = any> = (value: string) => T
export type CsvSerializer = (value: any) => string

export interface CsvFieldDef<T = any> {
  key: keyof T | string
  header: string
  required?: boolean
  parser?: CsvParser
  serializer?: CsvSerializer
}

export interface ParseCsvResult<T> {
  rows: T[]
  error?: string
}

const normalizeHeader = (value: string) => String(value || '').trim().toLowerCase()

export function parseCsvRows<T extends Record<string, any>>(
  schema: CsvFieldDef<T>[],
  csv: string,
): ParseCsvResult<T> {
  const lines = String(csv || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { rows: [], error: 'CSV file is empty' }
  }

  const headerColumns = lines[0].split(',').map((col) => normalizeHeader(col))
  const columnIndex: Record<string, number> = {}
  headerColumns.forEach((col, idx) => {
    if (col) columnIndex[col] = idx
  })

  for (const field of schema) {
    if (field.required === false) continue
    const key = normalizeHeader(field.header)
    if (columnIndex[key] === undefined) {
      return { rows: [], error: `Required column "${field.header}" not found in CSV header` }
    }
  }

  const rows: T[] = []
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw) continue
    const values = raw.split(',').map((v) => v.trim())
    const row: Record<string, any> = {}
    for (const field of schema) {
      const idx = columnIndex[normalizeHeader(field.header)]
      if (idx === undefined) {
        row[field.key as string] = undefined
        continue
      }
      const rawValue = values[idx] ?? ''
      row[field.key as string] = field.parser ? field.parser(rawValue) : rawValue
    }
    rows.push(row as T)
  }

  return { rows }
}

export function buildCsv<T extends Record<string, any>>(
  schema: CsvFieldDef<T>[],
  rows: T[],
): string {
  const header = schema.map((f) => f.header).join(',')
  const lines = rows.map((row) =>
    schema
      .map((f) => {
        const value = (row as any)[f.key as string]
        const out = f.serializer ? f.serializer(value) : value
        return out === undefined || out === null ? '' : String(out)
      })
      .join(','),
  )
  return [header, ...lines].join('\n')
}
