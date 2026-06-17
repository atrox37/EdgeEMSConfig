import type { InjectionKey, Ref } from 'vue'

export type ModelingEditorContext = {
  isViewMode: Ref<boolean>
  /** 画布内容变更（如容器缩放结束）时通知编辑器标记未保存 */
  notifyFlowChanged?: () => void
}

export const MODELING_EDITOR_KEY: InjectionKey<ModelingEditorContext> = Symbol('modelingEditor')
