import { computed, inject, reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { MODELING_EDITOR_KEY } from '../modelingEditorContext'
import { normalizeNodeInstances } from '@/utils/visualModeling'
import type { ModelNodeData } from '@/types/visualModeling'

export interface TopologyNodeDraft {
  label: string
  description: string
  instanceId: number | null
}

export function useTopologyNodeEditor(
  props: { id: string; data: ModelNodeData },
  options: { allowBinding: MaybeRefOrGetter<boolean> } = { allowBinding: true },
) {
  const editorCtx = inject(MODELING_EDITOR_KEY, null)
  const expanded = ref(Boolean(props.data.uiExpanded))
  const editing = ref(false)
  const allowBinding = computed(() => toValue(options.allowBinding))

  const boundInstances = computed(() => normalizeNodeInstances(props.data))
  const boundInstance = computed(() => boundInstances.value[0] ?? null)
  const boundLabel = computed(() => boundInstance.value?.instanceName || 'Not Bound')
  const draft = reactive<TopologyNodeDraft>({
    label: props.data.label || '',
    description: props.data.description || '',
    instanceId: (boundInstance.value?.instanceId ?? null) as number | null,
  })

  const availableInstances = computed(() => {
    if (!allowBinding.value) return []
    const productName = props.data.productName ?? ''
    const all = editorCtx?.instances?.value ?? []
    const matches = all.filter((item) => item.product_name === productName)
    return matches.length ? matches : boundInstance.value ? [{
      instance_id: boundInstance.value.instanceId,
      instance_name: boundInstance.value.instanceName,
      product_name: boundInstance.value.productName ?? productName,
    }] : []
  })

  function resetDraft() {
    draft.label = props.data.label || ''
    draft.description = props.data.description || ''
    draft.instanceId = boundInstance.value?.instanceId ?? null
  }

  watch(() => props.data, () => {
    if (editing.value) return
    resetDraft()
  }, { deep: true })

  function startEditing() {
    editing.value = true
  }

  function cancelEditing() {
    resetDraft()
    editing.value = false
  }

  function saveEditing() {
    const nextInstance = allowBinding.value
      ? availableInstances.value.find((item) => item.instance_id === draft.instanceId)
      : undefined
    const nextData: Partial<ModelNodeData> = {
      label: draft.label.trim() || props.data.label,
      description: draft.description.trim(),
    }

    if (allowBinding.value) {
      Object.assign(nextData, {
        instances: nextInstance ? [{
          instanceId: nextInstance.instance_id,
          instanceName: nextInstance.instance_name,
          productName: nextInstance.product_name,
        }] : [],
        instanceId: nextInstance?.instance_id,
        instanceName: nextInstance?.instance_name,
      })
    }

    editorCtx?.updateNodeData?.(props.id, nextData)
    editing.value = false
  }

  return {
    editorCtx,
    expanded,
    editing,
    draft,
    boundInstances,
    boundInstance,
    boundLabel,
    availableInstances,
    startEditing,
    cancelEditing,
    saveEditing,
  }
}
