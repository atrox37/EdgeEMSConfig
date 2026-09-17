import { ref, watch, type Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'

interface UsePointPublishOptions {
  editPoints: Ref<PointInfo[]>
  publishMode: () => boolean
  onPublishChange: (dirty: boolean) => void
}

export function usePointPublish(options: UsePointPublishOptions) {
  const publishValues = ref<Record<string, number | null>>({})

  function getPublishCommands(): Array<{ id: string; value: number }> {
    const commands: Array<{ id: string; value: number }> = []
    Object.entries(publishValues.value).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        const num = Number(val)
        if (Number.isFinite(num)) commands.push({ id: key, value: num })
      }
    })
    return commands
  }

  function hasPublishChanges(): boolean {
    return getPublishCommands().length > 0
  }

  function notifyPublishChange() {
    options.onPublishChange(hasPublishChanges())
  }

  function resetPublish() {
    publishValues.value = {}
    notifyPublishChange()
  }

  function clearCurrentTabPublish() {
    if (Array.isArray(options.editPoints.value)) {
      options.editPoints.value.forEach((point) => {
        publishValues.value[point.point_id] = null
      })
    }
    notifyPublishChange()
  }

  watch(
    () => options.publishMode(),
    (val, oldVal) => {
      if (oldVal && !val) {
        clearCurrentTabPublish()
      }
    },
  )

  return {
    publishValues,
    getPublishCommands,
    hasPublishChanges,
    notifyPublishChange,
    resetPublish,
    clearCurrentTabPublish,
  }
}
