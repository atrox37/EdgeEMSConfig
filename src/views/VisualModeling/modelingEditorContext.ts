import type { InjectionKey, Ref } from 'vue'
import type { ContainerDropStatus } from '@/utils/containerDropTarget'

export type ModelingEditorContext = {
  isViewMode: Ref<boolean>
  /** 画布内容变更（如容器缩放结束）时通知编辑器标记未保存 */
  notifyFlowChanged?: () => void
  /** 返回除指定节点外，画布上已绑定的实例 id */
  getBoundInstanceIdsExcluding?: (nodeId: string) => Set<number>
  /** 拖放时高亮的容器节点 id */
  dropTargetContainerId?: Ref<string | null>
  /** 拖放目标容器：合法 / 非法 */
  dropTargetStatus?: Ref<ContainerDropStatus | null>
}

export const MODELING_EDITOR_KEY: InjectionKey<ModelingEditorContext> = Symbol('modelingEditor')
