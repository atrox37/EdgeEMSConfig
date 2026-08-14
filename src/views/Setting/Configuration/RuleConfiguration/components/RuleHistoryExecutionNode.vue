<template>
  <div class="rule-history-execution-node">
    <div class="rule-history-execution-node__content">
      <div
        class="rule-history-execution-node__card"
        :class="[`is-${status}`, `kind-${stepKind}`]"
      >
        <div class="rule-history-execution-node__title">
          <span v-if="status !== 'default'" class="rule-history-execution-node__status">
            <span class="rule-history-execution-node__status-dot">•</span>
            {{ status === 'error' ? 'Error' : 'Interrupt' }}
          </span>
          <span>{{ formatExecutionStep(node.step) }}</span>
        </div>
        <div v-if="description" class="rule-history-execution-node__description">
          {{ description }}
        </div>
      </div>

      <div v-if="node.children.length" class="rule-history-execution-node__children">
        <div
          v-for="child in node.children"
          :key="child.step.node_id"
          class="rule-history-execution-node__branch"
        >
          <span v-if="getBranchLabel(child)" class="rule-history-execution-node__branch-label">
            {{ getBranchLabel(child) }}
          </span>
          <RuleHistoryExecutionNode :node="child" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionTreeNode } from '@/types/controlRule'
import {
  formatExecutionStep,
  formatExecutionStepDescription,
  getExecutionStepStatus,
} from '@/utils/ruleHistoryDisplay'

const props = defineProps<{
  node: ExecutionTreeNode
}>()

const node = computed(() => props.node)
const status = computed(() => getExecutionStepStatus(node.value.step))
const description = computed(() => formatExecutionStepDescription(node.value.step))
const stepKind = computed(() => {
  const raw = node.value.step.node_kind || node.value.step.type || node.value.step.label
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-')
})

const getBranchLabel = (child: ExecutionTreeNode): string => {
  const value = child.step.matched_port || child.step.matched_label || ''
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}
</script>

<style scoped lang="scss">
.rule-history-execution-node {
  flex: 0 0 auto;

  &__content {
    display: flex;
    align-items: center;
    min-width: max-content;
  }

  &__card {
    width: max-content;
    min-width: 64px;
    min-height: 36px;
    padding: 4px 10px;
    border: 1px solid #b0c6ee;
    border-radius: 4px;
    background: #eceefa;
    color: var(--vt-text-primary);
    box-sizing: border-box;

    &.kind-start,
    &.kind-end {
      width: 64px;
      text-align: center;
    }

    &.kind-switch,
    &.kind-function-switch {
      min-width: 300px;
    }

    &.kind-change {
      min-width: 203px;
    }

    &.is-error {
      min-width: 423px;
      border-color: transparent;
      background: rgba(245, 63, 63, 0.1);
    }

    &.is-interrupt {
      min-width: 423px;
      border-color: transparent;
      background: rgba(255, 107, 10, 0.1);
    }
  }

  &__title {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 14px;
    line-height: 22px;
    font-weight: var(--vt-font-weight-medium);
    white-space: normal;
  }

  &__status {
    font-weight: var(--vt-font-weight-bold);

    .is-error & {
      color: var(--vt-color-danger);
    }

    .is-interrupt & {
      color: var(--vt-color-warning);
    }
  }

  &__status-dot {
    font-size: 20px;
    line-height: 0;
  }

  &__description {
    margin-top: 0;
    color: #666;
    font-size: 12px;
    line-height: 20px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__children {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-left: 34px;
    padding-left: 34px;
    border-left: 2px solid #b0c6ee;
  }

  &__branch {
    position: relative;
    display: flex;
    align-items: center;

    &::before {
      content: '';
      position: absolute;
      left: -35px;
      width: 34px;
      border-top: 2px solid #b0c6ee;
    }

    &::after {
      content: '';
      position: absolute;
      left: -3px;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 5px solid #b0c6ee;
    }
  }

  &__branch-label {
    position: absolute;
    left: -32px;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 0 4px;
    background: #f5f6fa;
    color: var(--vt-text-secondary);
    font-size: 13px;
    white-space: nowrap;
  }
}
</style>
