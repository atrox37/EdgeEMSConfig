import type { Ref } from 'vue'

interface UseFieldErrorsOptions<T> {
  listRef: Ref<T[]>
  validateField: (item: T, field: string) => string
  getFieldsForRow: (item: T) => string[]
  clearFields?: (item: T) => string[]
}

export function useFieldErrors<T>(options: UseFieldErrorsOptions<T>) {
  const getFieldError = (item: any, field: string): string => {
    return (item?.fieldErrors && item.fieldErrors[field]) || ''
  }

  const setFieldError = (item: any, field: string, message: string) => {
    if (!item.fieldErrors) item.fieldErrors = {}
    if (message) item.fieldErrors[field] = message
    else delete item.fieldErrors[field]
  }

  const validateAndSetField = (item: T, field: string) => {
    const msg = options.validateField(item, field)
    setFieldError(item as any, field, msg)
    return msg
  }

  const refreshFieldErrorsForRow = (item: T) => {
    const fields = options.getFieldsForRow(item) || []
    fields.forEach((field) => {
      validateAndSetField(item, field)
    })
    const clear = options.clearFields ? options.clearFields(item) : []
    clear.forEach((field) => {
      setFieldError(item as any, field, '')
    })
  }

  const refreshFieldErrorsForList = () => {
    if (!Array.isArray(options.listRef.value)) return
    options.listRef.value.forEach((row) => refreshFieldErrorsForRow(row))
  }

  return {
    getFieldError,
    setFieldError,
    validateAndSetField,
    refreshFieldErrorsForRow,
    refreshFieldErrorsForList,
  }
}
