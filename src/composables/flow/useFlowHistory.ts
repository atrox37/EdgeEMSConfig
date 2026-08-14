import { computed, ref, type Ref } from 'vue'
import type { Edge, Node } from '@vue-flow/core'

export type FlowSnapshot = {
  nodes: Node[]
  edges: Edge[]
}

type UseFlowHistoryOptions = {
  enabled?: Ref<boolean> | (() => boolean)
  maxHistory?: number
  capture: () => FlowSnapshot
  restore: (snapshot: FlowSnapshot) => Promise<void> | void
}

function cloneSnapshot(snapshot: FlowSnapshot): FlowSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as FlowSnapshot
}

function isEnabled(enabled?: UseFlowHistoryOptions['enabled']) {
  if (!enabled) return true
  return typeof enabled === 'function' ? enabled() : enabled.value
}

export function useFlowHistory(options: UseFlowHistoryOptions) {
  const snapshots = ref<FlowSnapshot[]>([])
  const snapIdx = ref(-1)
  const isRestoring = ref(false)
  const maxHistory = options.maxHistory ?? 50

  const canUndo = computed(() => snapIdx.value > 0)
  const canRedo = computed(() => snapIdx.value < snapshots.value.length - 1)

  function saveSnapshot() {
    if (isRestoring.value || !isEnabled(options.enabled)) return

    const next = snapshots.value.slice(0, snapIdx.value + 1)
    next.push(cloneSnapshot(options.capture()))
    while (next.length > maxHistory) {
      next.shift()
    }
    snapshots.value = next
    snapIdx.value = next.length - 1
  }

  async function restoreAt(index: number) {
    const snapshot = snapshots.value[index]
    if (!snapshot) return
    isRestoring.value = true
    try {
      await options.restore(cloneSnapshot(snapshot))
    } finally {
      isRestoring.value = false
    }
  }

  async function undo() {
    if (!canUndo.value) return
    snapIdx.value -= 1
    await restoreAt(snapIdx.value)
  }

  async function redo() {
    if (!canRedo.value) return
    snapIdx.value += 1
    await restoreAt(snapIdx.value)
  }

  function clear() {
    snapshots.value = []
    snapIdx.value = -1
  }

  return {
    snapshots,
    snapIdx,
    isRestoring,
    canUndo,
    canRedo,
    saveSnapshot,
    undo,
    redo,
    clear,
  }
}
