/** Cast el-table slot row (DefaultRow) to a concrete row type. */
export function asTableRow<T>(row: unknown): T {
  return row as T
}
