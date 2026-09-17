import type { InjectionKey, Ref } from 'vue'

export interface RuleChainEditorContext {
  isMonitorMode: Ref<boolean>
  editNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
}

export const RULE_CHAIN_EDITOR_KEY: InjectionKey<RuleChainEditorContext> = Symbol('ruleChainEditor')
