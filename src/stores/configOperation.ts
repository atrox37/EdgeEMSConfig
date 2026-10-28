import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useVisualModelingStore } from '@/stores/visualModeling'
import {
  CONFIG_OPERATION_TITLES, ConfigOperationError, configOperationSuccess, parseConfigOperationFailure,
  type ConfigOperationKind, type ConfigOperationResult,
} from '@/utils/configOperation'
import type { ApiResponse } from '@/utils/request'

export const useConfigOperationStore = defineStore('configOperation', () => {
  const busy = ref(false)
  const visible = ref(false)
  const title = ref('Configuration operation')
  const startedAt = ref(0)
  const result = ref<ConfigOperationResult | null>(null)
  const configurationRevision = ref(0)
  const generation = ref(0)

  function dismiss() {
    if (!busy.value) visible.value = false
  }

  async function run<T>(kind: ConfigOperationKind, request: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    if (busy.value) {
      const error = { response: { status: 409, data: { error: { code: 'CONFIG_OPERATION_IN_PROGRESS' } } } }
      throw new ConfigOperationError(parseConfigOperationFailure(error, kind), error)
    }
    busy.value = true
    generation.value += 1
    visible.value = true
    title.value = CONFIG_OPERATION_TITLES[kind]
    startedAt.value = Date.now()
    result.value = null
    try {
      const response = await request()
      // The HTTP layer checks the actual status before returning this body.
      if (response?.success !== true) throw { response: { status: 200, data: response } }
      result.value = configOperationSuccess(kind)
      visible.value = false
      ElMessage.success(result.value.title)
      return response
    } catch (error) {
      result.value = parseConfigOperationFailure(error, kind)
      throw new ConfigOperationError(result.value, error)
    } finally {
      busy.value = false
      // Invalidate without fetching: failures may have left services unavailable.
      if (result.value?.status !== 'rejected') useVisualModelingStore().invalidateConfiguration()
      if (result.value?.status === 'success' || result.value?.status === 'recovered') {
        configurationRevision.value += 1
      }
    }
  }

  return { busy, visible, title, startedAt, result, configurationRevision, generation, dismiss, run }
})
