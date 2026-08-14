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
  options: {
    allowBinding: MaybeRefOrGetter<boolean>
    instanceProductNames?: MaybeRefOrGetter<string[]>
  } = { allowBinding: true },
) {
  const editorCtx = inject(MODELING_EDITOR_KEY, null)
  // Input details are intentionally collapsed for every node on first render.
  // The expanded state is a transient UI state and should not be restored from
  // persisted topology data.
  const expanded = ref(false)
  const editing = ref(false)
  const allowBinding = computed(() => toValue(options.allowBinding))
  const instanceProductNames = computed(() => toValue(options.instanceProductNames))

  const boundInstances = computed(() => normalizeNodeInstances(props.data))
  const boundInstance = computed(() => boundInstances.value[0] ?? null)
  const boundLabel = computed(() => boundInstance.value?.instanceName || 'Not Bound')
  const boundValue = computed(() => boundInstance.value?.instanceName || '')
  const draft = reactive<TopologyNodeDraft>({
    label: props.data.label || '',
    description: props.data.description || '',
    instanceId: (boundInstance.value?.instanceId ?? null) as number | null,
  })

  const availableInstances = computed(() => {
    if (!allowBinding.value) return []
    const productName = props.data.productName ?? ''
    const all = editorCtx?.instances?.value ?? []
    const allowedProductNames = instanceProductNames.value?.length
      ? instanceProductNames.value
      : [productName]
    const occupiedIds = editorCtx?.getBoundInstanceIdsExcluding?.(props.id) ?? new Set<number>()
    const matches = all.filter((item) =>
      allowedProductNames.includes(item.product_name) && !occupiedIds.has(item.instance_id),
    )
    if (boundInstance.value && !matches.some((item) => item.instance_id === boundInstance.value?.instanceId)) {
      matches.push({
        instance_id: boundInstance.value.instanceId,
        instance_name: boundInstance.value.instanceName,
        product_name: boundInstance.value.productName ?? productName,
      })
    }
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

  // Switching between view and edit mode starts with a compact topology view.
  // This also resets product/component cards whose state is local to the node.
  watch(() => editorCtx?.isViewMode.value, () => {
    expanded.value = false
  })

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
    boundValue,
    availableInstances,
    startEditing,
    cancelEditing,
    saveEditing,
  }
}
