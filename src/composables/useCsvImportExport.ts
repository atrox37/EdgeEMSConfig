import { ref } from 'vue'

interface CsvImportOptions {
  onParse: (content: string, file: File) => void
  onError?: (message: string, error?: unknown) => void
}

export function useCsvImportExport(options: CsvImportOptions) {
  const fileInputRef = ref<HTMLInputElement>()

  const handleImportClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setTimeout(() => {
      if (fileInputRef.value) {
        fileInputRef.value.click()
      }
    }, 0)
  }

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = String(e.target?.result || '')
        options.onParse(content, file)
      } catch (error) {
        options.onError?.('Failed to parse CSV file', error)
      } finally {
        target.value = ''
      }
    }

    reader.onerror = () => {
      options.onError?.('Failed to read CSV file')
      target.value = ''
    }

    reader.readAsText(file)
  }

  return {
    fileInputRef,
    handleImportClick,
    handleFileChange,
  }
}
