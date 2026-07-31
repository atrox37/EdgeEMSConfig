import type { InjectionKey, Ref } from 'vue'
import type { ModelNodeData } from '@/types/visualModeling'
import type { DeviceInstanceBasic } from '@/types/deviceConfiguration'

export type ModelingEditorContext = {
  isViewMode: Ref<boolean>
  /** 画布内容变更（如容器缩放结束）时通知编辑器标记未保存 */
  notifyFlowChanged?: () => void
  /** 返回除指定节点外，画布上已绑定的实例 id */
  getBoundInstanceIdsExcluding?: (nodeId: string) => Set<number>
  instances?: Ref<DeviceInstanceBasic[]>
  expandedNodeIds?: Ref<Set<string>>
  setNodeExpanded?: (nodeId: string, expanded: boolean) => void
  updateNodeData?: (nodeId: string, data: Partial<ModelNodeData>) => void
  deleteNode?: (nodeId: string) => void
}

export const MODELING_EDITOR_KEY: InjectionKey<ModelingEditorContext> = Symbol('modelingEditor')
